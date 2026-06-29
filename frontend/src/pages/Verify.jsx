import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicVerify } from '../utils/api';

const Verify = () => {
  const [indexNumber, setIndexNumber] = useState('');
  const [gradYear, setGradYear] = useState('');
  const [result, setResult] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    if (!indexNumber.match(/^\d{10}$/)) {
      setError('Please enter a valid 10-digit index number.');
      setLoading(false);
      return;
    }

    try {
      const response = await publicVerify(indexNumber, gradYear);
      setResult(response.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setResult({
          cleared: false,
          notFound: true,
          message: 'Status: NOT FOUND. Index number not recognized.'
        });
      } else {
        setError(err.response?.data?.message || 'Verification service failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.cardIcon}>🎓</div>
          <h2 style={styles.cardTitle}>Alumni Verification Portal</h2>
          <p style={styles.cardSubtitle}>Ho Technical University · Electrical Department</p>
        </div>

        {error && <div style={styles.errorBox}>⚠️ {error}</div>}

        <form onSubmit={handleVerify} style={styles.form}>
          <p style={styles.helpText}>
            Enter the graduate's index number and graduation year to verify their departmental financial clearance status.
          </p>

          <div style={styles.inputGroup}>
            <label style={styles.label}>10-Digit Index Number</label>
            <input
              type="text"
              placeholder="e.g. 1234567890"
              maxLength={10}
              value={indexNumber}
              onChange={(e) => setIndexNumber(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Year of Graduation</label>
            <select
              value={gradYear}
              onChange={(e) => setGradYear(e.target.value)}
              style={styles.select}
              required
            >
              <option value="">-- Select Year --</option>
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            style={loading ? { ...styles.submitBtn, opacity: 0.7 } : styles.submitBtn}
            disabled={loading}
          >
            {loading ? '⏳ Verifying...' : 'Verify Clearance Status'}
          </button>
        </form>

        {/* Verification Result Display */}
        {result && (
          <div style={styles.resultContainer}>
            {result.cleared ? (
              <div style={styles.successBox}>
                <div style={styles.watermarkStamp}>
                  APPROVED CLEARANCE
                </div>
                <h4 style={styles.resultHeading}>✓ VERIFICATION SUCCESSFUL</h4>
                <div style={styles.divider} />
                <table style={styles.resultTable}>
                  <tbody>
                    <tr>
                      <td style={styles.tdLabel}>Name:</td>
                      <td style={styles.tdVal}>{result.full_name}</td>
                    </tr>
                    <tr>
                      <td style={styles.tdLabel}>Index Number:</td>
                      <td style={styles.tdVal}><code>{result.index_number}</code></td>
                    </tr>
                    <tr>
                      <td style={styles.tdLabel}>Graduation Year:</td>
                      <td style={styles.tdVal}>{result.graduation_year}</td>
                    </tr>
                  </tbody>
                </table>
                <div style={styles.divider} />
                <p style={styles.statusMsg}>{result.message}</p>
                <div style={styles.privacyNotice}>
                  * Note: Exact payment figures are hidden to protect alumni financial privacy.
                </div>
              </div>
            ) : result.notFound ? (
              <div style={styles.notFoundBox}>
                <h4 style={styles.resultHeadingNotFound}>✗ RECORD NOT FOUND</h4>
                <p style={styles.statusMsg}>{result.message}</p>
              </div>
            ) : (
              <div style={styles.failureBox}>
                <h4 style={styles.resultHeadingNotFound}>⚠️ CLEARANCE NOT AVAILABLE</h4>
                <table style={styles.resultTable}>
                  <tbody>
                    <tr>
                      <td style={styles.tdLabel}>Name:</td>
                      <td style={styles.tdVal}>{result.full_name}</td>
                    </tr>
                    <tr>
                      <td style={styles.tdLabel}>Index Number:</td>
                      <td style={styles.tdVal}><code>{result.index_number}</code></td>
                    </tr>
                  </tbody>
                </table>
                <div style={styles.divider} />
                <p style={styles.statusMsg}>{result.message}</p>
              </div>
            )}
          </div>
        )}

        <div style={styles.backToLoginWrapper}>
          <button onClick={() => navigate('/')} style={styles.backToLoginBtn}>
            ← Back to Student/Staff Login
          </button>
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
    backgroundColor: '#0a2540', // Matches deep navy COMPSSA theme
    backgroundImage: `
      radial-gradient(circle at 10% 20%, rgba(59,130,246,0.15) 0%, transparent 40%),
      radial-gradient(circle at 90% 80%, rgba(59,130,246,0.15) 0%, transparent 40%)
    `,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
  },
  card: {
    backgroundColor: '#fff',
    padding: '40px',
    width: '100%',
    maxWidth: '480px',
    borderRadius: '16px',
    boxShadow: '0 15px 35px rgba(0,0,0,0.3)',
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
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#0a2540',
    margin: '0 0 4px 0',
  },
  cardSubtitle: {
    fontSize: '13px',
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
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  helpText: {
    fontSize: '13px',
    color: '#627d98',
    lineHeight: '1.5',
    margin: '0 0 10px 0',
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
    boxShadow: '0 4px 12px rgba(29, 78, 216, 0.3)',
  },
  resultContainer: {
    marginTop: '28px',
    animation: 'fadeIn 0.3s ease',
  },
  successBox: {
    backgroundColor: '#f0fff4',
    border: '1.5px solid #9ae6b4',
    borderRadius: '12px',
    padding: '24px',
    position: 'relative',
    overflow: 'hidden'
  },
  watermarkStamp: {
    position: 'absolute',
    right: '-10px',
    bottom: '-10px',
    transform: 'rotate(-15deg)',
    opacity: 0.08,
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#276749',
    border: '4px double #276749',
    padding: '8px',
    letterSpacing: '2px',
    pointerEvents: 'none'
  },
  notFoundBox: {
    backgroundColor: '#fff5f5',
    border: '1.5px solid #feb2b2',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center'
  },
  failureBox: {
    backgroundColor: '#fffaf0',
    border: '1.5px solid #fbd38d',
    borderRadius: '12px',
    padding: '20px',
  },
  resultHeading: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    color: '#22543d',
    letterSpacing: '0.5px'
  },
  resultHeadingNotFound: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    color: '#742a2a',
    letterSpacing: '0.5px'
  },
  divider: {
    height: '1px',
    backgroundColor: 'rgba(0,0,0,0.06)',
    margin: '12px 0'
  },
  resultTable: {
    width: '100%',
    fontSize: '13px',
    borderCollapse: 'collapse',
  },
  tdLabel: {
    color: '#718096',
    fontWeight: '500',
    padding: '4px 0',
    width: '120px'
  },
  tdVal: {
    color: '#2d3748',
    fontWeight: '600',
    padding: '4px 0'
  },
  statusMsg: {
    fontSize: '13px',
    lineHeight: '1.5',
    color: '#2d3748',
    margin: '8px 0 0 0'
  },
  privacyNotice: {
    fontSize: '10px',
    color: '#718096',
    marginTop: '12px',
    fontStyle: 'italic'
  },
  backToLoginWrapper: {
    marginTop: '24px',
    textAlign: 'center',
  },
  backToLoginBtn: {
    border: 'none',
    background: 'none',
    color: '#003087',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'underline'
  }
};

export default Verify;
