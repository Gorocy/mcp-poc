import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Tool } from 'ollama';
import dotenv from 'dotenv';
import OllamaChatHandler from './ollamaChatHandler.js';
import ColoredReadlineInterface from './coloredReadlineInterface.js';

dotenv.config();  

function setupOllama() {
  const ollamaBaseUrl = process.env.OLLAMA_API_URL;
  const ollamaModel = process.env.OLLAMA_MODEL;

  if (!ollamaBaseUrl || !ollamaModel) {
    throw new Error('OLLAMA_API_URL and OLLAMA_MODEL must be set');
  }
  
  return { ollamaBaseUrl, ollamaModel };
}

async function setupMcpTools(client: Client, ui: ColoredReadlineInterface) {
  const mcpResources = await client.listResources();
  
  ui.writeSystem(`Resources: ${JSON.stringify(mcpResources, null, 2)}`);

  const resourceTools: Tool[] = mcpResources.resources.map((res) => ({
    type: 'function',
    function: {
      name: res.name,
      description: res.description || '',
      parameters: {
        type: 'object',
        properties: { topic: { type: 'string', description: 'The topic of the resource' } },
        // TODO: Add map of required fields to the resource
        required: ['topic'],
      },
    },
  }));

  const mcpTools = await client.listTools();

  ui.writeSystem(`Tools: ${JSON.stringify(mcpTools, null, 2)}`);

  // const toolTools: Tool[] = mcpTools.tools.map((tool) => ({
  //   type: 'function',
  //   function: {
  //     name: tool.name,
  //     description: tool.description || '',
  //     parameters: tool.inputSchema ? {
  //       type: tool.inputSchema.type || 'object',
  //       properties: tool.inputSchema.properties || {
  //         topic: { type: 'string', description: 'The topic of the tool' },
  //         content: { type: 'string', description: 'The content of the tool' },
  //       },
  //       required: Array.isArray(tool.inputSchema.required) ? tool.inputSchema.required : ['topic', 'content'],
  //     } : {
  //       type: 'object',
  //       properties: {
  //         topic: { type: 'string', description: 'The topic of the tool' },
  //         content: { type: 'string', description: 'The content of the tool' },
  //       },
  //       required: ['topic', 'content'],
  //     }
  //   }
  // }));
  const toolTools: Tool[] = mcpTools.tools.map((tool) => {
    // Create a valid properties object that matches Ollama's Tool type requirements
    const createValidProperties = (props: any) => {
      // Ensure properties is an object with the right structure
      if (!props || typeof props !== 'object') {
        return {
          topic: { type: 'string', description: 'The topic of the tool' },
          content: { type: 'string', description: 'The content of the tool' }
        };
      }
      
      // Convert each property to ensure it has type and description
      const result: Record<string, { type: string; description: string }> = {};
      for (const key in props) {
        result[key] = {
          type: props[key]?.type || 'string',
          description: props[key]?.description || `The ${key} of the tool`
        };
      }
      return result;
    };
    
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description || '',
        parameters: tool.inputSchema ? {
          type: tool.inputSchema.type || 'object',
          properties: createValidProperties(tool.inputSchema.properties),
          required: Array.isArray(tool.inputSchema.required) ? tool.inputSchema.required : ['topic', 'content'],
        } : {
          type: 'object',
          properties: {
            topic: { type: 'string', description: 'The topic of the tool' },
            content: { type: 'string', description: 'The content of the tool' },
          },
          required: ['topic', 'content'],
        }
      }
    };
  });

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

    const ui = new ColoredReadlineInterface(process.stdin, process.stdout);

    const tools = await setupMcpTools(client, ui);

    ui.writeSystem(`Connected to Ollama at ${ollamaBaseUrl} using model ${ollamaModel}`);
    ui.writeSystem('MCP tools and resources loaded successfully');

    ui.writeSystem(`tools: ${JSON.stringify(tools, null, 2)}`);

    ui.writeSystem(`resources: ${tools.resources.map((resource) => resource)}`);


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