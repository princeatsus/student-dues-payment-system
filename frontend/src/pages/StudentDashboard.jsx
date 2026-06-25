import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBalance, generatePaymentReference } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const StudentDashboard = () => {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [reference, setReference] = useState(null);
  const [error, setError] = useState('');
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const response = await getBalance();
      setBalance(response.data);
    } catch (err) {
      setError('Failed to load balance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    setPayLoading(true);
    try {
      const response = await generatePaymentReference();
      setReference(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate payment reference.');
    } finally {
      setPayLoading(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    navigate('/');
  };

  if (loading) return <div style={styles.loading}>Loading your dashboard...</div>;

  return (
    <div style={styles.container}>
      {/* Navbar */}
      <div style={styles.navbar}>
        <div>
          <h1 style={styles.navTitle}>HTU Electrical Dues</h1>
        </div>
        <div style={styles.navRight}>
          <span style={styles.navUser}>👋 {user?.full_name}</span>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.content}>
        {error && <div style={styles.error}>{error}</div>}

        {/* Welcome Card */}
        <div style={styles.welcomeCard}>
          <h2 style={styles.welcomeTitle}>Welcome, {balance?.student?.full_name}!</h2>
          <p style={styles.welcomeSub}>
            Level {balance?.student?.level} | {balance?.session?.academic_year} Semester {balance?.session?.semester}
          </p>
        </div>

        {/* Balance Cards */}
        <div style={styles.cardsRow}>
          <div style={{ ...styles.card, borderTop: '4px solid #e53e3e' }}>
            <p style={styles.cardLabel}>Total Dues</p>
            <p style={styles.cardAmount}>{balance?.balance?.total_dues}</p>
          </div>
          <div style={{ ...styles.card, borderTop: '4px solid #38a169' }}>
            <p style={styles.cardLabel}>Total Paid</p>
            <p style={{ ...styles.cardAmount, color: '#38a169' }}>{balance?.balance?.total_paid}</p>
          </div>
          <div style={{ ...styles.card, borderTop: '4px solid #3182ce' }}>
            <p style={styles.cardLabel}>Outstanding</p>
            <p style={{ ...styles.cardAmount, color: '#3182ce' }}>{balance?.balance?.outstanding}</p>
          </div>
        </div>

        {/* Status Badge */}
        <div style={styles.statusContainer}>
          <span style={balance?.balance?.status === 'CLEARED' ? styles.statusCleared : styles.statusOwing}>
            {balance?.balance?.status === 'CLEARED' ? '✅ CLEARED' : '⚠️ OWING'}
          </span>
        </div>

        {/* Pay Button */}
        {balance?.balance?.status === 'OWING' && (
          <div style={styles.paySection}>
            <button
              onClick={handlePay}
              style={payLoading ? { ...styles.payBtn, opacity: 0.7 } : styles.payBtn}
              disabled={payLoading}
            >
              {payLoading ? 'Generating...' : '💳 Pay Dues Now'}
            </button>
          </div>
        )}

        {/* Payment Reference */}
        {reference && (
          <div style={styles.referenceCard}>
            <h3 style={styles.refTitle}>Payment Reference Generated</h3>
            <div style={styles.refCode}>{reference.reference}</div>
            <p style={styles.refAmount}>Amount: {reference.amount}</p>
            <p style={styles.refInstructions}>{reference.instructions}</p>
            <p style={styles.refNote}>
              Show this reference to the accountant or use it when paying via Momo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f7fafc' },
  loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '18px' },
  navbar: {
    backgroundColor: '#1a365d', color: '#fff',
    padding: '16px 24px', display: 'flex',
    justifyContent: 'space-between', alignItems: 'center',
  },
  navTitle: { margin: 0, fontSize: '20px', fontWeight: 'bold' },
  navRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  navUser: { fontSize: '14px' },
  logoutBtn: {
    backgroundColor: 'transparent', border: '1px solid #fff',
    color: '#fff', padding: '6px 14px', borderRadius: '6px',
    cursor: 'pointer', fontSize: '14px',
  },
  content: { maxWidth: '800px', margin: '0 auto', padding: '24px' },
  error: {
    backgroundColor: '#fff5f5', border: '1px solid #feb2b2',
    color: '#c53030', padding: '12px', borderRadius: '8px', marginBottom: '20px',
  },
  welcomeCard: {
    backgroundColor: '#fff', borderRadius: '12px',
    padding: '24px', marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  welcomeTitle: { margin: '0 0 8px 0', color: '#1a365d', fontSize: '22px' },
  welcomeSub: { margin: 0, color: '#718096', fontSize: '14px' },
  cardsRow: { display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' },
  card: {
    flex: 1, minWidth: '150px', backgroundColor: '#fff',
    borderRadius: '12px', padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  cardLabel: { margin: '0 0 8px 0', color: '#718096', fontSize: '13px', fontWeight: '600' },
  cardAmount: { margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#1a365d' },
  statusContainer: { textAlign: 'center', marginBottom: '24px' },
  statusCleared: {
    backgroundColor: '#f0fff4', color: '#276749',
    padding: '10px 24px', borderRadius: '20px',
    fontWeight: 'bold', fontSize: '16px',
    border: '1px solid #9ae6b4',
  },
  statusOwing: {
    backgroundColor: '#fffaf0', color: '#c05621',
    padding: '10px 24px', borderRadius: '20px',
    fontWeight: 'bold', fontSize: '16px',
    border: '1px solid #fbd38d',
  },
  paySection: { textAlign: 'center', marginBottom: '24px' },
  payBtn: {
    backgroundColor: '#2d6a4f', color: '#fff',
    padding: '14px 40px', borderRadius: '8px',
    border: 'none', fontSize: '16px',
    fontWeight: 'bold', cursor: 'pointer',
  },
  referenceCard: {
    backgroundColor: '#ebf8ff', border: '1px solid #90cdf4',
    borderRadius: '12px', padding: '24px', textAlign: 'center',
  },
  refTitle: { margin: '0 0 16px 0', color: '#2c5282', fontSize: '18px' },
  refCode: {
    fontSize: '32px', fontWeight: 'bold', color: '#1a365d',
    backgroundColor: '#fff', padding: '16px', borderRadius: '8px',
    marginBottom: '12px', letterSpacing: '2px',
  },
  refAmount: { fontSize: '18px', fontWeight: 'bold', color: '#2d6a4f', margin: '8px 0' },
  refInstructions: { color: '#2c5282', fontSize: '14px', margin: '8px 0' },
  refNote: { color: '#718096', fontSize: '12px', margin: '8px 0 0 0' },
};

export default StudentDashboard;