import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import AccountantDashboard from './pages/AccountantDashboard';
import HODDashboard from './pages/HODDashboard';
import ExpenseDashboard from './pages/ExpenseDashboard';
import ClassRoster from './pages/ClassRoster';
import Reconciliation from './pages/Reconciliation';
import Verify from './pages/Verify';
import IoTGate from './pages/IoTGate';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/student" element={
        <ProtectedRoute roles={['STUDENT']}>
          <StudentDashboard />
        </ProtectedRoute>
      } />
      <Route path="/accountant" element={
        <ProtectedRoute roles={['ACCOUNTANT', 'ADMIN']}>
          <AccountantDashboard />
        </ProtectedRoute>
      } />
      <Route path="/reconcile" element={
        <ProtectedRoute roles={['ACCOUNTANT', 'ADMIN']}>
          <Reconciliation />
        </ProtectedRoute>
      } />
      <Route path="/hod" element={
        <ProtectedRoute roles={['HOD']}>
          <HODDashboard />
        </ProtectedRoute>
      } />
      <Route path="/expenses" element={
        <ProtectedRoute roles={['COURSE_REP', 'HOD', 'ACCOUNTANT']}>
          <ExpenseDashboard />
        </ProtectedRoute>
      } />
      <Route path="/roster" element={
        <ProtectedRoute roles={['COURSE_REP', 'ADMIN']}>
          <ClassRoster />
        </ProtectedRoute>
      } />
      <Route path="/verify" element={<Verify />} />
      <Route path="/iot-gate" element={<IoTGate />} />
    </Routes>
  );
}

export default App;