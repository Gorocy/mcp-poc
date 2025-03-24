import {
  McpServer,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { storeKnowledgeTool, storeKnowledge } from './storeKnowledge.js';
import { calculatorTool, calculatorService } from './calculatorTool.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {  resourcesSurrealsbResource, getKnowledge } from './resource.js';


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

// const resources: Resource[] = [
//   resourcesSurrealsbTool
// ]

for (const tool of tools) {
  const inputSchema = Object.fromEntries(
    Object.entries(tool.inputSchema?.properties || {}).map(([key, prop]) => {
      // MAPPING JSON SCHEMA TO ZOD
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
  resourcesSurrealsbResource,
  async (uri, { topic }) => {
    return getKnowledge(uri, { topic: topic as string });
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
