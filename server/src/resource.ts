// import { Resource } from "@modelcontextprotocol/sdk/types.js";

// export const resourcesSurrealsbTool: Resource = {
//     uri: 'get-knowledge',
//     name: 'get-knowledge',
//     description: 'Get knowledge from the Surrealsb',
// };
// export async function getKnowledge(topic: string) {
//     try {
//         const response = await fetch(`http://localhost:8080/knowledge/${topic}`, {
//             method: 'GET',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//         });
        
//         console.log(response);
//         const data = await response.json();
        
//         // Zwróć dane w wymaganym formacie MCP SDK
//         return {
//             contents: [{ 
//                 type: 'text', 
//                 text: JSON.stringify(data)
//             }],
//         };
//     } catch (error) {
//         console.error('Error fetching knowledge:', error);
//         return {
//             contents: [{ type: 'text', text: 'Error fetching knowledge' }],
//         };
//     }
// }
