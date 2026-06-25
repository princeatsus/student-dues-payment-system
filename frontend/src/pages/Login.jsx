import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png'; // Change to your logo path

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // 👈 NEW
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

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
          <img src={logo} alt="School Logo" style={styles.logoImage} />
          <h1 style={styles.leftTitle}>Ho Technical University</h1>
          <h2 style={styles.leftSubtitle}>Computer Science Department</h2>
          <p style={styles.tagline}>— Excellence in Technology & Innovation —</p>
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
          <div style={styles.trustBadge}>
            🔒 Secure · Encrypted · University-Grade
          </div>
        </div>
        <div style={styles.leftFooterGroup}>
          <p style={styles.leftFooter}>Computer Science Department © 2026</p>
          <p style={styles.poweredBy}>⚡ Powered by React · Node.js · Supabase</p>
        </div>
      </div>

      {/* Right Panel */}
      <div style={styles.rightPanel}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardIcon}>💻</div>
            <h2 style={styles.cardTitle}>{getGreeting()}, Developer 👋</h2>
            <p style={styles.cardSubtitle}>Sign in with your departmental email address</p>
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
                  type={showPassword ? 'text' : 'password'} // 👈 DYNAMIC TYPE
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  style={styles.input}
                  required
                />
                {/* 👇 NEW EYE ICON */}
                <span
                  style={styles.eyeIcon}
                  onClick={() => setShowPassword(!showPassword)}
                  role="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </span>
              </div>
            </div>

            <div style={styles.forgotRow}>
              <a href="#" style={styles.forgotLink}>Forgot password?</a>
            </div>

            <button
              type="submit"
              style={{
                ...styles.button,
                ...(loading && styles.buttonLoading),
                ...(isHovered && !loading && styles.buttonHover),
              }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
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

          <p style={styles.support}>
            💬 Need help? <a href="#" style={styles.supportLink}>Contact IT Support</a>
            <span style={styles.supportPhone}>| 📞 +233 XX XXX XXXX</span>
          </p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'Segoe UI', -apple-system, sans-serif",
    backgroundColor: '#f0f4ff',
  },
  leftPanel: {
    flex: 1,
    background: 'linear-gradient(135deg, #003087 0%, #0051d4 50%, #0073ff 100%)',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '40px 30px',
    position: 'relative',
    overflow: 'hidden',
  },
  leftContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    position: 'relative',
    zIndex: 1,
  },
  logoImage: {
    width: '60px',
    height: '60px',
    objectFit: 'cover',
    borderRadius: '50%',
    backgroundColor: '#fff',
    padding: '4px',
    marginBottom: '8px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
  },
  leftTitle: {
    fontSize: '26px',
    fontWeight: 'bold',
    margin: 0,
  },
  leftSubtitle: {
    fontSize: '18px',
    fontWeight: '400',
    margin: 0,
    opacity: 0.9,
  },
  tagline: {
    fontSize: '12px',
    fontWeight: '300',
    opacity: 0.7,
    margin: '-4px 0 0 0',
    letterSpacing: '0.5px',
    fontStyle: 'italic',
  },
  divider: {
    width: '50px',
    height: '3px',
    backgroundColor: '#fff',
    opacity: 0.5,
    margin: '6px 0',
  },
  leftDesc: {
    fontSize: '14px',
    opacity: 0.85,
    margin: 0,
    lineHeight: '1.5',
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '10px',
  },
  feature: {
    fontSize: '13px',
    opacity: 0.9,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: '8px 14px',
    borderRadius: '6px',
    transition: 'background 0.2s',
  },
  trustBadge: {
    fontSize: '11px',
    opacity: 0.6,
    marginTop: '12px',
    padding: '6px 12px',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: '20px',
    display: 'inline-block',
    width: 'fit-content',
    letterSpacing: '0.3px',
  },
  leftFooterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    position: 'relative',
    zIndex: 1,
  },
  leftFooter: {
    fontSize: '12px',
    opacity: 0.6,
    margin: 0,
  },
  poweredBy: {
    fontSize: '11px',
    opacity: 0.5,
    margin: 0,
    letterSpacing: '0.3px',
  },
  rightPanel: {
    flex: 1,
    backgroundColor: '#f0f4ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 30px',
    backgroundImage: `
      radial-gradient(circle at 80% 20%, rgba(0,48,135,0.03) 0%, transparent 50%),
      radial-gradient(circle at 20% 80%, rgba(0,48,135,0.03) 0%, transparent 50%)
    `,
  },
  card: {
    backgroundColor: 'transparent',
    padding: '0',
    width: '100%',
    maxWidth: '400px',
    animation: 'fadeIn 0.4s ease',
  },
  cardHeader: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  cardIcon: {
    fontSize: '40px',
    marginBottom: '8px',
  },
  cardTitle: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#003087',
    margin: '0 0 4px 0',
  },
  cardSubtitle: {
    fontSize: '13px',
    color: '#718096',
    margin: 0,
  },
  errorBox: {
    backgroundColor: '#fff5f5',
    border: '1px solid #fed7d7',
    color: '#c53030',
    padding: '10px 14px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '13px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#2d3748',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  inputIcon: {
    padding: '0 12px',
    fontSize: '14px',
    opacity: 0.6,
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
  // 👇 NEW EYE ICON STYLE
  eyeIcon: {
    padding: '0 12px',
    cursor: 'pointer',
    fontSize: '16px',
    opacity: 0.5,
    userSelect: 'none',
    transition: 'opacity 0.2s, transform 0.2s',
    ':hover': {
      opacity: 1,
      transform: 'scale(1.1)',
    },
  },
  forgotRow: {
    textAlign: 'right',
    marginTop: '-4px',
  },
  forgotLink: {
    fontSize: '12px',
    color: '#003087',
    textDecoration: 'none',
    fontWeight: '500',
    transition: 'color 0.2s',
  },
  button: {
    background: 'linear-gradient(135deg, #003087, #0051d4)',
    color: '#fff',
    padding: '14px',
    borderRadius: '10px',
    border: 'none',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '4px',
    letterSpacing: '0.5px',
    transition: 'all 0.25s ease',
    position: 'relative',
  },
  buttonHover: {
    transform: 'scale(1.02)',
    boxShadow: '0 6px 24px rgba(0,48,135,0.35)',
  },
  buttonLoading: {
    opacity: 0.7,
    cursor: 'not-allowed',
  },
  rolesInfo: {
    marginTop: '24px',
    padding: '14px',
    backgroundColor: 'rgba(255,255,255,0.7)',
    backdropFilter: 'blur(4px)',
    borderRadius: '10px',
    textAlign: 'center',
    border: '1px solid rgba(0,48,135,0.06)',
  },
  rolesTitle: {
    fontSize: '11px',
    color: '#718096',
    margin: '0 0 8px 0',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
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
    padding: '4px 14px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '500',
    letterSpacing: '0.3px',
    transition: 'transform 0.2s',
  },
  support: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#a0aec0',
    margin: '16px 0 0 0',
  },
  supportLink: {
    color: '#003087',
    textDecoration: 'none',
    fontWeight: '500',
  },
  supportPhone: {
    color: '#a0aec0',
    fontSize: '11px',
  },
};

// Inject animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;
document.head.appendChild(styleSheet);

export default Login;