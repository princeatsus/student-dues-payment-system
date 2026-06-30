import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import htuLogo from '../assets/sdms_logo.png';
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
    if (e) e.preventDefault();
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

  const handleQuickMockLogin = (email, password) => {
    setPortalEmail(email);
    setPortalPassword(password);
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
      
      {/* Centered Login Card Container */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, width: '100%', maxWidth: '460px' }}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <img src={htuLogo} alt="HTU Logo" style={styles.logoImage} />
          </div>

          {error && (
            <div style={styles.errorBox}>
              ⚠️ {error}
            </div>
          )}

          {/* If showDemoSwitcher is active and Developer mode is locked, show passcode lock */}
          {showDemoSwitcher && !isMockUnlocked ? (
            <form onSubmit={handleVerifyPasscode} style={styles.form}>
              <p style={{ ...styles.oauthNote, fontSize: '13px', margin: '0 0 10px 0', textAlign: 'center' }}>
                🔑 Enter Developer Passcode to unlock presets:
              </p>
              
              <div style={styles.inputGroup}>
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
                <p style={{ color: '#e53e3e', fontSize: '11px', margin: '0', textAlign: 'center' }}>
                  ❌ {passcodeError}
                </p>
              )}

              <button type="submit" style={styles.submitBtn}>
                Unlock Presets
              </button>
            </form>
          ) : (
            /* Main Portal Login Form - MATCHES THE SCREENSHOT EXACTLY */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={styles.welcomeText}>Welcome, please login to register.</div>

              <form onSubmit={handlePortalLoginSubmit} style={styles.form}>
                <div style={styles.inputGroup}>
                  <div style={styles.inputWrapper}>
                    <span style={styles.inputIcon}>✏️</span>
                    <input
                      type="text"
                      placeholder="Enter Index Number"
                      value={portalEmail}
                      onChange={(e) => setPortalEmail(e.target.value)}
                      style={styles.portalInput}
                      required
                    />
                  </div>
                </div>

                <div style={styles.inputGroup}>
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
                    {loading ? 'Login...' : 'Login'}
                  </button>
                </div>
              </form>

            </div>
          )}

          {/* Compact Quick Presets Links */}
          {showDemoSwitcher && isMockUnlocked && (
            <div style={{ ...styles.compactPresets, borderTop: '1px solid #eaeaea', paddingTop: '10px', marginTop: '10px' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>Presets: </span>
              <button
                type="button"
                style={styles.presetLink}
                onClick={() => handleQuickMockLogin('1026002202', 'student123')}
              >
                Student
              </button>
              <span style={{ fontSize: '11px', color: '#cbd5e1' }}>|</span>
              <button
                type="button"
                style={styles.presetLink}
                onClick={() => handleQuickMockLogin('1026002201', 'rep123')}
              >
                Rep
              </button>
              <span style={{ fontSize: '11px', color: '#cbd5e1' }}>|</span>
              <button
                type="button"
                style={styles.presetLink}
                onClick={() => handleQuickMockLogin('francis@htu.edu.gh', 'accountant123')}
              >
                Accountant
              </button>
              <span style={{ fontSize: '11px', color: '#cbd5e1' }}>|</span>
              <button
                type="button"
                style={styles.presetLink}
                onClick={() => handleQuickMockLogin('joseph@htu.edu.gh', 'hod123')}
              >
                HOD
              </button>
            </div>
          )}

        </div>

        {/* Footer Note Outside Card */}
        <div style={styles.outsideFooter}>
          ©2026 Ho Technical University · info@htu.edu.gh
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
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100vw',
    height: '100vh',
    backgroundImage: `url(${htuCampus})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    fontFamily: "'Segoe UI', -apple-system, sans-serif",
    overflowY: 'auto',
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
    padding: '35px 40px',
    width: '100%',
    maxWidth: '460px',
    borderRadius: '8px',
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
    width: '100%',
    maxWidth: '350px',
    height: 'auto',
    marginBottom: '10px',
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
    fontSize: '13px',
    fontWeight: '600',
    color: '#475569',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    border: '1.5px solid #cbd5e1',
    borderRadius: '8px',
    padding: '3px 12px',
    backgroundColor: '#f8fafc',
    transition: 'border-color 0.2s',
  },
  inputIcon: {
    fontSize: '16px',
    marginRight: '8px',
    color: '#94a3b8',
  },
  portalInput: {
    flex: 1,
    padding: '12px 6px',
    border: 'none',
    outline: 'none',
    fontSize: '15px',
    backgroundColor: 'transparent',
    color: '#1e293b',
  },
  rememberRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13.5px',
    color: '#64748b',
    marginTop: '6px',
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
    padding: '14px',
    border: '1.5px solid #ff7a00',
    borderRadius: '8px',
    backgroundColor: '#fff',
    color: '#ff7a00',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'background-color 0.2s',
  },
  loginBtn: {
    flex: 1.5,
    padding: '14px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#002060',
    color: '#fff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'opacity 0.2s',
  },
  orDivider: {
    display: 'flex',
    alignItems: 'center',
    margin: '14px 0',
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
  compactPresets: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '12px',
    flexWrap: 'wrap',
  },
  presetLink: {
    background: 'none',
    border: 'none',
    color: '#002060',
    textDecoration: 'underline',
    fontSize: '11px',
    cursor: 'pointer',
    padding: 0,
    fontWeight: 'bold',
  },
  outsideFooter: {
    textAlign: 'center',
    fontSize: '11px',
    color: '#fff',
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
    marginTop: '16px',
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #002060 0%, #1d4ed8 100%)',
    color: '#fff',
    padding: '12px',
    borderRadius: '8px',
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
  },
  dividerLine: {
    height: '1px',
    backgroundColor: '#e2e8f0',
    margin: '16px 0',
  },
  lmsTitle: {
    fontSize: '17px',
    color: '#4a5568',
    textAlign: 'center',
    fontWeight: '400',
    margin: '10px 0',
  },
  googleBtnWrapper: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
  },
  cookiesNotice: {
    textAlign: 'center',
    marginTop: '6px',
  },
  cookiesLink: {
    fontSize: '12px',
    color: '#2d3748',
    textDecoration: 'underline',
    letterSpacing: '0.5px',
    fontWeight: 'bold',
  },
  welcomeText: {
    fontSize: '15px',
    color: '#627d98',
    textAlign: 'left',
    margin: '0 0 4px 0',
    fontWeight: '400',
  },
  chatContainer: {
    textAlign: 'center',
    marginTop: '6px',
  },
  chatLink: {
    fontSize: '14px',
    color: '#6366f1',
    textDecoration: 'none',
    fontWeight: '500',
  },
  footerContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    marginTop: '20px',
  },
  footerLineRow: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    gap: '10px',
  },
  footerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#cbd5e1',
    opacity: 0.7,
  },
  footerCopyright: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#64748b',
    whiteSpace: 'nowrap',
  },
  footerEmail: {
    fontSize: '12px',
    color: '#94a3b8',
  }
};

export default Login;