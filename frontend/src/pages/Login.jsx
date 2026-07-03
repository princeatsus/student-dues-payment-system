import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import htuLogo from '../assets/sdms_logo.png';
import htuCampus from '../assets/htu_campus.png';

// We can define pre-configured presets to make live hackathon demos seamless
const Login = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
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
    if (googleScriptLoaded) {
      try {
        /* global google */
        if (typeof google !== 'undefined') {
          const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '9876543210-mockclientid.apps.googleusercontent.com';
          google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleLoginResponse
          });
          const btnParent = document.getElementById('google-signin-btn');
          if (btnParent) {
            google.accounts.id.renderButton(
              btnParent,
              { theme: 'outline', size: 'large', width: '100%', text: 'signin_with' }
            );
          }
        } else {
          setError('Authentication Service Unavailable. Please try again in 5 minutes. If the issue persists, contact IT Support.');
        }
      } catch (err) {
        console.error('Google Sign In Init Error:', err);
        setError('Authentication Service Unavailable. Please try again in 5 minutes. If the issue persists, contact IT Support.');
      }
    }
  }, [googleScriptLoaded]);

  const handleGoogleLoginResponse = async (googleResponse) => {
    setLoading(true);
    setError('');
    try {
      const response = await login({
        credential: googleResponse.credential
      });
      handleAuthSuccess(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication Service Unavailable. Please try again in 5 minutes. If the issue persists, contact IT Support.');
    } finally {
      setLoading(false);
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
    else if (user.role === 'ADMIN') navigate('/accountant');
    else navigate('/');
  };

  return (
    <div style={styles.page}>
      {/* Centered Login Card Container */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, width: '100%', maxWidth: '580px' }}>
        <div style={styles.card}>
          
          {/* Top Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            <div style={styles.cardHeader}>
              <img src={htuLogo} alt="HTU Logo" style={styles.logoImage} />
            </div>

            {error && (
              <div style={styles.errorBox}>
                ⚠️ {error}
              </div>
            )}

            {/* Main Login Card - Enforces real Google OAuth */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={styles.dividerLine} />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '100%' }}>
                <div style={{ fontSize: '15px', color: '#1e293b', fontWeight: '600', alignSelf: 'flex-start' }}>
                  Log in using your official HTU email account:
                </div>
                
                <div id="google-signin-btn" style={{ width: '100%', minHeight: '44px', marginTop: '8px' }}></div>
              </div>
            </div>
          </div>

          {/* Bottom Section (Cookies notice) */}
          <div style={styles.cookiesNotice}>
            <a href="#cookies" style={styles.cookiesLink}>COOKIES NOTICE</a>
          </div>

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
    display: 'none',
  },
  card: {
    backgroundColor: '#fff',
    padding: '45px 50px 30px 50px',
    width: '100%',
    maxWidth: '580px',
    minHeight: '440px',
    borderRadius: '0',
    boxShadow: '0 15px 35px rgba(0,0,0,0.15)',
    zIndex: 2,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
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