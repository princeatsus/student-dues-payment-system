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
    label: '🏛️ HOD Preset (Computer Science Dept)',
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
  const [showAccountChooser, setShowAccountChooser] = useState(false);
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);

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

  const handleAccountSelect = async (preset) => {
    setLoading(true);
    setError('');
    try {
      const response = await login({
        isMock: true,
        mockEmail: preset.email,
        mockName: preset.name,
        mockRole: preset.role,
        mockLevel: parseInt(preset.level),
        mockClassGroup: preset.classGroup || preset.group || 'A'
      });
      handleAuthSuccess(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Mock login failed.');
    } finally {
      setLoading(false);
      setShowAccountChooser(false);
    }
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
          ) : showCredentialsForm ? (
            /* Traditional login form if they clicked 'Use another account' */
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
                  <button type="button" style={styles.enquiriesBtn} onClick={() => setShowCredentialsForm(false)}>Back</button>
                  <button type="submit" style={styles.loginBtn} disabled={loading}>
                    {loading ? 'Login...' : 'Login'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Main LMS-style Login Card - Matches the screenshot exactly! */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={styles.dividerLine} />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start', width: '100%' }}>
                <div style={{ fontSize: '15px', color: '#1e293b', fontWeight: '600' }}>
                  Log in using your account on:
                </div>
                
                <button 
                  type="button" 
                  onClick={() => setShowAccountChooser(true)} 
                  style={styles.customGoogleBtn}
                  disabled={loading}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" style={styles.googleIconSvg}>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Login with HTU Email</span>
                </button>
              </div>

              <div style={styles.cookiesNotice}>
                <a href="#cookies" style={styles.cookiesLink}>COOKIES NOTICE</a>
              </div>
            </div>
          )}

          {/* Compact Quick Presets Links */}
          {showDemoSwitcher && isMockUnlocked && (
            <div style={{ ...styles.compactPresets, borderTop: '1px solid #eaeaea', paddingTop: '10px', marginTop: '10px' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>Presets: </span>
              <button
                type="button"
                style={styles.presetLink}
                onClick={() => handleAccountSelect(PRESETS[0])}
              >
                Student
              </button>
              <span style={{ fontSize: '11px', color: '#cbd5e1' }}>|</span>
              <button
                type="button"
                style={styles.presetLink}
                onClick={() => handleAccountSelect(PRESETS[1])}
              >
                Rep
              </button>
              <span style={{ fontSize: '11px', color: '#cbd5e1' }}>|</span>
              <button
                type="button"
                style={styles.presetLink}
                onClick={() => handleAccountSelect(PRESETS[2])}
              >
                Accountant
              </button>
              <span style={{ fontSize: '11px', color: '#cbd5e1' }}>|</span>
              <button
                type="button"
                style={styles.presetLink}
                onClick={() => handleAccountSelect(PRESETS[3])}
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

      {/* Google Account Chooser Modal Overlay */}
      {showAccountChooser && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <svg viewBox="0 0 24 24" width="24" height="24" style={{ marginBottom: '12px' }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <h2 style={styles.modalTitle}>Choose an account</h2>
              <p style={styles.modalSubtitle}>to continue to HTU Student Dues Payment System</p>
            </div>
            
            <div style={styles.accountsList}>
              {PRESETS.map((preset, idx) => {
                const initials = preset.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                const colors = ['#1a73e8', '#c26401', '#0f9d58', '#db4437'];
                const bgColor = colors[idx % colors.length];

                return (
                  <div 
                    key={idx} 
                    onClick={() => handleAccountSelect(preset)} 
                    style={styles.accountRow}
                  >
                    <div style={{ ...styles.avatarCircle, backgroundColor: bgColor }}>
                      {initials}
                    </div>
                    <div style={styles.accountInfo}>
                      <div style={styles.accountName}>{preset.name}</div>
                      <div style={styles.accountEmail}>{preset.email}</div>
                    </div>
                  </div>
                );
              })}
              
              <div 
                onClick={() => {
                  setShowAccountChooser(false);
                  setShowCredentialsForm(true);
                }} 
                style={styles.accountRow}
              >
                <div style={{ ...styles.avatarCircle, backgroundColor: '#f1f3f4', color: '#5f6368', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  👤
                </div>
                <div style={styles.accountInfo}>
                  <div style={{ ...styles.accountName, color: '#1a73e8', fontWeight: '600' }}>Use another account</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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
    maxWidth: '440px',
    borderRadius: '0',
    boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
    zIndex: 2,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
  },
  cardHeader: {
    textAlign: 'center',
    marginBottom: '10px',
  },
  logoImage: {
    width: '100%',
    maxWidth: '350px',
    height: 'auto',
    marginBottom: '8px',
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
    borderRadius: '0',
    marginBottom: '20px',
    fontSize: '13px',
    lineHeight: '1.5',
    zIndex: 3,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
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
    borderRadius: '0',
    padding: '1px 8px',
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
    padding: '8px 4px',
    border: 'none',
    outline: 'none',
    fontSize: '13.5px',
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
    padding: '10px',
    border: '1.5px solid #ff7a00',
    borderRadius: '0',
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
    padding: '10px',
    border: 'none',
    borderRadius: '0',
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
    color: '#64748b',
    marginTop: '16px',
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #002060 0%, #1d4ed8 100%)',
    color: '#fff',
    padding: '12px',
    borderRadius: '0',
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
  },
  customGoogleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    backgroundColor: '#ffffff',
    border: '1.5px solid #cbd5e1',
    borderRadius: '4px',
    padding: '8px 16px',
    color: '#2d3748',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: 'auto',
    alignSelf: 'flex-start',
    transition: 'background-color 0.2s',
  },
  googleIconSvg: {
    marginRight: '2px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '30px 24px',
    width: '380px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    fontFamily: "'Segoe UI', -apple-system, sans-serif",
  },
  modalHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '20px',
  },
  modalTitle: {
    fontSize: '22px',
    fontWeight: '400',
    color: '#202124',
    margin: '0 0 6px 0',
  },
  modalSubtitle: {
    fontSize: '13.5px',
    color: '#5f6368',
    margin: 0,
    textAlign: 'center',
  },
  accountsList: {
    display: 'flex',
    flexDirection: 'column',
    borderTop: '1px solid #e8eaed',
    marginTop: '10px',
  },
  accountRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 10px',
    cursor: 'pointer',
    borderBottom: '1px solid #e8eaed',
    transition: 'background-color 0.2s',
    textAlign: 'left',
  },
  avatarCircle: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    marginRight: '12px',
    flexShrink: 0,
  },
  accountInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  accountName: {
    fontSize: '13.5px',
    fontWeight: '500',
    color: '#3c4043',
  },
  accountEmail: {
    fontSize: '11.5px',
    color: '#5f6368',
  }
};

export default Login;