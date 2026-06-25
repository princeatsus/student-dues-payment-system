import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDefaulters, grantOverride, getAllOverrides } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const HODDashboard = () => {
  const [defaulters, setDefaulters] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [defRes, ovRes] = await Promise.all([
        getDefaulters(),
        getAllOverrides(),
      ]);
      setDefaulters(defRes.data.defaulters || []);
      setOverrides(ovRes.data.overrides || []);
    } catch (err) {
      setError('Failed to load data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (student) => {
    setSelectedStudent(student);
    setReason('');
    setShowModal(true);
  };

  const handleGrantOverride = async () => {
    if (!reason || reason.length < 10) {
      setError('Reason must be at least 10 characters.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await grantOverride({
        student_id: selectedStudent.id,
        reason: reason,
      });
      setSuccess(`Override granted for ${selectedStudent.full_name}`);
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to grant override.');
    } finally {
      setSubmitting(false);
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
        <h1 style={styles.navTitle}>HTU Electrical — HOD Dashboard</h1>
        <div style={styles.navRight}>
          <span style={styles.navUser}>👋 {user?.full_name}</span>
          {/* NEW: Expense navigation button */}
          <button onClick={() => navigate('/expenses')} style={styles.navBtn}>💰 Expenses</button>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </div>

      <div style={styles.content}>
        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        {/* Stats Row */}
        <div style={styles.cardsRow}>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Total Defaulters</p>
            <p style={styles.statValue}>{defaulters.length}</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Active Overrides</p>
            <p style={{ ...styles.statValue, color: '#38a169' }}>{overrides.length}</p>
          </div>
        </div>

        {/* Defaulters Table */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📋 Defaulters List</h2>
          {defaulters.length === 0 ? (
            <p style={styles.empty}>✅ No defaulters — all students are cleared!</p>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.th}>Index</th>
                    <th style={styles.th}>Full Name</th>
                    <th style={styles.th}>Level</th>
                    <th style={styles.th}>Outstanding</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {defaulters.map((student) => (
                    <tr key={student.id} style={styles.tableRow}>
                      <td style={styles.td}>{student.index_number}</td>
                      <td style={styles.td}>{student.full_name}</td>
                      <td style={styles.td}>Level {student.current_level}</td>
                      <td style={styles.td}>₵{parseFloat(student.outstanding || 0).toFixed(2)}</td>
                      <td style={styles.td}>
                        <button
                          onClick={() => handleOpenModal(student)}
                          style={styles.overrideBtn}
                        >
                          Grant Override
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Active Overrides */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📌 Active Overrides</h2>
          {overrides.length === 0 ? (
            <p style={styles.empty}>No active overrides at this time.</p>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.th}>Student</th>
                    <th style={styles.th}>Index</th>
                    <th style={styles.th}>Reason</th>
                    <th style={styles.th}>Granted By</th>
                    <th style={styles.th}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {overrides.map((ov) => (
                    <tr key={ov.id} style={styles.tableRow}>
                      <td style={styles.td}>{ov.student_name}</td>
                      <td style={styles.td}>{ov.index_number}</td>
                      <td style={styles.td}>{ov.reason}</td>
                      <td style={styles.td}>{ov.overridden_by_name}</td>
                      <td style={styles.td}>{new Date(ov.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal for Override */}
      {showModal && selectedStudent && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Grant Exam Clearance Override</h3>
            <p style={styles.modalSub}>
              Student: <strong>{selectedStudent.full_name}</strong> ({selectedStudent.index_number})
            </p>
            <p style={styles.modalSub}>
              Outstanding: ₵{parseFloat(selectedStudent.outstanding || 0).toFixed(2)}
            </p>
            <div style={styles.modalGroup}>
              <label style={styles.modalLabel}>Reason for Override (required)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Student lost father, financial hardship..."
                style={styles.modalTextarea}
                rows="4"
              />
            </div>
            <div style={styles.modalActions}>
              <button onClick={() => setShowModal(false)} style={styles.modalCancel}>
                Cancel
              </button>
              <button
                onClick={handleGrantOverride}
                style={submitting ? { ...styles.modalConfirm, opacity: 0.6 } : styles.modalConfirm}
                disabled={submitting}
              >
                {submitting ? 'Granting...' : 'Grant Override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f7fafc' },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px',
  },
  navbar: {
    backgroundColor: '#1a365d',
    color: '#fff',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navTitle: { margin: 0, fontSize: '18px', fontWeight: 'bold' },
  navRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  navUser: { fontSize: '14px' },
  navBtn: {  // NEW style
    backgroundColor: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.3)',
    color: '#fff',
    padding: '6px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background 0.2s',
  },
  logoutBtn: {
    backgroundColor: 'transparent',
    border: '1px solid #fff',
    color: '#fff',
    padding: '6px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  content: { maxWidth: '1000px', margin: '0 auto', padding: '24px' },
  error: {
    backgroundColor: '#fff5f5',
    border: '1px solid #fed7d7',
    color: '#c53030',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  success: {
    backgroundColor: '#f0fff4',
    border: '1px solid #9ae6b4',
    color: '#276749',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  cardsRow: { display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' },
  statCard: {
    flex: 1,
    minWidth: '150px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    textAlign: 'center',
  },
  statLabel: { margin: '0 0 8px 0', color: '#718096', fontSize: '13px', fontWeight: '600' },
  statValue: { margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#1a365d' },
  section: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  sectionTitle: { margin: '0 0 20px 0', color: '#1a365d', fontSize: '18px' },
  empty: { color: '#718096', fontSize: '14px' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHeader: { backgroundColor: '#edf2f7' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#4a5568' },
  tableRow: { borderBottom: '1px solid #e2e8f0' },
  td: { padding: '12px 16px', fontSize: '14px', color: '#2d3748' },
  overrideBtn: {
    backgroundColor: '#2d6a4f',
    color: '#fff',
    border: 'none',
    padding: '6px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  },
  modalTitle: { margin: '0 0 8px 0', color: '#1a365d' },
  modalSub: { margin: '4px 0', color: '#2d3748', fontSize: '14px' },
  modalGroup: { margin: '16px 0' },
  modalLabel: { display: 'block', fontSize: '14px', fontWeight: '600', color: '#2d3748', marginBottom: '6px' },
  modalTextarea: {
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    resize: 'vertical',
  },
  modalActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
  modalCancel: {
    backgroundColor: '#e2e8f0',
    color: '#2d3748',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  modalConfirm: {
    backgroundColor: '#2d6a4f',
    color: '#fff',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
};

export default HODDashboard;