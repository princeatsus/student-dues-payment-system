import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await login(formData);
      const { token, user } = response.data;
      loginUser(user, token);
      if (user.role === 'STUDENT') navigate('/student');
      else if (user.role === 'ACCOUNTANT') navigate('/accountant');
      else if (user.role === 'HOD') navigate('/hod');
      else if (user.role === 'COURSE_REP') navigate('/expenses');
      else navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Left Panel */}
      <div style={styles.leftPanel}>
        <div style={styles.leftContent}>
          <div style={styles.logoCircle}>HTU</div>
          <h1 style={styles.leftTitle}>Ho Technical University</h1>
          <h2 style={styles.leftSubtitle}>Electrical Department</h2>
          <div style={styles.divider} />
          <p style={styles.leftDesc}>
            Departmental Dues Payment & Management System
          </p>
          <div style={styles.featureList}>
            <div style={styles.feature}>✅ View & Pay Dues Online</div>
            <div style={styles.feature}>✅ Generate Momo Payment Reference</div>
            <div style={styles.feature}>✅ Download Clearance Certificate</div>
            <div style={styles.feature}>✅ Track Payment History</div>
          </div>
        </div>
        <p style={styles.leftFooter}>HTU Electrical Department © 2026</p>
      </div>

      {/* Right Panel */}
      <div style={styles.rightPanel}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardIcon}>🎓</div>
            <h2 style={styles.cardTitle}>Welcome Back</h2>
            <p style={styles.cardSubtitle}>Sign in to your account to continue</p>
          </div>

          {error && (
            <div style={styles.errorBox}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address</label>
              <div style={styles.inputWrapper}>
                <span style={styles.inputIcon}>✉️</span>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="yourname@htu.edu.gh"
                  style={styles.input}
                  required
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrapper}>
                <span style={styles.inputIcon}>🔒</span>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  style={styles.input}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              style={loading ? { ...styles.button, opacity: 0.7 } : styles.button}
              disabled={loading}
            >
              {loading ? '⏳ Signing in...' : 'Sign In →'}
            </button>
          </form>

          <div style={styles.rolesInfo}>
            <p style={styles.rolesTitle}>System Access Levels:</p>
            <div style={styles.rolesBadges}>
              <span style={styles.badge}>Student</span>
              <span style={styles.badge}>Course Rep</span>
              <span style={styles.badge}>Accountant</span>
              <span style={styles.badge}>HOD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'Segoe UI', sans-serif",
  },
  leftPanel: {
    flex: 1,
    background: 'linear-gradient(135deg, #003087 0%, #0051d4 50%, #0073ff 100%)',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '60px 50px',
  },
  leftContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  logoCircle: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    color: '#003087',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  leftTitle: {
    fontSize: '32px',
    fontWeight: 'bold',
    margin: 0,
  },
  leftSubtitle: {
    fontSize: '20px',
    fontWeight: '400',
    margin: 0,
    opacity: 0.9,
  },
  divider: {
    width: '60px',
    height: '3px',
    backgroundColor: '#fff',
    opacity: 0.5,
    margin: '8px 0',
  },
  leftDesc: {
    fontSize: '16px',
    opacity: 0.85,
    margin: 0,
    lineHeight: '1.6',
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '16px',
  },
  feature: {
    fontSize: '15px',
    opacity: 0.9,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: '10px 16px',
    borderRadius: '8px',
  },
  leftFooter: {
    fontSize: '13px',
    opacity: 0.6,
    margin: 0,
  },
  rightPanel: {
    flex: 1,
    backgroundColor: '#f0f4ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 30px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 8px 32px rgba(0,48,135,0.12)',
  },
  cardHeader: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  cardIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  cardTitle: {
    fontSize: '26px',
    fontWeight: 'bold',
    color: '#003087',
    margin: '0 0 8px 0',
  },
  cardSubtitle: {
    fontSize: '14px',
    color: '#718096',
    margin: 0,
  },
  errorBox: {
    backgroundColor: '#fff5f5',
    border: '1px solid #fed7d7',
    color: '#c53030',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    border: '1.5px solid #e2e8f0',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#f8faff',
  },
  inputIcon: {
    padding: '0 12px',
    fontSize: '16px',
  },
  input: {
    flex: 1,
    padding: '12px 12px 12px 0',
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    backgroundColor: 'transparent',
    color: '#2d3748',
  },
  button: {
    background: 'linear-gradient(135deg, #003087, #0051d4)',
    color: '#fff',
    padding: '14px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
    letterSpacing: '0.5px',
  },
  rolesInfo: {
    marginTop: '28px',
    padding: '16px',
    backgroundColor: '#f0f4ff',
    borderRadius: '8px',
    textAlign: 'center',
  },
  rolesTitle: {
    fontSize: '12px',
    color: '#718096',
    margin: '0 0 10px 0',
    fontWeight: '600',
  },
  rolesBadges: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: '#003087',
    color: '#fff',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
  },
};

export default Login;