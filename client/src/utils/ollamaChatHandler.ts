import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Tool } from 'ollama';
import { Ollama } from 'ollama';
import ColoredReadlineInterface from './coloredReadlineInterface.js';

class OllamaChatHandler {
    private chatHistory: { role: string; content: string; tool_call_id?: string; name?: string }[] = [];
    private aiGreetingText = 'How can I help you today?';
    private ollamaModel: string;
    private client: Client;
    private tools: { resources: Tool[]; tools: Tool[] };
    private ui: ColoredReadlineInterface;
    private ollama: Ollama;
    
    constructor(
      ollamaBaseUrl: string,
      ollamaModel: string,
      client: Client,
      tools: { resources: Tool[]; tools: Tool[] },
      ui: ColoredReadlineInterface
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
        this.ui.writeProgress("🔧 Using tools to find information...");
        
        // For each tool call
        for (const toolCall of response.message.tool_calls) {
          const toolName = toolCall.function.name;
          this.ui.writeProgress(`🔍 Using tool: ${toolName}`);
          
          // Call the tool and get response
          const toolResponse = await this.callToolOrResource(
            toolName,
            JSON.stringify(toolCall.function.arguments)
          );
          
          // Show the tool response to the user
          this.ui.writeTool(`📊 Tool result: ${toolResponse}`);
          
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
        this.ui.writeLLM(response.message.content);
      }
    }
  
    private async getFinalAnswer() {
      try {
        // Get a final answer from Ollama using the full conversation history
        // including the tool responses

        // TODO: Add a message to the chat history that asks the LLM to summarize the conversation and the results of the tools

        // this.chatHistory.push({
        //   role: 'user',
        //   content: "Tell what tools were used and what was the result of each tool."
        // })

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
        this.ui.writeLLM(`\n🤖 Answer: ${finalResponse.message.content}`);
      } catch (error) {
        console.error('Error getting final answer:', error);
        this.ui.writeError('Sorry, I had trouble processing the results.');
      }
    }
  
    private async callToolOrResource(toolName: string, args: string) {
      this.ui.writeProgress(`🔍 Calling tool: ${toolName}`);
      this.ui.writeProgress(`🔍 Calling tool: ${args}`);
      if (this.isTool(toolName)) {
        const { content } = await this.client.callTool({
          name: toolName,
          arguments: JSON.parse(args),
        });
        return Array.isArray(content) && content.length > 0
          ? content[0].text
          : 'No response from the tool.';
      } else if (this.isResource(toolName)) {
        this.ui.writeProgress(`🔍 Reading resource name: ${toolName}`);
        const argsObject = JSON.parse(args);
        const { contents } = await this.client.readResource({
          // TODO: Add a prefix to the resource name to make it unique
          uri: 'knowledge://' +  argsObject.topic,
        });
        this.ui.writeProgress(`🔍 Reading resource result: ${JSON.stringify(contents)}`);
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
  
      const prompt = await this.ui.question(`${this.aiGreetingText}\n`);
      
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
        this.ui.writeError('Sorry, I encountered an error processing your request.');
      }
    }
  }
  
 export default OllamaChatHandler;