import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Automatically attach token to every request
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Public Verification
export const publicVerify = (index, year) => API.get(`/public/verify?index_number=${index}&graduation_year=${year}`);
export const gateVerify = (index) => API.get(`/public/gate-verify/${index}`);

// Auth
export const register = (data) => API.post('/auth/register', data);
export const login = (data) => API.post('/auth/login', data);
export const switchRole = (data) => API.post('/auth/switch-role', data);

// Dues
export const getBalance = () => API.get('/dues/balance');
export const getDuesConfig = () => API.get('/dues/config');
export const setDuesConfig = (data) => API.post('/dues/config', data);
export const generatePaymentReference = (data) => API.post('/dues/pay', data);

// Student Specific Endpoints
export const getStudentDashboard = () => API.get('/student/dashboard');
export const getStudentTransactionsHistory = (level) => API.get(`/student/transactions/history${level ? `?level=${level}` : ''}`);
export const getStudentClassFundStatus = () => API.get('/student/class-fund/status');

// Course Rep Specific Endpoints
export const getClassRoster = () => API.get('/rep/class-roster');
export const sendReminderEmail = (data) => API.post('/rep/remind', data);

// Accountant
export const getAllStudents = () => API.get('/accountant/students');
export const getAllTransactions = () => API.get('/accountant/transactions');
export const confirmPayment = (id, data) => API.put(`/accountant/transactions/${id}/confirm`, data);
export const reconcileUpload = (data) => API.post('/accountant/reconcile/upload', data);
export const reconcileConfirm = (data) => API.post('/accountant/reconcile/confirm', data);
export const manualAssignPayment = (data) => API.post('/accountant/reconcile/manual-assign', data);
export const syncGoogleDirectory = () => API.post('/accountant/sync-directory');
export const getSyncLogs = () => API.get('/accountant/sync-logs');

// HOD
export const getDefaulters = () => API.get('/hod/defaulters');
export const grantOverride = (data) => API.post('/hod/override', data);
export const getAllOverrides = () => API.get('/hod/overrides');
export const getHODStats = () => API.get('/hod/stats');

// Expenses
export const getExpenses = () => API.get('/expenses');
export const submitExpense = (data) => API.post('/expenses', data);
export const approveExpense = (id) => API.put(`/expenses/${id}/approve`);
export const rejectExpense = (id, data) => API.put(`/expenses/${id}/reject`, data);
export const disburseExpense = (id, data) => API.put(`/expenses/${id}/disburse`, data);
