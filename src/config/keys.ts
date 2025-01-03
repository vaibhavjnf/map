import { getSecret } from './secrets';

export const getKey = (name: string) => {
  // Handle both formats: with or without VITE_ prefix
  const keyName = name.startsWith('VITE_') ? name : `VITE_${name}_API_KEY`;
  return getSecret(keyName);
};

export const maskKey = (key: string) => {
  if (!key) return '****';
  return `${key.slice(0, 4)}****${key.slice(-4)}`;
};
