import { getEnv } from './envLoader';

class SecretManager {
  private static instance: SecretManager;
  private secrets: Map<string, string>;
  private salt: string;

  private constructor() {
    this.secrets = new Map();
    this.salt = crypto.getRandomValues(new Uint8Array(16)).join('');
    this.initializeSecrets();
  }

  private initializeSecrets() {
    const env = getEnv();
    console.log('Available env keys:', Object.keys(env).filter(k => k.startsWith('VITE_'))); // Debug log
    
    Object.entries(env).forEach(([key, value]) => {
      if (key.startsWith('VITE_')) {
        this.storeSecret(key, String(value));
      }
    });

    // Xóa env sau khi đã lưu
    Object.keys(env).forEach(key => {
      if (key.startsWith('VITE_')) {
        delete (env as any)[key];
      }
    });
  }

  private storeSecret(key: string, value: string) {
    const encrypted = this.encrypt(value);
    this.secrets.set(this.hashKey(key), encrypted);
  }

  private encrypt(value: string): string {
    const shuffled = value.split('').reverse().join('');
    const xored = shuffled.split('').map(char => 
      String.fromCharCode(char.charCodeAt(0) ^ this.salt.charCodeAt(0))
    ).join('');
    return btoa(xored);
  }

  private decrypt(value: string): string {  
    try {
      const xored = atob(value).split('').map(char =>
        String.fromCharCode(char.charCodeAt(0) ^ this.salt.charCodeAt(0))
      ).join('');
      return xored.split('').reverse().join('');
    } catch {
      return '';
    }
  }

  private hashKey(key: string): string {
    return btoa(key).substring(5, 15);
  }

  public static getInstance(): SecretManager {
    if (!SecretManager.instance) {
      SecretManager.instance = new SecretManager();
    }
    return SecretManager.instance;
  }

  public getSecret(key: string): string {
    const hashedKey = this.hashKey(key);
    const encrypted = this.secrets.get(hashedKey);
    if (!encrypted) {
      console.warn(`Secret not found for key: ${key}`);
      return '';
    }
    return this.decrypt(encrypted);
  }
}

const manager = SecretManager.getInstance();

export const getSecret = (key: string) => manager.getSecret(key);
