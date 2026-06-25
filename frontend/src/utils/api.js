import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Automatically attach token to every request
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Auth
export const register = (data) => API.post('/auth/register', data);
export const login = (data) => API.post('/auth/login', data);

// Dues
export const getBalance = () => API.get('/dues/balance');
export const getDuesConfig = () => API.get('/dues/config');
export const setDuesConfig = (data) => API.post('/dues/config', data);
export const generatePaymentReference = () => API.post('/dues/pay');

// Accountant
export const getAllStudents = () => API.get('/accountant/students');
export const getAllTransactions = () => API.get('/accountant/transactions');
export const confirmPayment = (id, data) => API.put(`/accountant/transactions/${id}/confirm`, data);

// HOD
export const getDefaulters = () => API.get('/hod/defaulters');
export const grantOverride = (data) => API.post('/hod/override', data);
export const getAllOverrides = () => API.get('/hod/overrides');

// Expenses
export const getExpenses = () => API.get('/expenses');
export const submitExpense = (data) => API.post('/expenses', data);
export const approveExpense = (id) => API.put(`/expenses/${id}/approve`);
export const rejectExpense = (id, data) => API.put(`/expenses/${id}/reject`, data);
export const disburseExpense = (id) => API.put(`/expenses/${id}/disburse`);
