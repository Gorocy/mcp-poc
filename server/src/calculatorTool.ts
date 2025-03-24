import { Tool } from "@modelcontextprotocol/sdk/types.js";

const CALCULATOR_PORT = process.env.CALCULATOR_PORT

const host = process.env.CALCULATOR_HOST || `http://localhost:${CALCULATOR_PORT}`;

const operations = ['add', 'subtract', 'multiply', 'divide'];
export const calculatorTool: Tool = {
    name: 'calculator',
    description: 'A tool for performing calculations',
    inputSchema: {
        type: 'object',
        properties: {
            operation: { type: 'string', description: 'The operation to perform', enum: operations },
            a: { type: 'number', description: 'The first operand' },
            b: { type: 'number', description: 'The second operand' },
        },
        required: ['operation', 'a', 'b'],
    },
}

export async function calculatorService(input: { operation: string, a: number, b: number }) {
    try {
        const { operation, a, b } = input;
        
        if (!operations.includes(operation)) {
            return {
                content: [{ type: 'text', text: `Invalid operation, please use one of the following: ${operations.join(', ')}` }],
            };
        }

        const response = await fetch(`${host}/${operation}/${a}/${b}`);
        const data = await response.json();
        
        return {
            content: [{ type: 'text', text: `Result: ${data.result}` }],
        };
    } catch (error) {
        return {
            content: [{ type: 'text', text: `Error: ${error}` }],
        };
    }
}