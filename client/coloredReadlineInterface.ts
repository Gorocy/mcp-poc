import { createInterface, Interface } from 'node:readline';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  underline: '\x1b[4m'
};

/**
 * Extended readline interface with colored output
 */
class ColoredReadlineInterface {
  private rlInterface: Interface;
  private output: NodeJS.WritableStream;

  constructor(input: NodeJS.ReadableStream, output: NodeJS.WritableStream) {
    this.rlInterface = createInterface({
      input,
      output
    });
    this.output = output;
  }

  /**
   * Write text to the console with color
   */
  write(text: string, color?: keyof typeof colors): void {
    if (color && colors[color]) {
      this.output.write(`${colors[color]}${text}${colors.reset}`);
    } else {
      this.output.write(text);
    }
  }

  /**
   * Write a system message (blue)
   */
  writeSystem(text: string): void {
    this.write(`${text}\n`, 'blue');
  }

  /**
   * Write an LLM response (green)
   */
  writeLLM(text: string): void {
    this.write(`${text}\n`, 'green');
  }

  /**
   * Write a tool message (yellow)
   */
  writeTool(text: string): void {
    this.write(`${text}\n`, 'yellow');
  }

  /**
   * Write a progress message (cyan)
   */
  writeProgress(text: string): void {
    this.write(`${text}\n`, 'cyan');
  }

  /**
   * Write an error message (magenta)
   */
  writeError(text: string): void {
    this.write(`${text}\n`, 'magenta');
  }

  /**
   * Ask a question and get the answer
   */
  async question(query: string): Promise<string> {
    return new Promise((resolve) => {
      this.rlInterface.question(query, (answer: string) => {
        resolve(answer);
      });
    });
  }

  /**
   * Close the interface
   */
  close(): void {
    this.rlInterface.close();
  }
}

export default ColoredReadlineInterface;