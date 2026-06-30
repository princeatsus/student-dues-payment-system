import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import htuLogo from '../assets/logo.png';
import htuCampus from '../assets/htu_campus.png';

// We can define pre-configured presets to make live hackathon demos seamless
const PRESETS = [
  {
    label: '🎓 Student Preset (Level 300)',
    email: '1234567890@indexnumber.htu.edu.gh',
    name: 'Maxwell Owusu',
    role: 'STUDENT',
    level: 300,
    classGroup: 'A'
  },
  {
    label: '📢 Course Rep Preset (Level 200B)',
    email: '2026123456@indexnumber.htu.edu.gh',
    name: 'Zadiq Issaha',
    role: 'COURSE_REP',
    level: 200,
    classGroup: 'B'
  },
  {
    label: '💼 Accountant Preset',
    email: 'accountant@htu.edu.gh',
    name: 'Madam Beatrice (Finance)',
    role: 'ACCOUNTANT',
    level: 100,
    classGroup: 'A'
  },
  {
    label: '🏛️ HOD Preset (Electrical Dept)',
    email: 'hod@htu.edu.gh',
    name: 'Dr. Joseph Darko',
    role: 'HOD',
    level: 100,
    classGroup: 'A'
  }
];

const Login = () => {
  const showDemoSwitcher = new URLSearchParams(window.location.search).get('demo') === 'true';
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isDeveloperMode, setIsDeveloperMode] = useState(false); // Default to secure Google Auth mode
  const [isMockUnlocked, setIsMockUnlocked] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  const [portalEmail, setPortalEmail] = useState('');
  const [portalPassword, setPortalPassword] = useState('');

  const [customUsers, setCustomUsers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mock_users') || '[]');
    } catch (e) {
      return [];
    }
  });
  const [showRolesGuide, setShowRolesGuide] = useState(false);

  const handleVerifyPasscode = (e) => {
    e.preventDefault();
    if (passcode === 'htu2026') {
      setIsMockUnlocked(true);
      setPasscodeError('');
    } else {
      setPasscodeError('Invalid passcode. Access Denied.');
    }
  };

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  // Handle window resize for mobile check
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load Google Identity Services script
  useEffect(() => {
    const scriptId = 'google-gsi-client';
    let script = document.getElementById(scriptId);
    
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.id = scriptId;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setGoogleScriptLoaded(true);
      };
      script.onerror = () => {
        setError('Authentication Service Unavailable. Please try again in 5 minutes. If the issue persists, contact IT Support.');
      };
      document.head.appendChild(script);
    } else {
      setGoogleScriptLoaded(true);
    }
  }, []);

  // Initialize Google Sign In Button
  useEffect(() => {
    if (googleScriptLoaded && !isDeveloperMode) {
      try {
        /* global google */
        if (typeof google !== 'undefined') {
          google.accounts.id.initialize({
            client_id: '9876543210-mockclientid.apps.googleusercontent.com', // Replace with real Client ID if needed
            callback: handleGoogleLoginResponse
          });
          google.accounts.id.renderButton(
            document.getElementById('google-signin-btn'),
            { theme: 'outline', size: 'large', width: '100%', text: 'signin_with' }
          );
        } else {
          setError('Authentication Service Unavailable. Please try again in 5 minutes. If the issue persists, contact IT Support.');
        }
      } catch (err) {
        console.error('Google Sign In Init Error:', err);
        setError('Authentication Service Unavailable. Please try again in 5 minutes. If the issue persists, contact IT Support.');
      }
    }
  }, [googleScriptLoaded, isDeveloperMode]);

  const handleGoogleLoginResponse = async (googleResponse) => {
    setLoading(true);
    setError('');
    try {
      const response = await login({
        credential: googleResponse.credential,
        isMock: false
      });
      handleAuthSuccess(response.data);
    } catch (err) {
      // NFR-REL-02 requirement: Clear Google OAuth unavailable fallbacks
      setError(err.response?.data?.message || 'Authentication Service Unavailable. Please try again in 5 minutes. If the issue persists, contact IT Support.');
    } finally {
      setLoading(false);
    }
  };

  const handlePortalLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const presets = {
      '1026002202': { email: 'maxwell@indexnumber.htu.edu.gh', password: 'student123', name: 'Maxwell Owusu', role: 'STUDENT', level: 200, group: 'B' },
      '1026002201': { email: 'kojo@indexnumber.htu.edu.gh', password: 'rep123', name: 'Kojo Mensah', role: 'COURSE_REP', level: 200, group: 'B' },
      'maxwell@indexnumber.htu.edu.gh': { email: 'maxwell@indexnumber.htu.edu.gh', password: 'student123', name: 'Maxwell Owusu', role: 'STUDENT', level: 200, group: 'B' },
      'kojo@indexnumber.htu.edu.gh': { email: 'kojo@indexnumber.htu.edu.gh', password: 'rep123', name: 'Kojo Mensah', role: 'COURSE_REP', level: 200, group: 'B' },
      'francis@htu.edu.gh': { email: 'francis@htu.edu.gh', password: 'accountant123', name: 'Francis Dogbey', role: 'ACCOUNTANT', level: 100, group: 'A' },
      'joseph@htu.edu.gh': { email: 'joseph@htu.edu.gh', password: 'hod123', name: 'Dr. Joseph Darko', role: 'HOD', level: 100, group: 'A' },
      'joseph': { email: 'joseph@htu.edu.gh', password: 'hod123', name: 'Dr. Joseph Darko', role: 'HOD', level: 100, group: 'A' },
      'francis': { email: 'francis@htu.edu.gh', password: 'accountant123', name: 'Francis Dogbey', role: 'ACCOUNTANT', level: 100, group: 'A' },
    };

    const inputKey = portalEmail.toLowerCase().trim();

    if (showDemoSwitcher && isMockUnlocked) {
      let matchedUser = null;
      if (presets[inputKey] && presets[inputKey].password === portalPassword) {
        matchedUser = presets[inputKey];
      } else {
        const found = customUsers.find(u => (u.email.toLowerCase().trim() === inputKey || u.indexNumber === inputKey) && u.password === portalPassword);
        if (found) {
          matchedUser = found;
        }
      }

      if (matchedUser) {
        try {
          const response = await login({
            isMock: true,
            mockEmail: matchedUser.email,
            mockName: matchedUser.name,
            mockRole: matchedUser.role,
            mockLevel: parseInt(matchedUser.level),
            mockClassGroup: matchedUser.group
          });
          handleAuthSuccess(response.data);
          return;
        } catch (err) {
          setError(err.response?.data?.message || 'Mock login failed.');
          setLoading(false);
          return;
        }
      }
    }

    setError('Traditional Index Number / Password login is restricted in production. Please use the "Google" login button below to authenticate with your official HTU email address.');
    setLoading(false);
  };

  const handleAuthSuccess = (authData) => {
    const { token, user } = authData;
    loginUser(user, token);
    
    // Redirect based on role
    if (user.role === 'STUDENT') navigate('/student');
    else if (user.role === 'ACCOUNTANT') navigate('/accountant');
    else if (user.role === 'HOD') navigate('/hod');
    else if (user.role === 'COURSE_REP') navigate('/expenses');
    else navigate('/');
  };

  return (
    <div style={styles.page}>
      <div style={styles.overlay} />
      
      {/* Centered Login Card */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <img src={htuLogo} alt="HTU Logo" style={styles.logoImage} />
          <p style={styles.cardSubtitle}>COMPSSA Student Dues & Expense Portal</p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            ⚠️ {error}
          </div>
        )}

        {/* If showDemoSwitcher is active and Developer mode is locked, show passcode lock */}
        {showDemoSwitcher && !isMockUnlocked ? (
          <form onSubmit={handleVerifyPasscode} style={styles.form}>
            <p style={styles.mockHelpText}>
              🔑 <strong>Developer Mode Locked</strong>
            </p>
            <p style={{ ...styles.oauthNote, fontSize: '13px', margin: '4px 0 16px 0' }}>
              Please enter the Developer Passcode to unlock the demo presets for this submission:
            </p>
            
            <div style={styles.inputGroup}>
              <label style={styles.label}>Developer Passcode</label>
              <input
                type="password"
                placeholder="Enter passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                style={styles.input}
                required
              />
            </div>

            {passcodeError && (
              <p style={{ color: '#e53e3e', fontSize: '12px', margin: '0' }}>
                ❌ {passcodeError}
              </p>
            )}

            <button type="submit" style={styles.submitBtn}>
              Unlock Demo Presets →
            </button>
          </form>
        ) : (
          /* Main Portal Login Form */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <form onSubmit={handlePortalLoginSubmit} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Enter Index Number or Email</label>
                <div style={styles.inputWrapper}>
                  <span style={styles.inputIcon}>✏️</span>
                  <input
                    type="text"
                    placeholder="Enter Index Number / Email"
                    value={portalEmail}
                    onChange={(e) => setPortalEmail(e.target.value)}
                    style={styles.portalInput}
                    required
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Enter Password</label>
                <div style={styles.inputWrapper}>
                  <span style={styles.inputIcon}>🔒</span>
                  <input
                    type="password"
                    placeholder="Enter Password"
                    value={portalPassword}
                    onChange={(e) => setPortalPassword(e.target.value)}
                    style={styles.portalInput}
                    required
                  />
                </div>
              </div>

              <div style={styles.rememberRow}>
                <label style={styles.checkboxLabel}>
                  <input type="checkbox" style={{ marginRight: '6px' }} /> Remember me
                </label>
                <a href="#forgot" style={styles.forgotLink}>Forgot Details</a>
              </div>

              <div style={styles.buttonRow}>
                <button type="button" style={styles.enquiriesBtn}>Enquiries</button>
                <button type="submit" style={styles.loginBtn} disabled={loading}>
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </div>
            </form>

            <div style={styles.orDivider}>
              <span style={styles.orLine} />
              <span style={styles.orText}>OR</span>
              <span style={styles.orLine} />
            </div>

            {/* Google Sign In Button */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div id="google-signin-btn" style={styles.googleBtn}></div>
            </div>
            
            <div style={styles.domainWarning}>
              Only domains ending in <code>indexnumber.htu.edu.gh</code> or <code>htu.edu.gh</code> will be authorized.
            </div>
          </div>
        )}

        {/* Pitch Auto-Fill Helpers - ONLY if showDemoSwitcher is true AND unlocked! */}
        {showDemoSwitcher && isMockUnlocked && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px dashed #cbd5e1'
          }}>
            <h5 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#475569', fontWeight: '600' }}>
              🔑 Pitch Presets (Click to Auto-fill):
            </h5>
            <div style={styles.presetsGrid}>
              <button
                type="button"
                style={styles.presetBtn}
                onClick={() => {
                  setPortalEmail('1026002202');
                  setPortalPassword('student123');
                }}
              >
                🎓 Student (Maxwell)
              </button>
              <button
                type="button"
                style={styles.presetBtn}
                onClick={() => {
                  setPortalEmail('1026002201');
                  setPortalPassword('rep123');
                }}
              >
                📢 Course Rep (Kojo)
              </button>
              <button
                type="button"
                style={styles.presetBtn}
                onClick={() => {
                  setPortalEmail('francis@htu.edu.gh');
                  setPortalPassword('accountant123');
                }}
              >
                💼 Accountant (Francis)
              </button>
              <button
                type="button"
                style={styles.presetBtn}
                onClick={() => {
                  setPortalEmail('joseph@htu.edu.gh');
                  setPortalPassword('hod123');
                }}
              >
                🏛️ HOD (Joseph)
              </button>
            </div>
          </div>
        )}

        {/* Expandable Overview Guide */}
        <div style={{ marginTop: '20px', borderTop: '1px solid #eaeaea', paddingTop: '12px' }}>
          <button
            type="button"
            onClick={() => setShowRolesGuide(!showRolesGuide)}
            style={styles.accordionBtn}
          >
            <span>System Roles & Portal Overview</span>
            <span>{showRolesGuide ? '▲' : '▼'}</span>
          </button>

          {showRolesGuide && (
            <div style={styles.accordionContent}>
              <div style={styles.guideItem}>
                <strong style={{ color: '#002060' }}>🎓 Student Portal</strong>
                <div>View dues balance, make payments via simulated MoMo, and download watermarked clearance slip PDFs.</div>
              </div>
              <div style={styles.guideItem}>
                <strong style={{ color: '#002060' }}>📢 Course Rep Portal</strong>
                <div>Track class payment rosters (Paid vs Owing), send bulk defaulter email notifications, and submit project expense requests.</div>
              </div>
              <div style={styles.guideItem}>
                <strong style={{ color: '#002060' }}>💼 Accountant Portal</strong>
                <div>Upload MoMo payment statement CSV files for auto-reconciliation, audit transaction logs, and edit level dues prices.</div>
              </div>
              <div style={styles.guideItem}>
                <strong style={{ color: '#002060' }}>🏛️ HOD Portal</strong>
                <div>View collection efficiency and budget spend widgets, authorize exam hall overrides, and sign off on rep expenses.</div>
              </div>
            </div>
          )}
        </div>

        <div style={styles.footerNote}>
          ©2026 HTU — E-mail: info@htu.edu.gh
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100vw',
    backgroundImage: `url(${htuCampus})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    fontFamily: "'Segoe UI', -apple-system, sans-serif",
    position: 'relative',
    padding: '20px',
    boxSizing: 'border-box',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    zIndex: 1,
  },
  card: {
    backgroundColor: '#fff',
    padding: '30px 40px',
    width: '100%',
    maxWidth: '460px',
    borderRadius: '12px',
    boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
    zIndex: 2,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
  },
  cardHeader: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  logoImage: {
    maxWidth: '240px',
    height: 'auto',
    marginBottom: '12px',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#334e68',
    margin: '0 0 4px 0',
  },
  cardSubtitle: {
    fontSize: '13px',
    color: '#627d98',
    margin: 0,
    fontWeight: '500',
  },
  errorBox: {
    backgroundColor: '#fff5f5',
    border: '1px solid #fed7d7',
    color: '#c53030',
    padding: '12px 14px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '13px',
    lineHeight: '1.5',
    zIndex: 3,
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
    fontSize: '12.5px',
    fontWeight: '600',
    color: '#475569',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    border: '1.5px solid #cbd5e1',
    borderRadius: '6px',
    padding: '2px 10px',
    backgroundColor: '#f8fafc',
    transition: 'border-color 0.2s',
  },
  inputIcon: {
    fontSize: '14px',
    marginRight: '8px',
    color: '#94a3b8',
  },
  portalInput: {
    flex: 1,
    padding: '10px 4px',
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    backgroundColor: 'transparent',
    color: '#1e293b',
  },
  rememberRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12.5px',
    color: '#64748b',
    marginTop: '4px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
  },
  forgotLink: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontWeight: '500',
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
  enquiriesBtn: {
    flex: 1,
    padding: '12px',
    border: '1.5px solid #ff7a00',
    borderRadius: '6px',
    backgroundColor: '#fff',
    color: '#ff7a00',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'background-color 0.2s',
  },
  loginBtn: {
    flex: 1.5,
    padding: '12px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#002060',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'opacity 0.2s',
  },
  orDivider: {
    display: 'flex',
    alignItems: 'center',
    margin: '16px 0',
  },
  orLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#cbd5e1',
  },
  orText: {
    padding: '0 12px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#94a3b8',
  },
  googleBtn: {
    minHeight: '44px',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
  },
  domainWarning: {
    fontSize: '11px',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    padding: '8px 12px',
    borderRadius: '6px',
    lineHeight: '1.4',
    textAlign: 'center',
  },
  presetsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginTop: '6px',
  },
  presetBtn: {
    padding: '8px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    backgroundColor: '#fff',
    fontSize: '11px',
    color: '#334e68',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#f1f5f9',
    }
  },
  accordionBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    background: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '10px 14px',
    fontSize: '12.5px',
    fontWeight: '600',
    color: '#475569',
    cursor: 'pointer',
    textAlign: 'left',
  },
  accordionContent: {
    marginTop: '8px',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
  },
  guideItem: {
    fontSize: '12px',
    lineHeight: '1.4',
    color: '#475569',
  },
  footerNote: {
    textAlign: 'center',
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '20px',
  },
  mockHelpText: {
    fontSize: '12px',
    color: '#627d98',
    margin: '0 0 -8px 0',
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #002060 0%, #1d4ed8 100%)',
    color: '#fff',
    padding: '12px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '10px',
    transition: 'opacity 0.2s',
  },
  oauthNote: {
    fontSize: '13px',
    color: '#475569',
    lineHeight: '1.5',
    marginBottom: '16px',
  }
};

export default Login;