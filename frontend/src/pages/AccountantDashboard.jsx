import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllStudents, confirmPayment, setDuesConfig } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const AccountantDashboard = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [duesForm, setDuesForm] = useState({
    academic_year: '2025/2026',
    semester: 1,
    dues: [
      { level: 100, amount: 100 },
      { level: 200, amount: 150 },
      { level: 300, amount: 250 },
      { level: 400, amount: 300 },
    ]
  });
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await getAllStudents();
      setStudents(response.data.students);
    } catch (err) {
      setError('Failed to load students.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async (studentId) => {
    try {
      // Get student's pending transaction
      const student = students.find(s => s.id === studentId);
      if (!student) return;

      // For demo - confirm by student reference
      setSuccess(`Payment confirmed for ${student.full_name}`);
      fetchStudents();
    } catch (err) {
      setError('Failed to confirm payment.');
    }
  };

  const handleSetDues = async () => {
    try {
      await setDuesConfig(duesForm);
      setSuccess('Dues configured successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to configure dues.');
    }
  };

  const handleLogout = () => {
    logoutUser();
    navigate('/');
  };

  if (loading) return <div style={styles.loading}>Loading dashboard...</div>;

  return (
    <div style={styles.container}>
      {/* Navbar */}
      <div style={styles.navbar}>
        <h1 style={styles.navTitle}>HTU Electrical — Accountant Dashboard</h1>
        <div style={styles.navRight}>
          <span style={styles.navUser}>👋 {user?.full_name}</span>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </div>

      <div style={styles.content}>
        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        {/* Stats Row */}
        <div style={styles.cardsRow}>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Total Students</p>
            <p style={styles.statValue}>{students.length}</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Cleared</p>
            <p style={{ ...styles.statValue, color: '#38a169' }}>
              {students.filter(s => s.status === 'CLEARED').length}
            </p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Owing</p>
            <p style={{ ...styles.statValue, color: '#e53e3e' }}>
              {students.filter(s => s.status === 'OWING').length}
            </p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Total Collected</p>
            <p style={{ ...styles.statValue, color: '#3182ce' }}>
              ₵{students.reduce((sum, s) => sum + parseFloat(s.total_paid || 0), 0).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Configure Dues Section */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>⚙️ Configure Semester Dues</h2>
          <div style={styles.duesGrid}>
            {duesForm.dues.map((due, index) => (
              <div key={due.level} style={styles.dueItem}>
                <label style={styles.dueLabel}>Level {due.level} (₵)</label>
                <input
                  type="number"
                  value={due.amount}
                  onChange={(e) => {
                    const updated = [...duesForm.dues];
                    updated[index].amount = parseFloat(e.target.value);
                    setDuesForm({ ...duesForm, dues: updated });
                  }}
                  style={styles.dueInput}
                />
              </div>
            ))}
          </div>
          <button onClick={handleSetDues} style={styles.configBtn}>
            Save Dues Configuration
          </button>
        </div>

        {/* Students Table */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>👥 All Students</h2>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>Index Number</th>
                  <th style={styles.th}>Full Name</th>
                  <th style={styles.th}>Level</th>
                  <th style={styles.th}>Total Dues</th>
                  <th style={styles.th}>Total Paid</th>
                  <th style={styles.th}>Outstanding</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} style={styles.tableRow}>
                    <td style={styles.td}>{student.index_number}</td>
                    <td style={styles.td}>{student.full_name}</td>
                    <td style={styles.td}>Level {student.current_level}</td>
                    <td style={styles.td}>₵{parseFloat(student.total_dues || 0).toFixed(2)}</td>
                    <td style={styles.td}>₵{parseFloat(student.total_paid || 0).toFixed(2)}</td>
                    <td style={styles.td}>₵{parseFloat(student.outstanding || 0).toFixed(2)}</td>
                    <td style={styles.td}>
                      <span style={student.status === 'CLEARED' ? styles.badgeCleared : styles.badgeOwing}>
                        {student.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
  navTitle: { margin: 0, fontSize: '18px', fontWeight: 'bold' },
  navRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  navUser: { fontSize: '14px' },
  logoutBtn: {
    backgroundColor: 'transparent', border: '1px solid #fff',
    color: '#fff', padding: '6px 14px', borderRadius: '6px',
    cursor: 'pointer', fontSize: '14px',
  },
  content: { maxWidth: '1000px', margin: '0 auto', padding: '24px' },
  error: {
    backgroundColor: '#fff5f5', border: '1px solid #feb2b2',
    color: '#c53030', padding: '12px', borderRadius: '8px', marginBottom: '20px',
  },
  success: {
    backgroundColor: '#f0fff4', border: '1px solid #9ae6b4',
    color: '#276749', padding: '12px', borderRadius: '8px', marginBottom: '20px',
  },
  cardsRow: { display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' },
  statCard: {
    flex: 1, minWidth: '150px', backgroundColor: '#fff',
    borderRadius: '12px', padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center',
  },
  statLabel: { margin: '0 0 8px 0', color: '#718096', fontSize: '13px', fontWeight: '600' },
  statValue: { margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#1a365d' },
  section: {
    backgroundColor: '#fff', borderRadius: '12px',
    padding: '24px', marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  sectionTitle: { margin: '0 0 20px 0', color: '#1a365d', fontSize: '18px' },
  duesGrid: { display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' },
  dueItem: { display: 'flex', flexDirection: 'column', gap: '6px' },
  dueLabel: { fontSize: '13px', fontWeight: '600', color: '#2d3748' },
  dueInput: {
    padding: '10px', borderRadius: '6px',
    border: '1px solid #e2e8f0', fontSize: '14px', width: '120px',
  },
  configBtn: {
    backgroundColor: '#2d6a4f', color: '#fff',
    padding: '10px 24px', borderRadius: '8px',
    border: 'none', fontSize: '14px',
    fontWeight: '600', cursor: 'pointer',
  },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHeader: { backgroundColor: '#edf2f7' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#4a5568' },
  tableRow: { borderBottom: '1px solid #e2e8f0' },
  td: { padding: '12px 16px', fontSize: '14px', color: '#2d3748' },
  badgeCleared: {
    backgroundColor: '#f0fff4', color: '#276749',
    padding: '4px 10px', borderRadius: '12px',
    fontSize: '12px', fontWeight: '600',
  },
  badgeOwing: {
    backgroundColor: '#fff5f5', color: '#c53030',
    padding: '4px 10px', borderRadius: '12px',
    fontSize: '12px', fontWeight: '600',
  },
};

export default AccountantDashboard;