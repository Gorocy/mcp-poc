import {
  McpServer,
  ResourceTemplate,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { storeKnowledgeTool, storeKnowledge } from './storeKnowledge.js';
import { calculatorTool, calculatorService } from './calculatorTool.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';


// type properties = {
//     [key: string]: {
//       type: string;
//     };
//   };

const server = new McpServer({
  name: 'Demo MCP Server',
  version: '1.0.0',
});

console.log('Starting server');

const tools: Tool[] = [
  storeKnowledgeTool,
  calculatorTool
]

for (const tool of tools) {
  const inputSchema = Object.fromEntries(
    Object.entries(tool.inputSchema?.properties || {}).map(([key, prop]) => {
      // Mapowanie typów JSON Schema na typy Zod
      const typedProp = prop as { type?: string };
      
      if (typedProp.type === 'string') {
        return [key, z.string()];
      } else if (typedProp.type === 'number') {
        return [key, z.number()];
      } else if (typedProp.type === 'boolean') {
        return [key, z.boolean()];
      } else {
        return [key, z.any()];
      }
    })
  );
  // const functionInput = Object.fromEntries(
  //   Object.entries(tool.inputSchema?.properties || {}).map(([key, prop]) => {
  //     const typedProp = prop as properties[string];
  //     return [key, typedProp.type];
  //   })
  // );
  // console.log(functionInput);
  server.tool(
    tool.name,
    tool.description || 'No description provided',
    inputSchema,
    async (args: any) => {
      let result;
      switch (tool.name) {
        case 'store-knowledge':
            result = await storeKnowledge({
              topic: args.topic as string,
              content: args.content as string
            });
          break;
        case 'calculator':
          result = await calculatorService({
            operation: args.operation as string,
            a: args.a as number,
            b: args.b as number
          });
          break;
        default:
          result = {
            content: [{ type: "text", text: `Tool executed with args: ${JSON.stringify(args)}` }]
          };
      }
      
      // Ensure proper typing for the SDK
      return {
        content: result.content.map(item => ({
          ...item,
          type: item.type as "text"
        }))
      };
    }
  );
}

server.resource(
  'knowledge-for-topic',
  new ResourceTemplate('knowledge://{topic}', {
    list: async () => {
      try {
        const response = await fetch('http://localhost:8080/knowledge');
        console.log(response);
        if (!response.ok) {
          return { resources: [] };
        }

        const data = (await response.json()) as string[];

        return {
          resources: data.map((topic) => ({
            uri: `knowledge://${topic}`,
            description: 'A stored piece of knowledge - speficially, stored knowledge about topic: ' + topic,
            name: topic,
          })),
        };
      } catch (error) {
        return { resources: [] };
      }
    },
  }),

  async (uri, { topic }) => {
    try {
      const response = await fetch(
        `http://localhost:8080/knowledge/${topic}`
      );
      
      if (!response.ok) {
        return {
          contents: [
            {
              uri: uri.href,
              text: `Failed to retrieve knowledge for topic R: ${topic}, received response status: ${response.statusText}`,
            },
          ],
        };
      }
      
      const data = await response.json();
      
      return {
        contents: [
          {
            uri: uri.href,
            text: `Knowledge for topic: ${topic} - ${data.content}`,
          },
        ],
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          contents: [
            {
              uri: uri.href,
              text: `Failed to retrieve knowledge for topic E: ${topic}, received error: ${error.message}`,
            },
          ],
        };
      }
      return {
        contents: [
          {
            uri: uri.href,
            text: `Failed to retrieve knowledge for topic F: ${topic}, received error: ${error}`,
          },
        ],
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
