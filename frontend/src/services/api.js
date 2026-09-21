import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token varsa tüm korumalı API isteklerine otomatik ekler.
API.interceptors.request.use((config) => {
  const token = window.localStorage.getItem('anka_auth_token');
  if (token) config.headers.Authorization = `Token ${token}`;
  return config;
});

// Kimlik doğrulama ve kullanıcı yönetimi
export const login = (data) => API.post('login/', data);
export const getUsers = () => API.get('users/');
export const createUser = (data) => API.post('users/', data);
export const updateUser = (id, data) => API.patch(`users/${id}/`, data);
export const deleteUser = (id) => API.delete(`users/${id}/`);

// Üretici ve sorumlu personel işlemleri
export const getCustomers = () => API.get('customers/');
export const createCustomer = (data) => API.post('customers/', data);
export const updateCustomer = (id, data) => API.put(`customers/${id}/`, data);
export const deleteCustomer = (id) => API.delete(`customers/${id}/`);

export const getResponsiblePersons = () => API.get('responsible-persons/');
export const createResponsiblePerson = (data) => API.post('responsible-persons/', data);
export const updateResponsiblePerson = (id, data) => API.put(`responsible-persons/${id}/`, data);
export const deleteResponsiblePerson = (id) => API.delete(`responsible-persons/${id}/`);
export const createResponsiblePersonPayment = (data) => API.post('responsible-person-payments/', data);

export const getSieveStations = () => API.get('sieve-stations/');
export const createSieveStation = (data) => API.post('sieve-stations/', data);
export const updateSieveStation = (id, data) => API.put(`sieve-stations/${id}/`, data);
export const deleteSieveStation = (id) => API.delete(`sieve-stations/${id}/`);

// Fiyat, satış, araç ve envanter işlemleri
export const getOlivePrices = () => API.get('olive-prices/');
export const createOlivePrice = (data) => API.post('olive-prices/', data);
export const updateOlivePrice = (id, data) => API.put(`olive-prices/${id}/`, data);
export const deleteOlivePrice = (id) => API.delete(`olive-prices/${id}/`);

export const getSortingRecords = () => API.get('sorting-records/');
export const createSortingRecord = (data) => API.post('sorting-records/', data);
export const updateSortingRecord = (id, data) => API.patch(`sorting-records/${id}/`, data);
export const createCustomerPayment = (data) => API.post('customer-payments/', data);
export const getMerchantParties = () => API.get('merchant-parties/');
export const createMerchantParty = (data) => API.post('merchant-parties/', data);
export const getDrivers = () => API.get('drivers/');
export const createDriver = (data) => API.post('drivers/', data);
export const updateDriver = (id, data) => API.patch(`drivers/${id}/`, data);
export const deleteDriver = (id) => API.delete(`drivers/${id}/`);
export const getVehicles = () => API.get('vehicles/');
export const createVehicle = (data) => API.post('vehicles/', data);
export const updateVehicle = (id, data) => API.patch(`vehicles/${id}/`, data);
export const deleteVehicle = (id) => API.delete(`vehicles/${id}/`);
export const getSalesRecords = () => API.get('sales-records/');
export const createSalesRecord = (data) => API.post('sales-records/', data);
export const updateSalesRecord = (id, data) => API.patch(`sales-records/${id}/`, data);
export const createSalesPayment = (data) => API.post('sales-payments/', data);
export const getSalesPrices = () => API.get('sales-prices/');
export const createSalesPrice = (data) => API.post('sales-prices/', data);
export const updateSalesPrice = (id, data) => API.put(`sales-prices/${id}/`, data);
export const deleteSalesPrice = (id) => API.delete(`sales-prices/${id}/`);
export const getSalesOilPrices = () => API.get('sales-oil-prices/');
export const createSalesOilPrice = (data) => API.post('sales-oil-prices/', data);
export const updateSalesOilPrice = (id, data) => API.put(`sales-oil-prices/${id}/`, data);
export const getInventoryEntries = () => API.get('inventory-entries/');
export const createInventoryEntry = (data) => API.post('inventory-entries/', data);
export const deleteInventoryEntry = (id) => API.delete(`inventory-entries/${id}/`);
export const getShipments = () => API.get('shipments/');
export const createShipment = (data) => API.post('shipments/', data);
export const updateShipment = (id, data) => API.put(`shipments/${id}/`, data);
export const patchShipment = (id, data) => API.patch(`shipments/${id}/`, data);

export default API;