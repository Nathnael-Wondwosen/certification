// Use the environment variable if it exists, otherwise use an empty string (which will default to relative paths)
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    // Add other auth endpoints here if needed
  },
  // Add other API endpoints here
};

export const getApiUrl = (endpoint) => {
  // If we're in development and the endpoint starts with /api, use the full URL
  if (import.meta.env.DEV && endpoint.startsWith('/api')) {
    return `${API_BASE_URL}${endpoint}`;
  }
  return endpoint;
};
