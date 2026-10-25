import axios from 'axios';

const api = axios.create({
    // Use the local Laravel API in development; production builds use the deployed API.
    baseURL: import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV
        ? 'http://127.0.0.1:8000/api'
        : 'https://agosense-iot-backend.onrender.com/api'),
    timeout: 20000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }
});

// Automatically attach the user's bearer token to local requests if available
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
