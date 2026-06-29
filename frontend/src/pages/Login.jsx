import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../utils/api';
import { useAuth } from '../context/AuthContext';

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

  const [mockEmail, setMockEmail] = useState(PRESETS[0].email);
  const [mockName, setMockName] = useState(PRESETS[0].name);
  const [mockRole, setMockRole] = useState(PRESETS[0].role);
  const [mockLevel, setMockLevel] = useState(PRESETS[0].level);
  const [mockClassGroup, setMockClassGroup] = useState(PRESETS[0].classGroup);

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

  const handleMockLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await login({
        isMock: true,
        mockEmail,
        mockName,
        mockRole,
        mockLevel: parseInt(mockLevel),
        mockClassGroup
      });
      handleAuthSuccess(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Mock login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handlePresetSelect = (preset) => {
    setMockEmail(preset.email);
    setMockName(preset.name);
    setMockRole(preset.role);
    setMockLevel(preset.level);
    setMockClassGroup(preset.classGroup);
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
    <div style={{ ...styles.page, flexDirection: isMobile ? 'column' : 'row' }}>
      {/* Left Panel */}
      {!isMobile && (
        <div style={styles.leftPanel}>
          <div style={styles.leftContent}>
            <div style={styles.badgeRow}>
              <span style={styles.deptBadge}>🎓 COMPSSA · HTU</span>
            </div>
            <h1 style={styles.leftTitle}>Ho Technical University</h1>
            <h2 style={styles.leftSubtitle}>Department of Computer Science</h2>
            <p style={styles.tagline}>— Excellence in Technology & Innovation —</p>
            <div style={styles.divider} />
            <p style={styles.leftDesc}>
              Secured Student Dues Payment & Expense Management System
            </p>
            
            <div style={styles.featureList}>
              <div style={styles.feature}>🔒 Restricted to @indexnumber.htu.edu.gh domains</div>
              <div style={styles.feature}>📊 Real-time class dues collections & audits</div>
              <div style={styles.feature}>💳 Simulated MoMo prompt and reference generator</div>
              <div style={styles.feature}>📄 Secure watermarked departmental clearance slips</div>
            </div>

            <div style={styles.hackathonBadge}>
              ⚡ COMPSSA Hackathon 2026 Submission
            </div>
          </div>
          <div style={styles.leftFooterGroup}>
            <p style={styles.leftFooter}>Computer Science Dept © 2026</p>
          </div>
        </div>
      )}

      {/* Right Panel */}
      <div style={{ ...styles.rightPanel, padding: isMobile ? '16px' : '40px' }}>
        <div style={{ ...styles.card, padding: isMobile ? '24px 16px' : '40px' }}>
          <div style={styles.cardHeader}>
            <div style={styles.cardIcon}>🛡️</div>
            <h2 style={styles.cardTitle}>Secured Portal Login</h2>
            <p style={styles.cardSubtitle}>University OAuth Identity Gateway</p>
          </div>

          {error && (
            <div style={styles.errorBox}>
              ⚠️ {error}
            </div>
          )}

          {/* Mode Switcher */}
          {showDemoSwitcher && (
            <div style={styles.modeTabs}>
              <button 
                style={{ ...styles.tab, ...(isDeveloperMode ? {} : styles.activeTab) }}
                onClick={() => { setIsDeveloperMode(false); setError(''); }}
              >
                Google Auth
              </button>
              <button 
                style={{ ...styles.tab, ...(isDeveloperMode ? styles.activeTab : {}) }}
                onClick={() => { setIsDeveloperMode(true); setError(''); }}
              >
                🔧 Demo Mock Mode
              </button>
            </div>
          )}

          {!isDeveloperMode ? (
            <div style={styles.oauthContainer}>
              <p style={styles.oauthNote}>
                Log in securely using your official HTU student or staff Google account.
              </p>
              
              <div id="google-signin-btn" style={styles.googleBtn}></div>
              
              <div style={styles.domainWarning}>
                Only domains ending in <code>indexnumber.htu.edu.gh</code> or <code>htu.edu.gh</code> will be authorized.
              </div>
            </div>
          ) : !isMockUnlocked ? (
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

              <button
                type="submit"
                style={styles.submitBtn}
              >
                Unlock Demo Presets →
              </button>
            </form>
          ) : (
            <form onSubmit={handleMockLoginSubmit} style={styles.form}>
              <p style={styles.mockHelpText}>
                Select a preset below to instantly simulate logging in as any role for the hackathon pitch:
              </p>

              {/* Presets List */}
              <div style={styles.presetsGrid}>
                {PRESETS.map((preset, index) => (
                  <button
                    key={index}
                    type="button"
                    style={{
                      ...styles.presetBtn,
                      ...(mockEmail === preset.email ? styles.activePresetBtn : {})
                    }}
                    onClick={() => handlePresetSelect(preset)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div style={styles.dividerLine} />

              <div style={styles.inputGroup}>
                <label style={styles.label}>Full Name</label>
                <input
                  type="text"
                  value={mockName}
                  onChange={(e) => setMockName(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Email Address</label>
                <input
                  type="email"
                  value={mockEmail}
                  onChange={(e) => setMockEmail(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.row}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>System Role</label>
                  <select
                    value={mockRole}
                    onChange={(e) => setMockRole(e.target.value)}
                    style={styles.select}
                  >
                    <option value="STUDENT">Student</option>
                    <option value="COURSE_REP">Course Rep</option>
                    <option value="ACCOUNTANT">Accountant</option>
                    <option value="HOD">HOD</option>
                  </select>
                </div>

                {mockRole === 'STUDENT' && (
                  <>
                    <div style={{ ...styles.inputGroup, width: '90px' }}>
                      <label style={styles.label}>Level</label>
                      <select
                        value={mockLevel}
                        onChange={(e) => setMockLevel(e.target.value)}
                        style={styles.select}
                      >
                        <option value="100">100</option>
                        <option value="200">200</option>
                        <option value="300">300</option>
                        <option value="400">400</option>
                      </select>
                    </div>

                    <div style={{ ...styles.inputGroup, width: '90px' }}>
                      <label style={styles.label}>Group</label>
                      <select
                        value={mockClassGroup}
                        onChange={(e) => setMockClassGroup(e.target.value)}
                        style={styles.select}
                      >
                        <option value="A">Class A</option>
                        <option value="B">Class B</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              <button
                type="submit"
                style={loading ? { ...styles.submitBtn, opacity: 0.7 } : styles.submitBtn}
                disabled={loading}
              >
                {loading ? '⏳ Logging in...' : 'Sign In as Mock Persona →'}
              </button>
            </form>
          )}

          <div style={styles.footerNote}>
            🔒 Secured with AES-256 Database Encryption.
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
    fontFamily: "'Segoe UI', -apple-system, sans-serif",
    backgroundColor: '#f4f6fc',
  },
  leftPanel: {
    flex: 1.1,
    background: 'linear-gradient(135deg, #0a2540 0%, #003087 100%)',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '50px 40px',
    position: 'relative',
  },
  leftContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  badgeRow: {
    marginBottom: '10px'
  },
  deptBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: '6px 14px',
    borderRadius: '30px',
    fontSize: '13px',
    fontWeight: 'bold',
    letterSpacing: '0.5px'
  },
  leftTitle: {
    fontSize: '32px',
    fontWeight: 'bold',
    margin: '10px 0 0 0',
  },
  leftSubtitle: {
    fontSize: '20px',
    fontWeight: '400',
    margin: '0',
    opacity: 0.9,
  },
  tagline: {
    fontSize: '13px',
    fontWeight: '300',
    opacity: 0.7,
    margin: '-4px 0 0 0',
    fontStyle: 'italic',
  },
  divider: {
    width: '60px',
    height: '4px',
    backgroundColor: '#3b82f6',
    margin: '10px 0',
  },
  leftDesc: {
    fontSize: '15px',
    opacity: 0.85,
    margin: '0 0 20px 0',
    lineHeight: '1.6',
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  feature: {
    fontSize: '13px',
    opacity: 0.9,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderLeft: '4px solid #3b82f6',
    padding: '10px 14px',
    borderRadius: '0 6px 6px 0',
  },
  hackathonBadge: {
    marginTop: '30px',
    backgroundColor: '#1d4ed8',
    color: '#fff',
    alignSelf: 'flex-start',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 'bold',
    boxShadow: '0 4px 12px rgba(29, 78, 216, 0.4)'
  },
  leftFooterGroup: {
    marginTop: '40px'
  },
  leftFooter: {
    fontSize: '12px',
    opacity: 0.5,
    margin: 0,
  },
  rightPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
  },
  card: {
    backgroundColor: '#fff',
    padding: '40px',
    width: '100%',
    maxWidth: '460px',
    borderRadius: '16px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
  },
  cardHeader: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  cardIcon: {
    fontSize: '44px',
    marginBottom: '8px',
  },
  cardTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#0a2540',
    margin: '0 0 4px 0',
  },
  cardSubtitle: {
    fontSize: '14px',
    color: '#627d98',
    margin: 0,
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
  },
  modeTabs: {
    display: 'flex',
    backgroundColor: '#f0f4f8',
    padding: '4px',
    borderRadius: '10px',
    marginBottom: '24px',
  },
  tab: {
    flex: 1,
    border: 'none',
    background: 'none',
    padding: '10px',
    fontSize: '13px',
    fontWeight: '600',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#627d98',
    transition: 'all 0.2s',
  },
  activeTab: {
    backgroundColor: '#fff',
    color: '#003087',
    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
  },
  oauthContainer: {
    textAlign: 'center',
    padding: '10px 0',
  },
  oauthNote: {
    fontSize: '14px',
    color: '#486581',
    lineHeight: '1.5',
    marginBottom: '24px',
  },
  googleBtn: {
    minHeight: '44px',
    marginBottom: '24px',
  },
  domainWarning: {
    fontSize: '11px',
    color: '#829ab1',
    backgroundColor: '#f0f4f8',
    padding: '8px 12px',
    borderRadius: '6px',
    lineHeight: '1.4',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  mockHelpText: {
    fontSize: '12px',
    color: '#627d98',
    margin: '0 0 -8px 0',
  },
  presetsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginBottom: '10px',
  },
  presetBtn: {
    padding: '8px',
    border: '1px solid #d9e2ec',
    borderRadius: '8px',
    backgroundColor: '#fff',
    fontSize: '11px',
    color: '#334e68',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  activePresetBtn: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    fontWeight: '600',
  },
  dividerLine: {
    height: '1px',
    backgroundColor: '#eaeaea',
    margin: '4px 0',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#334e68',
  },
  input: {
    padding: '10px 14px',
    border: '1.5px solid #d9e2ec',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    color: '#102a43',
    '&:focus': {
      borderColor: '#3b82f6',
    }
  },
  select: {
    padding: '10px 14px',
    border: '1.5px solid #d9e2ec',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#fff',
    color: '#102a43',
  },
  row: {
    display: 'flex',
    gap: '12px',
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #003087 0%, #1d4ed8 100%)',
    color: '#fff',
    padding: '14px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '10px',
    transition: 'opacity 0.2s',
  },
  footerNote: {
    textAlign: 'center',
    fontSize: '11px',
    color: '#bcccdc',
    marginTop: '24px',
  }
};

export default Login;