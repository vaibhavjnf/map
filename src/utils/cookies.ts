const COOKIE_OPTIONS = {
  secure: true,
  sameSite: 'strict' as const,
  path: '/',
  expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
}

export const cookies = {
  set(name: string, value: string) {
    document.cookie = `${name}=${value}; ${Object.entries(COOKIE_OPTIONS)
      .map(([key, val]) => `${key}=${val}`)
      .join('; ')}`
  },

  get(name: string): string | null {
    const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`))
    return match ? match[2] : null
  },

  remove(name: string) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  }
}
