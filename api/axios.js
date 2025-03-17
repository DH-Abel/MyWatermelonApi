import axios from 'axios';

// Cambia esta URL por la IP de tu servidor
const API_URL = 'http://10.0.0.38:3000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 5000, // Tiempo máximo de espera en ms
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para manejar errores globalmente
api.interceptors.response.use(
  response => response,
  error => {
    console.error('❌ Error en la API:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Función para probar la conexión a la API
export const testConnection = async () => {
  try {
    const response = await api.get('/test-connection');
    console.log('✅ Conexión a la API exitosa:', response.data);
  } catch (error) {
    console.error('❌ Error al probar la conexión a la API:', error.response?.data || error.message);
  }
};

export default api;
