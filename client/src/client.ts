import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import type { Tool } from 'ollama';
import dotenv from 'dotenv';
import OllamaChatHandler from './utils/ollamaChatHandler.js';
import ColoredReadlineInterface from './utils/coloredReadlineInterface.js';
import { storeKnowledgeTool } from './tools/storeKnowledge.js';
import { resourcesSurrealsbTool } from './resources/resourcesSurrealsb.js';
import { calculatorTool } from './tools/calculator.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
dotenv.config();  

// import { resource } from '../../server/src/resource.js';

function setupOllama() {
  const ollamaBaseUrl = process.env.OLLAMA_API_URL;
  const ollamaModel = process.env.OLLAMA_MODEL;

  if (!ollamaBaseUrl || !ollamaModel) {
    throw new Error('OLLAMA_API_URL and OLLAMA_MODEL must be set');
  }
  
  return { ollamaBaseUrl, ollamaModel };
}

async function setupMcpTools() {

  const tools: Tool[] = [
    storeKnowledgeTool,
    calculatorTool
  ]

  const resources: Tool[] = [
    resourcesSurrealsbTool
  ]

  return { resources, tools };
}

async function main() {
    try {
      const transport = new StdioClientTransport(
        {
          command: 'node',
          args: ['../server/dist/server.js'],
        }
      );

    const client = new Client(
      { name: 'ollama-mcp-client', version: '1.0.0' },
      { capabilities: { prompts: {}, resources: {}, tools: {} } }
    );

    await client.connect(transport);

    const { ollamaBaseUrl, ollamaModel } = setupOllama();

    const ui = new ColoredReadlineInterface(process.stdin, process.stdout);

    const tools = await setupMcpTools();

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