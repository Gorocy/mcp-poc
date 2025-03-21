import rl from 'node:readline/promises';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Tool } from 'ollama';
import dotenv from 'dotenv';
import OllamaChatHandler from './ollamaChatHandler.js';

dotenv.config();  

function setupOllama() {
  const ollamaBaseUrl = process.env.OLLAMA_API_URL;
  const ollamaModel = process.env.OLLAMA_MODEL;

  if (!ollamaBaseUrl || !ollamaModel) {
    throw new Error('OLLAMA_API_URL and OLLAMA_MODEL must be set');
  }
  
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