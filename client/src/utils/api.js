const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5005' 
  : ''; // Use relative path in production (same host)

const api = {
  getToken: () => localStorage.getItem('token'),
  setToken: (token) => localStorage.setItem('token', token),
  clearToken: () => localStorage.removeItem('token'),

  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  setUser: (user) => localStorage.setItem('user', JSON.stringify(user)),
  clearUser: () => localStorage.removeItem('user'),

  request: async (endpoint, options = {}) => {
    const token = api.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const config = {
      ...options,
      headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
      
      // Auto logout on 401/403 (expired tokens)
      if (response.status === 401 || response.status === 403) {
        api.clearToken();
        api.clearUser();
        // Redirect to login if not already there
        if (!window.location.pathname.includes('/login') && window.location.pathname !== '/') {
          window.location.href = '/';
        }
      }
      
      throw new Error(errorMessage);
    }

    // For 204 No Content
    if (response.status === 204) {
      return null;
    }

    return response.json();
  },

  get: (endpoint) => api.request(endpoint, { method: 'GET' }),
  post: (endpoint, body) => api.request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => api.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint) => api.request(endpoint, { method: 'DELETE' }),
};

export default api;
