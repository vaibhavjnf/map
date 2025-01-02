import { initializeKeys, getKey } from '../config/keys';
import { getSecret } from '../config/secrets';

// Dynamic import để tránh bundle env vars
const loadKeys = async () => {
  await import('../config/keys').then(module => {
    module.initializeKeys();
  });
};

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

  private async init() {
    if (!this.initialized) {
      await loadKeys();
      this.initialized = true;
      console.log('API Keys loaded securely');
    }
  }

  public async getKey(keyName: string): Promise<string> {
    await this.init();
    return getSecret(keyName);
  }
}

const manager = ApiKeyManager.getInstance();

export const apiKeys = {
  getKey: (name: string) => manager.getKey(name)
};
