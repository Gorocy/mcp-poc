import type { Tool } from 'ollama';

export const calculatorTool: Tool = {
    type: 'function',
    function: {
        name: 'calculator',
        description: 'function calling calculator to calculate the result of an operation, ONLY available operations: add, subtract, multiply, divide',
        parameters: {
            type: 'object',
            properties: {
                operation: { type: 'string', description: 'The operation to perform' },
                a: { type: 'number', description: 'The first number' },
                b: { type: 'number', description: 'The second number' },
            },
            required: ['operation', 'a', 'b'],
        },
    },
};