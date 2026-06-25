import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExpenses, submitExpense, approveExpense, rejectExpense, disburseExpense } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const ExpenseDashboard = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    item_description: '',
    amount: '',
    vendor_name: '',
    purpose_justification: '',
    target_level: '',
    target_class_group: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await getExpenses();
      setExpenses(response.data.expenses || []);
    } catch (err) {
      setError('Failed to load expenses. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await submitExpense(formData);
      setSuccess('Expense request submitted successfully!');
      setShowModal(false);
      setFormData({
        item_description: '',
        amount: '',
        vendor_name: '',
        purpose_justification: '',
        target_level: '',
        target_class_group: '',
      });
      fetchExpenses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveExpense(id);
      setSuccess('Expense approved! Sent to accountant.');
      fetchExpenses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve expense.');
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      await rejectExpense(id, { reason });
      setSuccess('Expense rejected.');
      fetchExpenses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject expense.');
    }
  };

  const handleDisburse = async (id) => {
    try {
      await disburseExpense(id);
      setSuccess('Payment disbursed successfully!');
      fetchExpenses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to disburse payment.');
    }
  };

  const handleLogout = () => {
    logoutUser();
    navigate('/');
  };

  // Determine what actions to show based on role
  const isCourseRep = user?.role === 'COURSE_REP';
  const isHOD = user?.role === 'HOD';
  const isAccountant = user?.role === 'ACCOUNTANT';

  if (loading) return <div style={styles.loading}>Loading expenses...</div>;

  return (
    <div style={styles.container}>
      {/* Navbar */}
      <div style={styles.navbar}>
        <h1 style={styles.navTitle}>💰 Expense Management</h1>
        <div style={styles.navRight}>
          <span style={styles.navUser}>👋 {user?.full_name} ({user?.role})</span>
          {/* Navigation buttons based on role */}
          {isHOD && (
            <button onClick={() => navigate('/hod')} style={styles.navBtn}>📋 HOD Dashboard</button>
          )}
          {isAccountant && (
            <button onClick={() => navigate('/accountant')} style={styles.navBtn}>📊 Accountant Dashboard</button>
          )}
          {isCourseRep && (
            <button onClick={() => navigate('/student')} style={styles.navBtn}>🎓 Student Dashboard</button>
          )}
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </div>

      <div style={styles.content}>
        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        {/* Stats Row */}
        <div style={styles.cardsRow}>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Total Requests</p>
            <p style={styles.statValue}>{expenses.length}</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Pending HOD</p>
            <p style={{ ...styles.statValue, color: '#d69e2e' }}>
              {expenses.filter(e => e.status === 'PENDING_HOD').length}
            </p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Pending Finance</p>
            <p style={{ ...styles.statValue, color: '#3182ce' }}>
              {expenses.filter(e => e.status === 'PENDING_FINANCE').length}
            </p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Disbursed</p>
            <p style={{ ...styles.statValue, color: '#38a169' }}>
              {expenses.filter(e => e.status === 'DISBURSED').length}
            </p>
          </div>
        </div>

        {/* Submit Button (Course Rep only) */}
        {isCourseRep && (
          <button onClick={() => setShowModal(true)} style={styles.submitBtn}>
            + Submit New Expense Request
          </button>
        )}

        {/* Expenses Table */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📋 All Expense Requests</h2>
          {expenses.length === 0 ? (
            <p style={styles.empty}>No expense requests found.</p>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.th}>Item</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Vendor</th>
                    <th style={styles.th}>Level</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Requested By</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp) => (
                    <tr key={exp.id} style={styles.tableRow}>
                      <td style={styles.td}>{exp.item_description}</td>
                      <td style={styles.td}>₵{parseFloat(exp.amount).toFixed(2)}</td>
                      <td style={styles.td}>{exp.vendor_name || '—'}</td>
                      <td style={styles.td}>Level {exp.target_level}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: 
                            exp.status === 'PENDING_HOD' ? '#fefcbf' :
                            exp.status === 'PENDING_FINANCE' ? '#bee3f8' :
                            exp.status === 'DISBURSED' ? '#c6f6d5' :
                            exp.status === 'REJECTED' ? '#fed7d7' : '#e2e8f0',
                          color:
                            exp.status === 'PENDING_HOD' ? '#975a16' :
                            exp.status === 'PENDING_FINANCE' ? '#2a69ac' :
                            exp.status === 'DISBURSED' ? '#276749' :
                            exp.status === 'REJECTED' ? '#9b2c2c' : '#4a5568',
                        }}>
                          {exp.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={styles.td}>{exp.requested_by_name}</td>
                      <td style={styles.td}>
                        {isHOD && exp.status === 'PENDING_HOD' && (
                          <>
                            <button onClick={() => handleApprove(exp.id)} style={{ ...styles.actionBtn, backgroundColor: '#38a169' }}>Approve</button>
                            <button onClick={() => handleReject(exp.id)} style={{ ...styles.actionBtn, backgroundColor: '#e53e3e', marginLeft: '6px' }}>Reject</button>
                          </>
                        )}
                        {isAccountant && exp.status === 'PENDING_FINANCE' && (
                          <button onClick={() => handleDisburse(exp.id)} style={{ ...styles.actionBtn, backgroundColor: '#3182ce' }}>Disburse</button>
                        )}
                        {isCourseRep && exp.status === 'PENDING_HOD' && (
                          <span style={{ fontSize: '12px', color: '#718096' }}>Awaiting HOD</span>
                        )}
                        {isCourseRep && exp.status === 'PENDING_FINANCE' && (
                          <span style={{ fontSize: '12px', color: '#718096' }}>Awaiting Finance</span>
                        )}
                        {exp.status === 'DISBURSED' && (
                          <span style={{ fontSize: '12px', color: '#38a169' }}>✅ Disbursed</span>
                        )}
                        {exp.status === 'REJECTED' && (
                          <span style={{ fontSize: '12px', color: '#e53e3e' }}>❌ Rejected</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal for submitting expense */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Submit Expense Request</h3>
            <form onSubmit={handleSubmit}>
              <div style={styles.modalGroup}>
                <label style={styles.modalLabel}>Item Description *</label>
                <input
                  type="text"
                  name="item_description"
                  value={formData.item_description}
                  onChange={handleChange}
                  placeholder="e.g., 5x Arduino Kits"
                  style={styles.modalInput}
                  required
                />
              </div>
              <div style={styles.modalGroup}>
                <label style={styles.modalLabel}>Amount (₵) *</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="850"
                  style={styles.modalInput}
                  required
                />
              </div>
              <div style={styles.modalGroup}>
                <label style={styles.modalLabel}>Vendor Name</label>
                <input
                  type="text"
                  name="vendor_name"
                  value={formData.vendor_name}
                  onChange={handleChange}
                  placeholder="ElectroLab Ghana"
                  style={styles.modalInput}
                />
              </div>
              <div style={styles.modalGroup}>
                <label style={styles.modalLabel}>Purpose Justification *</label>
                <textarea
                  name="purpose_justification"
                  value={formData.purpose_justification}
                  onChange={handleChange}
                  placeholder="Required for final year project exhibition..."
                  style={styles.modalTextarea}
                  rows="3"
                  required
                />
              </div>
              <div style={styles.modalGroup}>
                <label style={styles.modalLabel}>Target Level *</label>
                <select
                  name="target_level"
                  value={formData.target_level}
                  onChange={handleChange}
                  style={styles.modalSelect}
                  required
                >
                  <option value="">Select Level</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                  <option value="300">300</option>
                  <option value="400">400</option>
                </select>
              </div>
              <div style={styles.modalGroup}>
                <label style={styles.modalLabel}>Target Class Group</label>
                <input
                  type="text"
                  name="target_class_group"
                  value={formData.target_class_group}
                  onChange={handleChange}
                  placeholder="A"
                  style={styles.modalInput}
                />
              </div>
              <div style={styles.modalActions}>
                <button type="button" onClick={() => setShowModal(false)} style={styles.modalCancel}>
                  Cancel
                </button>
                <button
                  type="submit"
                  style={submitting ? { ...styles.modalConfirm, opacity: 0.6 } : styles.modalConfirm}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
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
  navBtn: {
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
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
  },
  submitBtn: {
    backgroundColor: '#2d6a4f',
    color: '#fff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '24px',
    transition: 'background 0.2s',
  },
  actionBtn: {
    color: '#fff',
    border: 'none',
    padding: '4px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
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
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalTitle: { margin: '0 0 16px 0', color: '#1a365d' },
  modalGroup: { margin: '12px 0' },
  modalLabel: { display: 'block', fontSize: '14px', fontWeight: '600', color: '#2d3748', marginBottom: '4px' },
  modalInput: {
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
  },
  modalTextarea: {
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    resize: 'vertical',
  },
  modalSelect: {
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    backgroundColor: '#fff',
  },
  modalActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' },
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

export default ExpenseDashboard;