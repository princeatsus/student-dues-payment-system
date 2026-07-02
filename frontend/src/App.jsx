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

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { switchRole } from './utils/api';

const DemoRoleSwitcher = () => {
  const { user, loginUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  // Don't show if user is not logged in or we are on public pages
  if (!user || ['/', '/verify'].includes(location.pathname)) return null;

  // Check demo mode environment flag (default to true to ensure it runs during development/demos)
  const isDemo = import.meta.env.VITE_DEMO_MODE !== 'false';
  if (!isDemo) return null;

  const roles = [
    { label: '🎓 Student View', value: 'STUDENT', path: '/student' },
    { label: '📢 Course Rep View', value: 'COURSE_REP', path: '/expenses' },
    { label: '💼 Accountant View', value: 'ACCOUNTANT', path: '/accountant' },
    { label: '🏛️ HOD View', value: 'HOD', path: '/hod' },
    { label: '📡 IoT Gate Simulator', value: 'IOT_GATE', path: '/iot-gate', isPublic: true }
  ];

  const handleSwitch = async (roleObj) => {
    if (roleObj.isPublic) {
      setIsOpen(false);
      window.location.href = roleObj.path;
      return;
    }
    if (user.role === roleObj.value) return;
    setSwitching(true);
    try {
      const res = await switchRole({ targetRole: roleObj.value });
      loginUser(res.data.user, res.data.token);
      setIsOpen(false);
      window.location.href = roleObj.path;
    } catch (err) {
      console.error('Demo switch error:', err);
      alert('Failed to switch role in demo mode');
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div style={demoStyles.container}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        style={demoStyles.toggleBtn}
      >
        ⚙️ Demo Console
      </button>

      {isOpen && (
        <div style={demoStyles.popover}>
          <div style={demoStyles.header}>
            Select Demo Role
          </div>
          <div style={demoStyles.list}>
            {roles.map((r) => (
              <button
                key={r.value}
                onClick={() => handleSwitch(r)}
                disabled={switching}
                style={{
                  ...demoStyles.roleBtn,
                  backgroundColor: (location.pathname === r.path || user.role === r.value) && !r.isPublic ? '#1e3a8a' : (location.pathname === r.path && r.isPublic ? '#1e3a8a' : '#f8fafc'),
                  color: (location.pathname === r.path || user.role === r.value) && !r.isPublic ? '#ffffff' : (location.pathname === r.path && r.isPublic ? '#ffffff' : '#334155'),
                  fontWeight: (location.pathname === r.path || user.role === r.value) ? '700' : '500'
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const demoStyles = {
  container: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: 9999,
    fontFamily: "'Inter', sans-serif"
  },
  toggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '30px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    transition: 'all 0.2s ease'
  },
  popover: {
    position: 'absolute',
    bottom: '60px',
    right: '0',
    width: '220px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden'
  },
  header: {
    padding: '12px 16px',
    backgroundColor: '#f1f5f9',
    fontSize: '12px',
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid #e2e8f0'
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    padding: '8px'
  },
  roleBtn: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '13px',
    textAlign: 'left',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    marginBottom: '4px'
  }
};

function App() {
  return (
    <>
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
      <DemoRoleSwitcher />
    </>
  );
}

export default App;