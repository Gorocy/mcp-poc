import rl from 'node:readline/promises';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Tool } from 'ollama';
import { Ollama } from 'ollama';

class OllamaChatHandler {
  private chatHistory: { role: 'user' | 'assistant'; content: string }[] = [];
  private aiGreetingText = 'How can I help you today?';
  private ollamaBaseUrl: string;
  private ollamaModel: string;
  private client: Client;
  private tools: { resources: Tool[]; tools: Tool[] };
  private ui: rl.Interface;
  private ollama: Ollama;
  
  constructor(
    ollamaBaseUrl: string,
    ollamaModel: string,
    client: Client,
    tools: { resources: Tool[]; tools: Tool[] },
    ui: rl.Interface
  ) {
    this.ollamaBaseUrl = ollamaBaseUrl;
    this.ollamaModel = ollamaModel;
    this.client = client;
    this.tools = tools;
    this.ui = ui;
    this.ollama = new Ollama({
      host: ollamaBaseUrl,
    });
  }

  async processResponse(response: any) {
    if (response.message.tool_calls) {
      await this.handleToolCall(response);
    } else if (response.message.content) {
      this.chatHistory.push({
        role: 'assistant',
        content: response.content
      });
      this.ui.write(response.content + '\n');
    }
  }

  private async handleToolCall(response: {
    name: string;
    arguments: string;
  }) {
    const toolName = response.name;
    const toolResponse = await this.callToolOrResource(
      toolName,
      response.arguments
    );
    this.chatHistory.push({
      role: 'user',
      content: toolResponse,
    });
  }

  private async callToolOrResource(toolName: string, args: string) {
    if (this.isTool(toolName)) {
      const { content } = await this.client.callTool({
        name: toolName,
        arguments: JSON.parse(args),
      });
      return Array.isArray(content) && content.length > 0
        ? 'Result received from function call: ' + content[0].text
        : 'No response from the tool.';
    } else if (this.isResource(toolName)) {
      const { contents } = await this.client.readResource({
        uri: 'knowledge://' + toolName,
      });
      return 'Result received from reading resource: ' + contents[0]!.text;
    }

    return 'Tool not found.';
  }

  private isTool(name: string) {
    return this.tools.tools.some((tool) => tool.function.name === name);
  }

  private isResource(name: string) {
    return this.tools.resources.some((tool) => tool.function.name === name);
  }

  async handleChat() {
    // Generate greeting if this is the first message
    if (this.chatHistory.length === 0) {
      try {
        const response = await this.ollama.chat({
          model: this.ollamaModel,
          messages: [{
            role: 'user',
            content: "Generate a friendly greeting for a user starting a chat."
          }],
        });
        this.aiGreetingText = response.message.content;
      } catch (error) {
        console.error('Error generating greeting:', error);
      }
    }

    const prompt = await this.ui.question(this.aiGreetingText + '\n');
    this.chatHistory.push({ role: 'user', content: prompt });

    const response = await this.ollama.chat({
      model: this.ollamaModel,
      messages: this.chatHistory,
      tools: [...this.tools.tools, ...this.tools.resources],
    });

    // Prepare the messages for Ollama
    const messages = this.chatHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    await this.processResponse(response);
  }
}

function setupOllama() {
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.1:8b';
  
  return { ollamaBaseUrl, ollamaModel };
}

async function setupMcpTools(client: Client) {
  const mcpResources = await client.listResources();
  const resourceTools: Tool[] = mcpResources.resources.map((res) => ({
    type: 'function',
    function: {
      name: res.name,
      description: res.description || '',
      parameters: {
        type: 'object',
        properties: { topic: { type: 'string', description: 'The topic of the resource' } },
        required: ['topic'],
      },
    },
  }));

  const mcpTools = await client.listTools();
  const toolTools: Tool[] = mcpTools.tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description || '',
      parameters: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'The topic of the tool' },
        content: { type: 'string', description: 'The content of the tool' },
      },
      required: ['topic', 'content'],
      },
    },
  }));

  return { resources: resourceTools, tools: toolTools };
}

async function main() {
  try {
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['--loader', 'ts-node/esm', '../server/server.ts'],
    });

    const client = new Client(
      { name: 'ollama-mcp-client', version: '1.0.0' },
      { capabilities: { prompts: {}, resources: {}, tools: {} } }
    );

    await client.connect(transport);

    const { ollamaBaseUrl, ollamaModel } = setupOllama();
    const tools = await setupMcpTools(client);
    const ui = rl.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log(`Connected to Ollama at ${ollamaBaseUrl} using model ${ollamaModel}`);
    console.log('MCP tools and resources loaded successfully');

    const chatHandler = new OllamaChatHandler(
      ollamaBaseUrl,
      ollamaModel,
      client,
      tools,
      ui
    );

    while (true) {
      await chatHandler.handleChat();
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();