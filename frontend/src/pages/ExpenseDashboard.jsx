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
  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [selectedDisburseId, setSelectedDisburseId] = useState(null);
  
  // File Preview Modal
  const [previewImage, setPreviewImage] = useState(null);

  const [formData, setFormData] = useState({
    item_description: '',
    amount: '',
    vendor_name: '',
    purpose_justification: '',
    target_level: '',
    target_class_group: '',
    attachment_url: '' // Base64 image
  });
  const [disbursementProof, setDisbursementProof] = useState('');

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

  // Convert files to Base64 with a 2MB size check (NFR-PERF-03)
  const handleFileChange = (e, isDisbursement = false) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('⚠️ File size exceeds 2MB limit. Please upload a smaller receipt/invoice.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (isDisbursement) {
        setDisbursementProof(event.target.result);
      } else {
        setFormData(prev => ({ ...prev, attachment_url: event.target.result }));
      }
    };
    reader.readAsDataURL(file);
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
        attachment_url: ''
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

  const handleOpenDisburseModal = (id) => {
    setSelectedDisburseId(id);
    setDisbursementProof('');
    setShowDisburseModal(true);
  };

  const handleConfirmDisbursement = async (e) => {
    e.preventDefault();
    if (!disbursementProof) {
      alert('Please upload the scanned receipt voucher first.');
      return;
    }
    setSubmitting(true);
    try {
      await disburseExpense(selectedDisburseId, {
        disbursement_proof_url: disbursementProof
      });
      setSuccess('Payment disbursed and receipt voucher logged successfully!');
      setShowDisburseModal(false);
      fetchExpenses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to disburse payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    navigate('/');
  };

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
          {isHOD && (
            <button onClick={() => navigate('/hod')} style={styles.navBtn}>📋 HOD Dashboard</button>
          )}
          {isAccountant && (
            <button onClick={() => navigate('/accountant')} style={styles.navBtn}>📊 Accountant Dashboard</button>
          )}
          {isCourseRep && (
            <>
              <button onClick={() => navigate('/roster')} style={styles.navBtn}>📋 Class Roster</button>
              <button onClick={() => navigate('/student')} style={styles.navBtn}>🎓 Student Dashboard</button>
            </>
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
                    <th style={styles.th}>Quote</th>
                    <th style={styles.th}>Voucher</th>
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
                      
                      {/* Quote Attachment */}
                      <td style={styles.td}>
                        {exp.attachment_url ? (
                          <button onClick={() => setPreviewImage(exp.attachment_url)} style={styles.previewBtn}>
                            📄 View
                          </button>
                        ) : 'None'}
                      </td>

                      {/* Disbursement Proof */}
                      <td style={styles.td}>
                        {exp.disbursement_proof_url ? (
                          <button onClick={() => setPreviewImage(exp.disbursement_proof_url)} style={styles.previewBtn}>
                            📄 Receipt
                          </button>
                        ) : 'None'}
                      </td>

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
                          <button onClick={() => handleOpenDisburseModal(exp.id)} style={{ ...styles.actionBtn, backgroundColor: '#3182ce' }}>Disburse</button>
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
                  placeholder="Required for project exhibition..."
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
              
              {/* File Attachment Upload (Quote) */}
              <div style={styles.modalGroup}>
                <label style={styles.modalLabel}>Upload Quote/Invoice Image *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, false)}
                  style={styles.modalInput}
                  required
                />
                <span style={styles.fileHelp}>Max Size: 2MB. Image files only.</span>
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

      {/* Modal for disbursement upload */}
      {showDisburseModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Complete Disbursement</h3>
            <p style={styles.modalSub}>Upload signed receipt voucher before releasing cash.</p>
            <form onSubmit={handleConfirmDisbursement}>
              <div style={styles.modalGroup}>
                <label style={styles.modalLabel}>Upload Scanned Receipt Voucher *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, true)}
                  style={styles.modalInput}
                  required
                />
                <span style={styles.fileHelp}>Max Size: 2MB. Image files only.</span>
              </div>
              <div style={styles.modalActions}>
                <button type="button" onClick={() => setShowDisburseModal(false)} style={styles.modalCancel}>
                  Cancel
                </button>
                <button
                  type="submit"
                  style={submitting ? { ...styles.modalConfirm, opacity: 0.6 } : styles.modalConfirm}
                  disabled={submitting}
                >
                  {submitting ? 'Confirming...' : 'Disburse Cash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inline Image Preview Modal */}
      {previewImage && (
        <div style={styles.modalOverlay} onClick={() => setPreviewImage(null)}>
          <div style={styles.previewCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.previewHeader}>
              <span>Attachment View</span>
              <button onClick={() => setPreviewImage(null)} style={styles.closePreviewBtn}>×</button>
            </div>
            <img src={previewImage} alt="Attachment Quote/Voucher" style={styles.previewImg} />
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f0f4f8' },
  loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '15px', color: '#003087', fontWeight: 'bold' },
  navbar: {
    backgroundColor: '#0a2540', color: '#fff',
    padding: '16px 30px', display: 'flex',
    justifyContent: 'space-between', alignItems: 'center',
  },
  navTitle: { margin: 0, fontSize: '18px', fontWeight: 'bold' },
  navRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  navUser: { fontSize: '13px' },
  navBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
    padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', marginRight: '6px'
  },
  logoutBtn: {
    backgroundColor: 'transparent', border: '1px solid #fff',
    color: '#fff', padding: '6px 14px', borderRadius: '6px',
    cursor: 'pointer', fontSize: '12px',
  },
  content: { maxWidth: '1100px', margin: '0 auto', padding: '30px' },
  error: {
    backgroundColor: '#fff5f5', border: '1px solid #feb2b2',
    color: '#c53030', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px'
  },
  success: {
    backgroundColor: '#f0fff4', border: '1px solid #c6f6d5',
    color: '#22543d', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px'
  },
  cardsRow: { display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' },
  statCard: {
    flex: 1, minWidth: '160px', backgroundColor: '#fff', borderRadius: '12px', padding: '20px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
  },
  statLabel: { margin: '0 0 6px 0', color: '#627d98', fontSize: '12px', fontWeight: '600' },
  statValue: { margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#0a2540' },
  submitBtn: {
    backgroundColor: '#003087', color: '#fff', padding: '12px 24px', borderRadius: '8px',
    border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', marginBottom: '24px'
  },
  section: { backgroundColor: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' },
  sectionTitle: { margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold', color: '#0a2540' },
  empty: { fontStyle: 'italic', color: '#a0aec0', fontSize: '13px' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  tableHeader: { borderBottom: '2.5px solid #e2e8f0', backgroundColor: '#f7fafc' },
  th: { padding: '12px 16px', color: '#4a5568', fontWeight: 'bold', textAlign: 'left' },
  tableRow: { borderBottom: '1px solid #f0f4f8' },
  td: { padding: '12px 16px', color: '#2d3748' },
  previewBtn: {
    backgroundColor: '#ebf8ff', border: '1px solid #90cdf4', color: '#2b6cb0',
    padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold'
  },
  statusBadge: {
    padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', textTransform: 'capitalize'
  },
  actionBtn: {
    color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold'
  },
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(10,37,64,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
  },
  modal: { backgroundColor: '#fff', borderRadius: '12px', padding: '28px', maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' },
  modalTitle: { margin: '0 0 16px 0', color: '#0a2540' },
  modalSub: { margin: '-8px 0 16px 0', color: '#627d98', fontSize: '13px' },
  modalGroup: { marginBottom: '14px' },
  modalLabel: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#334e68', marginBottom: '6px' },
  modalInput: { width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #d9e2ec', fontSize: '13px', outline: 'none', boxSizing: 'border-box' },
  modalTextarea: { width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #d9e2ec', fontSize: '13px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' },
  modalSelect: { width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #d9e2ec', fontSize: '13px', outline: 'none', backgroundColor: '#fff', boxSizing: 'border-box' },
  fileHelp: { display: 'block', fontSize: '11px', color: '#829ab1', marginTop: '4px' },
  modalActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' },
  modalCancel: { backgroundColor: '#e2e8f0', color: '#4a5568', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  modalConfirm: { backgroundColor: '#003087', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' },
  // Image preview card
  previewCard: {
    backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden', maxWidth: '600px', width: '92%', boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
  },
  previewHeader: {
    backgroundColor: '#0a2540', color: '#fff', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', fontSize: '13px'
  },
  closePreviewBtn: { border: 'none', background: 'transparent', color: '#fff', fontSize: '18px', cursor: 'pointer' },
  previewImg: { width: '100%', maxHeight: '70vh', objectFit: 'contain', backgroundColor: '#eaeaea' }
};

export default ExpenseDashboard;