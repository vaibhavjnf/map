import { getEnv } from './envLoader';

const maskValue = (value: string) => '****';

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
    
    Object.entries(env).forEach(([key, value]) => {
      if (key.startsWith('VITE_')) {
        this.storeSecret(key, String(value));
      }
    });

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

    return btoa(value);
  }

  private decrypt(value: string): string {
    try {
      return atob(value);
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
    if (!encrypted) return '';
    return this.decrypt(encrypted);
  }

  public debug(): { [key: string]: string } {
    const masked: { [key: string]: string } = {};
    this.secrets.forEach((_, key) => {
      masked[key] = maskValue('');
    });
    return masked;
  }
}

const manager = SecretManager.getInstance();

export const getSecret = (key: string) => manager.getSecret(key);
export const debugSecrets = () => manager.debug();
