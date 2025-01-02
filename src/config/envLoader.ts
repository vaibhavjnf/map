const loadEnvSecurely = () => {
  const env = { ...import.meta.env };
  delete (window as any).env;
  delete (window as any).__VITE_ENV;
  return env;
};

export const getEnv = (() => {
  let cachedEnv: any = null;
  return () => {
    if (!cachedEnv) {
      cachedEnv = loadEnvSecurely();
    }
    return cachedEnv;
  };
})();
