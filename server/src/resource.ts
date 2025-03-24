import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Resource } from "@modelcontextprotocol/sdk/types.js";

const host = process.env.SERVICE_URL;

if (!host) {
  throw new Error('SERVICE_URL is not set');
}

export const resourcesSurrealsbTool: Resource = {
    uri: 'get-knowledge',
    name: 'get-knowledge',
    description: 'Get knowledge from the Surrealsb',
};

export async function getKnowledge(uri: URL, { topic }: { topic: string }) {
    try {
      const response = await fetch(
        `${host}/knowledge/${topic}`
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

export const resourcesSurrealsbResource: ResourceTemplate = new ResourceTemplate('knowledge://{topic}', {
    list: async () => {
      try {
        const response = await fetch(`${host}/knowledge`);
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
  })