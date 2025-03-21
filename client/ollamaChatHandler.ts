import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Tool } from 'ollama';
import { Ollama } from 'ollama';
import rl from 'node:readline/promises';

class OllamaChatHandler {
    private chatHistory: { role: string; content: string; tool_call_id?: string; name?: string }[] = [];
    private aiGreetingText = 'How can I help you today?';
    private ollamaModel: string;
    private client: Client;
    private tools: { resources: Tool[]; tools: Tool[] };
    private ui: rl.Interface;
    private ollama: Ollama;
    
    constructor(
      ollamaBaseUrl: string,
      ollamaModel: string,
      client: Client,
      tools: { resources: Tool[]; tools: Tool[] },
      ui: rl.Interface
    ) {
      this.ollamaModel = ollamaModel;
      this.client = client;
      this.tools = tools;
      this.ui = ui;
      this.ollama = new Ollama({
        host: ollamaBaseUrl,
      });
    }
  
    async processResponse(response: any) {
      // First, add the assistant's initial response to chat history
      this.chatHistory.push({
        role: 'assistant',
        content: response.message.content || "I'll need to look that up."
      });
      
      // If there are tool calls, process them
      if (response.message.tool_calls && response.message.tool_calls.length > 0) {
        this.ui.write("🔧 Using tools to find information...\n");
        
        // For each tool call
        for (const toolCall of response.message.tool_calls) {
          const toolName = toolCall.function.name;
          this.ui.write(`🔍 Using tool: ${toolName}\n`);
          
          // Call the tool and get response
          const toolResponse = await this.callToolOrResource(
            toolName,
            JSON.stringify(toolCall.function.arguments)
          );
          
          // Show the tool response to the user
          this.ui.write(`📊 Tool result: ${toolResponse}\n`);
          
          // Add tool response to chat history with proper format
          this.chatHistory.push({
            role: 'tool',
            content: toolResponse,
            tool_call_id: toolCall.id,
            name: toolName
          });
        }
        
        // After all tools are processed, get a final answer
        await this.getFinalAnswer();
      } else {
        // Just display the regular assistant response
        this.ui.write(response.message.content + '\n');
      }
    }
  
    private async getFinalAnswer() {
      try {
        // Get a final answer from Ollama using the full conversation history
        // including the tool responses
        const finalResponse = await this.ollama.chat({
          model: this.ollamaModel,
          messages: this.chatHistory,
        });
        
        // Add the final response to chat history
        this.chatHistory.push({
          role: 'assistant',
          content: finalResponse.message.content
        });
        
        // Display the final answer to the user
        this.ui.write(`\n🤖 Answer: ${finalResponse.message.content}\n`);
      } catch (error) {
        console.error('Error getting final answer:', error);
        this.ui.write('Sorry, I had trouble processing the results.\n');
      }
    }
  
    private async callToolOrResource(toolName: string, args: string) {
      if (this.isTool(toolName)) {
        const { content } = await this.client.callTool({
          name: toolName,
          arguments: JSON.parse(args),
        });
        return Array.isArray(content) && content.length > 0
          ? content[0].text
          : 'No response from the tool.';
      } else if (this.isResource(toolName)) {
        const { contents } = await this.client.readResource({
          uri: 'knowledge://' + toolName,
        });
        return contents[0]?.text || 'No content found in the resource.';
      }
  
      return 'Tool not found.';
    }
  
    private isTool(name: string) {
      return this.tools.tools.some((tool) => tool.function.name === name);
    }
  
    private isResource(name: string) {
      return this.tools.resources.some((tool) => tool.function.name === name);
    }
  
    async handleChat() {
      // Generate greeting if this is the first message
      if (this.chatHistory.length === 0) {
        try {
          const response = await this.ollama.chat({
            model: this.ollamaModel,
            messages: [{
              role: 'user',
              content: "Generate a friendly greeting for a user starting a chat."
            }],
          });
          this.aiGreetingText = response.message.content;
        } catch (error) {
          console.error('Error generating greeting:', error);
        }
      }
  
      const prompt = await this.ui.question(this.aiGreetingText + '\n');
      
      this.chatHistory.push({ role: 'user', content: prompt });
  
      try {  
        // Call Ollama with our messages and tools
        const response = await this.ollama.chat({
          model: this.ollamaModel,
          messages: this.chatHistory,
          tools: [...this.tools.tools, ...this.tools.resources],
        });
  
        // Process the response (handles both tool calls and regular responses)
        await this.processResponse(response);
      } catch (error) {
        console.error('Error calling Ollama API:', error);
        this.ui.write('Sorry, I encountered an error processing your request.\n');
      }
    }
  }
  
 export default OllamaChatHandler;
