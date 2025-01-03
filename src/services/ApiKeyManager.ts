import { getKey } from '../config/keys';

class ApiKeyManager {
  private static instance: ApiKeyManager;
  private initialized: boolean = false;

  private constructor() { }

  public static getInstance(): ApiKeyManager {
    if (!ApiKeyManager.instance) {
      ApiKeyManager.instance = new ApiKeyManager();
    }
    return ApiKeyManager.instance;
  }

  public async getApiKey(keyName: string): Promise<string> {
    if (!this.initialized) {
      this.initialized = true;
      console.log('API Keys ready');
    }
    // Không thêm VITE_ prefix vì đã được xử lý trong getKey
    const key = await getKey(keyName);
    if (!key) {
      console.warn(`API key not found: ${keyName}`);
      return ''; // Return empty string instead of throwing error
    }
    return key;
  }
}

const manager = ApiKeyManager.getInstance();

export const apiKeys = {
  getKey: (name: string) => manager.getApiKey(name)
};
