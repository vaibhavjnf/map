import { GoogleGenerativeAI } from '@google/generative-ai';
import { apiKeys } from './ApiKeyManager';

class GeminiService {
  private ai: GoogleGenerativeAI | null = null;
  private initialized = false;

  async initialize() {
    if (this.initialized) return;
    
    try {
      const apiKey = await apiKeys.getKey('GEMINI');
      if (!apiKey) {
        throw new Error('GEMINI API key not found');
      }

      this.ai = new GoogleGenerativeAI(apiKey);
      this.initialized = true;
      console.log('Gemini API initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Gemini:', error);
      throw error;
    }
  }

  async getModel() {
    await this.initialize();
    if (!this.ai) throw new Error('Gemini not initialized');
    return this.ai.getGenerativeModel({ model: "gemini-1.5-pro" });
  }

  async startChat(history = []) {
    const model = await this.getModel();
    return model.startChat({
      history,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.9,
        topK: 1,
        topP: 1,
      },
    });
  }
}

export const gemini = new GeminiService();
