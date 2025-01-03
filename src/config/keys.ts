class SecureKeyStore {
  private static instance: SecureKeyStore;
  private store: Map<string, string>;
  private salt: string;

  private constructor() {
    this.store = new Map();
    
    this.salt = Math.random().toString(36).slice(-8);
  }

  public static getInstance(): SecureKeyStore {
    if (!this.instance) {
      this.instance = new SecureKeyStore();
    }
    return this.instance;
  }

  private encrypt(value: string): string {
    const shuffled = value.split('').reverse().join('');
    const xored = shuffled.split('').map(char => 
      String.fromCharCode(char.charCodeAt(0) ^ this.salt.charCodeAt(0))
    ).join('');
    return btoa(xored);
  }

  private decrypt(encoded: string): string {
    try {
      const xored = atob(encoded).split('').map(char =>
        String.fromCharCode(char.charCodeAt(0) ^ this.salt.charCodeAt(0))
      ).join('');
      return xored.split('').reverse().join('');
    } catch {
      return '';
    }
  }

  public setKey(name: string, value: string) {
    if (!value) return;
    const encrypted = this.encrypt(value);
    this.store.set(this.obfuscateKey(name), encrypted);
  }

  public getKey(name: string): string {
    const encrypted = this.store.get(this.obfuscateKey(name));
    if (!encrypted) return '';
    return this.decrypt(encrypted);
  }

  private obfuscateKey(key: string): string {
    return btoa(key).slice(5, 15);
  }
}

const keyStore = SecureKeyStore.getInstance();

export const initializeKeys = () => {
  const env = import.meta.env;

  keyStore.setKey('STADIA', env.VITE_STADIA_API_KEY);
  keyStore.setKey('THUNDERFOREST', env.VITE_THUNDERFOREST_API_KEY);
  keyStore.setKey('GEMINI', env.VITE_GEMINI_API_KEY);
  keyStore.setKey('EMAILJS_PUBLIC', env.VITE_EMAILJS_PUBLIC_KEY);
  keyStore.setKey('EMAILJS_SERVICE', env.VITE_EMAILJS_SERVICE_ID);
  keyStore.setKey('EMAILJS_TEMPLATE', env.VITE_EMAILJS_TEMPLATE_ID);
  keyStore.setKey('AUTH_SALT', env.VITE_AUTH_SALT);

  const defaults = {
    DEFAULT_LAT: env.VITE_DEFAULT_LAT,
    DEFAULT_LNG: env.VITE_DEFAULT_LNG,
    DEFAULT_ZOOM: env.VITE_DEFAULT_ZOOM
  };

  Object.keys(env).forEach(key => {
    if (key.startsWith('VITE_')) {
      delete (env as any)[key];
    }
  });

  console.log('Keys initialized securely');
  
  return defaults;
};

export const getKey = (name: string) => {
  if (name.includes('DEFAULT_')) {
    return import.meta.env[`VITE_${name}`] || '';
  }
  return keyStore.getKey(name);
};

export const maskKey = (key: string) => {
  if (!key) return '****';
  return `${key.slice(0, 4)}****${key.slice(-4)}`;
};
