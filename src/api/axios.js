import axios from 'axios';

const api = axios.create({
    // Use the deployed API by default so a local Vite preview does not silently
    // send authentication requests to a Laravel server that is not running.
    baseURL: import.meta.env.VITE_API_BASE_URL || 'https://agosense-iot-backend.onrender.com/api',
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
