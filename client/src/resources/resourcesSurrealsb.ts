import type { Tool } from 'ollama';

export const resourcesSurrealsbTool: Tool = {
    type: 'function',
    function: {
        name: 'knowledge-for-topic',
        description: 'Get knowledge from the Surrealsb',
        parameters: {
            type: 'string',
            properties: {
                topic: { type: 'string', description: 'The topic of the resource' },
            },
            required: ['topic']
        }
    }
};
