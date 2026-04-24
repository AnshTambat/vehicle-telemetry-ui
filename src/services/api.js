import axios from 'axios';

const api = axios.create({ timeout: 5000 });
const BASE = '/api';

api.interceptors.request.use(config => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const loginUser    = (data) => api.post(`${BASE}/auth/login`, data);
export const registerUser = (data) => api.post(`${BASE}/auth/register`, data);

export const getVehicles       = ()                => api.get(`${BASE}/vehicles`);
export const getLatestReading  = (id)              => api.get(`${BASE}/vehicles/${id}/readings/latest`);
export const getReadings       = (id, from, to)    => api.get(`${BASE}/vehicles/${id}/readings`, { params: { from: from || undefined, to: to || undefined } });
export const getVehicleSummary = (id)              => api.get(`${BASE}/vehicles/${id}/summary`);
export const getTop5Today      = ()                => api.get(`${BASE}/vehicles/top5-speed-today`);
export const addReading        = (vehicleId, data) => api.post(`${BASE}/vehicles/${vehicleId}/readings`, data);
export const getAvgTempPerHour = (id)              => api.get(`${BASE}/vehicles/${id}/readings/avg-engine-temp-per-hour`);
export const createVehicle     = (data)            => api.post(`${BASE}/vehicles`, data);
export const updateVehicle     = (id, data)        => api.put(`${BASE}/vehicles/${id}`, data);
export const deleteVehicle     = (id)              => api.delete(`${BASE}/vehicles/${id}`);
