import { Tool } from "@modelcontextprotocol/sdk/types.js";
import dotenv from 'dotenv';

dotenv.config();

const host = process.env.SERVICE_URL;

if (!host){
    throw new Error('Missing environment variables');
}

export const storeKnowledgeTool: Tool = {
    name: 'store-knowledge',
    description: 'function calling database to save data about some topic',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['topic', 'content'],
    },
  };

export async function storeKnowledge(params: { topic: string, content: string }) {
    try {
        const { topic, content } = params;

    const response = await fetch(`${host}/knowledge`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic, content }),
    });

    if (!response.ok) {
        return {
            content: [{ type: 'text', text: 'Failed to store knowledge' }],
        };
    }

        return {
            content: [{ type: 'text', text: `Stored: ${topic} - ${content}` }],
        };
    } catch (error) {
        return {
            content: [{ type: 'text', text: 'Failed to store knowledge' }],
        };
    }
}
