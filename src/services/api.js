import axios from 'axios';

const api = axios.create({ timeout: 5000 });
const BASE = '/api';

export const getVehicles       = ()                => api.get(`${BASE}/vehicles`);
export const getLatestReading  = (id)              => api.get(`${BASE}/vehicles/${id}/readings/latest`);
export const getReadings       = (id, from, to)    => api.get(`${BASE}/vehicles/${id}/readings`, { params: { from: from || undefined, to: to || undefined } });
export const getVehicleSummary = (id)              => api.get(`${BASE}/vehicles/${id}/summary`);
export const getTop5Today      = ()                => api.get(`${BASE}/vehicles/top5-speed-today`);
export const addReading        = (vehicleId, data) => api.post(`${BASE}/vehicles/${vehicleId}/readings`, data);
export const getAvgTempPerHour = (id)              => api.get(`${BASE}/vehicles/${id}/readings/avg-engine-temp-per-hour`);
