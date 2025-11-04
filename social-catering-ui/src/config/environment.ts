// Environment Configuration
export const config = {
  // API Base URL - can be overridden by environment variables
  API_BASE_URL: (import.meta.env.VITE_API_URL as string | undefined) || '/api/v1',
  
  // App Configuration
  APP_NAME: 'Social Catering MVP',
  VERSION: '1.0.0',
  
  // Feature Flags
  ENABLE_DEBUG: import.meta.env.DEV,
  ENABLE_ANALYTICS: import.meta.env.PROD,
}

export default config
