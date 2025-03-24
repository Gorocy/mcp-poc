import type { Tool } from 'ollama';

export const storeKnowledgeTool: Tool = {
    type: 'function',
    function: {
        name: 'store-knowledge',
        description: 'Set knowledge in the database',
        parameters: {
            type: 'object',
            properties: {
                topic: { type: 'string', description: 'The topic of the tool' },
                content: { type: 'string', description: 'The content of the tool' },
            },
            required: ['topic', 'content'],
        },
    },
};