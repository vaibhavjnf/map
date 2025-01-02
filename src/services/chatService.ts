import { GoogleGenerativeAI } from "@google/generative-ai";
import { systemPrompts } from '../utils/prompts';
import { db } from '../utils/database';
import { auth } from '../utils/auth';

class ChatService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private chat: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    this.chat = this.model.startChat();
  }

  async initializeChat(userId: string): Promise<{ messages: any[], isNew: boolean }> {
    const previousMessages = db.getUserMessages(userId);
    await this.chat.sendMessage(systemPrompts.chatbot);
    
    if (!previousMessages.length) {
      return { 
        messages: [],
        isNew: true 
      };
    }

    return { 
      messages: previousMessages.map(msg => ({
        role: msg.role,
        text: msg.content
      })),
      isNew: false
    };
  }

  async sendMessage(message: string, userId: string): Promise<string> {
    if (!await this.validateRequest(userId, message)) {
      throw new Error('Message validation failed');
    }

    const result = await this.chat.sendMessage(message);
    return result.response.text();
  }

  private async validateRequest(userId: string, message: string): Promise<boolean> {
    if (!await auth.useAICredits(1)) {
      throw new Error('You have run out of AI credits');
    }

    if (!await db.checkRateLimit(userId)) {
      throw new Error('Rate limit exceeded');
    }

    if (message.length > 200) {
      throw new Error('Message too long');
    }

    return true;
  }

  async saveMessage(userId: string, role: 'user' | 'model', content: string): Promise<void> {
    await db.saveUserMessage(userId, { role, content });
  }
}

export const chatService = new ChatService();
export { db };

