import * as fs from 'fs';
import * as path from 'path';

export class CodeGenerator {
  private gamesDir: string;

  constructor() {
    this.gamesDir = path.join(__dirname, '../../../games');
    if (!fs.existsSync(this.gamesDir)) {
      fs.mkdirSync(this.gamesDir, { recursive: true });
    }
  }

  saveHtmlFile(code: string, filename: string): string {
    const filePath = path.join(this.gamesDir, filename);
    fs.writeFileSync(filePath, code);
    return filePath;
  }

  generateFileName(promptName: string, modelName: string): string {
    const timestamp = Date.now();
    const safePromptName = promptName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const safeModelName = modelName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `${safePromptName}-${safeModelName}-${timestamp}.html`;
  }

  readHtmlFile(filePath: string): string {
    return fs.readFileSync(filePath, 'utf-8');
  }

  deleteHtmlFile(filePath: string): void {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  listGeneratedFiles(): string[] {
    return fs.readdirSync(this.gamesDir).filter(file => file.endsWith('.html'));
  }
}

export const codeGenerator = new CodeGenerator();