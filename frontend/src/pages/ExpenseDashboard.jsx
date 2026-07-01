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

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) setMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const handleOpenModal = () => {
    setError('');
    setSuccess('');
    setShowModal(true);
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

  const sumAmountByStatus = (statusList) => {
    return expenses
      .filter(e => statusList.includes(e.status))
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
  };

  const totalRequestedAmount = sumAmountByStatus(['PENDING_HOD', 'PENDING_FINANCE', 'DISBURSED']);
  const disbursedAmount = sumAmountByStatus(['DISBURSED']);
  const awaitingHodAmount = sumAmountByStatus(['PENDING_HOD']);
  const awaitingFinanceAmount = sumAmountByStatus(['PENDING_FINANCE']);

  const filteredExpenses = expenses.filter((exp) => {
    if (statusFilter === 'ALL') return true;
    return exp.status === statusFilter;
  });

  if (loading) return <div style={styles.loading}>Loading expenses...</div>;

  return (
    <div style={styles.container}>
      {/* Navbar */}
      <div style={styles.navbar}>
        <h1 style={styles.navTitle}>💰 {isMobile ? 'Expenses' : 'Expense Management'}</h1>
        
        {isMobile ? (
          <button onClick={() => setMenuOpen(!menuOpen)} style={styles.hamburgerBtn}>
            {menuOpen ? '✕' : '☰'}
          </button>
        ) : (
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
        )}
      </div>

      {/* Mobile Drawer */}
      {isMobile && menuOpen && (
        <div style={styles.mobileDrawer}>
          <div style={styles.drawerUser}>
            <div style={styles.avatarCircle}>
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <p style={styles.drawerUserName}>{user?.full_name}</p>
              <p style={styles.drawerUserRole}>{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          
          <div style={styles.drawerDivider} />

          <div style={styles.drawerLinks}>
            {isHOD && (
              <button onClick={() => { setMenuOpen(false); navigate('/hod'); }} style={styles.drawerBtn}>📋 HOD Dashboard</button>
            )}
            {isAccountant && (
              <button onClick={() => { setMenuOpen(false); navigate('/accountant'); }} style={styles.drawerBtn}>📊 Accountant Dashboard</button>
            )}
            {isCourseRep && (
              <>
                <button onClick={() => { setMenuOpen(false); navigate('/roster'); }} style={styles.drawerBtn}>📋 Class Roster</button>
                <button onClick={() => { setMenuOpen(false); navigate('/student'); }} style={styles.drawerBtn}>🎓 Student Dashboard</button>
              </>
            )}
            <button onClick={handleLogout} style={{ ...styles.drawerBtn, ...styles.drawerLogout }}>Logout</button>
          </div>
        </div>
      )}

      <div style={styles.content}>
        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        {/* Approval Pipeline */}
        <div style={styles.pipelineCard}>
          <p style={styles.pipelineTitle}>APPROVAL PIPELINE</p>
          <div style={styles.pipelineSteps}>
            <div style={styles.pipelineStep}>
              <div style={{ ...styles.stepCircle, backgroundColor: '#ebf5ff', color: '#1e40af' }}>
                {expenses.filter(e => e.status !== 'REJECTED').length}
              </div>
              <span style={styles.stepLabel}>Total</span>
            </div>
            <div style={styles.stepArrow}>&gt;</div>
            <div style={styles.pipelineStep}>
              <div style={{ ...styles.stepCircle, backgroundColor: '#fef3c7', color: '#92400e' }}>
                {expenses.filter(e => e.status === 'PENDING_HOD').length}
              </div>
              <span style={styles.stepLabel}>Pending HOD</span>
            </div>
            <div style={styles.stepArrow}>&gt;</div>
            <div style={styles.pipelineStep}>
              <div style={{ ...styles.stepCircle, backgroundColor: '#e6fffa', color: '#006d5b' }}>
                {expenses.filter(e => e.status === 'PENDING_FINANCE').length}
              </div>
              <span style={styles.stepLabel}>Pending finance</span>
            </div>
            <div style={styles.stepArrow}>&gt;</div>
            <div style={styles.pipelineStep}>
              <div style={{ ...styles.stepCircle, backgroundColor: '#def7ec', color: '#03543f' }}>
                {expenses.filter(e => e.status === 'DISBURSED').length}
              </div>
              <span style={styles.stepLabel}>Disbursed</span>
            </div>
          </div>
        </div>

        {/* Statistics Cards Grid */}
        <div style={styles.cardsGrid}>
          <div style={{ ...styles.newStatCard, borderLeft: '4px solid #3b82f6' }}>
            <p style={styles.newStatLabel}>Total requested</p>
            <p style={{ ...styles.newStatValue, color: '#2563eb' }}>₵{totalRequestedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p style={styles.newStatSub}>this semester</p>
          </div>
          <div style={{ ...styles.newStatCard, borderLeft: '4px solid #10b981' }}>
            <p style={styles.newStatLabel}>Disbursed</p>
            <p style={{ ...styles.newStatValue, color: '#059669' }}>₵{disbursedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p style={styles.newStatSub}>released to rep</p>
          </div>
          <div style={{ ...styles.newStatCard, borderLeft: '4px solid #f59e0b' }}>
            <p style={styles.newStatLabel}>Awaiting HOD</p>
            <p style={{ ...styles.newStatValue, color: '#d97706' }}>₵{awaitingHodAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p style={styles.newStatSub}>pending approval</p>
          </div>
          <div style={{ ...styles.newStatCard, borderLeft: '4px solid #0d9488' }}>
            <p style={styles.newStatLabel}>Awaiting finance</p>
            <p style={{ ...styles.newStatValue, color: '#0d9488' }}>₵{awaitingFinanceAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p style={styles.newStatSub}>approved, undisbursed</p>
          </div>
        </div>

        {/* Submit Button (Course Rep only) */}
        {isCourseRep && (
          <button onClick={handleOpenModal} style={styles.submitBtn}>
            + Submit New Expense Request
          </button>
        )}

        {/* Filter Buttons */}
        <div style={styles.filterTabsRow}>
          <button 
            onClick={() => setStatusFilter('ALL')} 
            style={{ ...styles.tabBtn, ...(statusFilter === 'ALL' ? styles.tabBtnActive : {}) }}
          >
            All
          </button>
          <button 
            onClick={() => setStatusFilter('PENDING_HOD')} 
            style={{ ...styles.tabBtn, ...(statusFilter === 'PENDING_HOD' ? styles.tabBtnActive : {}) }}
          >
            Pending HOD
          </button>
          <button 
            onClick={() => setStatusFilter('PENDING_FINANCE')} 
            style={{ ...styles.tabBtn, ...(statusFilter === 'PENDING_FINANCE' ? styles.tabBtnActive : {}) }}
          >
            Pending finance
          </button>
          <button 
            onClick={() => setStatusFilter('DISBURSED')} 
            style={{ ...styles.tabBtn, ...(statusFilter === 'DISBURSED' ? styles.tabBtnActive : {}) }}
          >
            Disbursed
          </button>
        </div>

        {/* Expenses Table */}
        <div style={styles.section}>
          <div style={{ marginBottom: '16px' }}>
            <span style={styles.sectionTitleUpper}>REQUESTS</span>
          </div>
          {filteredExpenses.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📋</div>
              <p style={styles.emptyText}>No expense requests found</p>
              <p style={styles.emptySub}>All digital requisitions and reimbursement proofs will appear here.</p>
            </div>
          ) : (
            <div style={styles.cardsList}>
              {filteredExpenses.map((exp) => (
                <div key={exp.id} style={styles.expenseListItem} onClick={() => {
                  if (exp.attachment_url) setPreviewImage(exp.attachment_url);
                }}>
                  <div style={styles.itemLeft}>
                    <div style={styles.itemAvatar}>
                      {exp.item_description.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 style={styles.itemDesc}>{exp.item_description}</h4>
                      <p style={styles.itemMeta}>
                        {new Date(exp.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • by {exp.requested_by_name}
                      </p>
                      <p style={styles.itemVendor}>
                        {exp.vendor_name || 'No vendor'} • Level {exp.target_level}
                      </p>
                      
                      {/* Attachment Link indicators inside the meta section */}
                      <div style={{ marginTop: '6px', display: 'flex', gap: '8px' }}>
                        {exp.attachment_url && (
                          <span style={styles.cardLinkBadge}>📄 Invoice</span>
                        )}
                        {exp.disbursement_proof_url && (
                          <span onClick={(e) => { e.stopPropagation(); setPreviewImage(exp.disbursement_proof_url); }} style={{ ...styles.cardLinkBadge, backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                            🧾 Receipt
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={styles.itemRight}>
                    <span style={styles.itemAmount}>₵{parseFloat(exp.amount).toFixed(2)}</span>
                    <span style={{
                      ...styles.statusBadge,
                      fontSize: '10px',
                      padding: '4px 8px',
                      marginTop: '4px',
                      display: 'inline-block',
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
                    
                    {/* Action buttons if applicable */}
                    <div style={{ marginTop: '8px', display: 'flex', gap: '6px', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                      {isHOD && exp.status === 'PENDING_HOD' && (
                        <>
                          <button onClick={() => handleApprove(exp.id)} style={{ ...styles.actionBtn, backgroundColor: '#10b981' }}>Approve</button>
                          <button onClick={() => handleReject(exp.id)} style={{ ...styles.actionBtn, backgroundColor: '#ef4444' }}>Reject</button>
                        </>
                      )}
                      {isAccountant && exp.status === 'PENDING_FINANCE' && (
                        <button onClick={() => handleOpenDisburseModal(exp.id)} style={{ ...styles.actionBtn, backgroundColor: '#3b82f6' }}>Disburse</button>
                      )}
                      {isCourseRep && exp.status === 'PENDING_HOD' && (
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Awaiting HOD</span>
                      )}
                      {isCourseRep && exp.status === 'PENDING_FINANCE' && (
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Awaiting Finance</span>
                      )}
                      {exp.status === 'DISBURSED' && (
                        <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>✅ Disbursed</span>
                      )}
                      {exp.status === 'REJECTED' && (
                        <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>❌ Rejected</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal for submitting expense */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Submit Expense Request</h3>
            {error && <div style={styles.modalError}>⚠️ {error}</div>}
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
  container: { minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '15px', color: '#1a56db', fontWeight: 'bold' },
  navbar: {
    backgroundColor: '#ffffff', color: '#1e293b',
    padding: '14px 24px', display: 'flex',
    justifyContent: 'space-between', alignItems: 'center',
    borderBottom: '1px solid #f1f5f9',
    position: 'sticky', top: 0, zIndex: 100,
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
  },
  navTitle: { margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e293b' },
  navRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  navUser: { fontSize: '13px', color: '#64748b', fontWeight: '600' },
  navBtn: {
    backgroundColor: '#f1f5f9', color: '#475569', border: 'none',
    padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
    transition: 'all 0.2s ease', marginRight: '6px'
  },
  logoutBtn: {
    backgroundColor: '#fee2e2', border: 'none',
    color: '#ef4444', padding: '8px 16px', borderRadius: '8px',
    cursor: 'pointer', fontSize: '12px', fontWeight: '600',
    transition: 'all 0.2s ease'
  },
  content: { maxWidth: '1200px', margin: '0 auto', padding: '32px' },
  error: {
    backgroundColor: '#fef2f2', border: '1px solid #fca5a5',
    color: '#b91c1c', padding: '14px', borderRadius: '12px', marginBottom: '24px', fontSize: '13px', fontWeight: '500'
  },
  success: {
    backgroundColor: '#f0fdf4', border: '1px solid #86efac',
    color: '#15803d', padding: '14px', borderRadius: '12px', marginBottom: '24px', fontSize: '13px', fontWeight: '500'
  },
  cardsRow: { display: 'flex', gap: '20px', marginBottom: '32px', flexWrap: 'wrap' },
  statCard: {
    flex: 1, minWidth: '200px', backgroundColor: '#fff', borderRadius: '16px', padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
    borderTop: '4px solid #3b82f6',
    transition: 'transform 0.2s ease'
  },
  statLabel: { margin: '0 0 8px 0', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' },
  statValue: { margin: 0, fontSize: '28px', fontWeight: '800', color: '#1e293b' },
  submitBtn: {
    backgroundColor: '#1a56db', color: '#fff', padding: '12px 24px', borderRadius: '10px',
    border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '700', marginBottom: '32px',
    boxShadow: '0 4px 12px rgba(26, 86, 219, 0.2)', transition: 'all 0.2s ease'
  },
  section: { 
    backgroundColor: '#fff', borderRadius: '16px', padding: '28px', 
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
    borderTop: '3px solid #1a56db'
  },
  sectionTitle: { margin: '0 0 20px 0', fontSize: '16px', fontWeight: '800', color: '#1e293b' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center' },
  emptyIcon: { fontSize: '48px', marginBottom: '16px' },
  emptyText: { margin: '0 0 6px 0', fontSize: '16px', fontWeight: '700', color: '#1e293b' },
  emptySub: { margin: 0, fontSize: '13px', color: '#64748b' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  tableHeader: { borderBottom: '2.5px solid #e2e8f0', backgroundColor: '#f8fafc' },
  th: { padding: '14px 16px', color: '#475569', fontWeight: '700', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  tableRow: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '16px', color: '#334155', verticalAlign: 'middle' },
  previewBtn: {
    backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569',
    padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600',
    transition: 'all 0.2s'
  },
  statusBadge: {
    padding: '6px 12px', borderRadius: '9999px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em'
  },
  actionBtn: {
    color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '700', transition: 'all 0.2s'
  },
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
  },
  modal: { backgroundColor: '#fff', borderRadius: '16px', padding: '32px', maxWidth: '520px', width: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' },
  modalTitle: { margin: '0 0 16px 0', color: '#1e293b', fontWeight: '800' },
  modalSub: { margin: '-8px 0 20px 0', color: '#64748b', fontSize: '13px' },
  modalGroup: { marginBottom: '16px' },
  modalLabel: { display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.02em' },
  modalInput: { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' },
  modalTextarea: { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', transition: 'border-color 0.2s' },
  modalSelect: { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', backgroundColor: '#fff', boxSizing: 'border-box', transition: 'border-color 0.2s' },
  fileHelp: { display: 'block', fontSize: '11px', color: '#64748b', marginTop: '4px' },
  modalActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' },
  modalCancel: { backgroundColor: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  modalConfirm: { backgroundColor: '#1a56db', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' },
  previewCard: {
    backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden', maxWidth: '640px', width: '92%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
  },
  previewHeader: {
    backgroundColor: '#1e293b', color: '#fff', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', fontSize: '13px'
  },
  closePreviewBtn: { border: 'none', background: 'transparent', color: '#fff', fontSize: '20px', cursor: 'pointer' },
  previewImg: { width: '100%', maxHeight: '72vh', objectFit: 'contain', backgroundColor: '#f8fafc' },
  hamburgerBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#1e293b',
    padding: '4px 8px'
  },
  mobileDrawer: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #f1f5f9',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
  },
  drawerUser: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatarCircle: {
    width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#1a56db', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px'
  },
  drawerUserName: { margin: 0, fontWeight: '700', color: '#1e293b', fontSize: '14px' },
  drawerUserRole: { margin: 0, fontSize: '12px', color: '#64748b', fontWeight: '600' },
  drawerDivider: { height: '1px', backgroundColor: '#f1f5f9' },
  drawerLinks: { display: 'flex', flexDirection: 'column', gap: '10px' },
  drawerBtn: {
    width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#f1f5f9',
    color: '#475569', fontSize: '13px', fontWeight: '600', textAlign: 'left', cursor: 'pointer'
  },
  drawerLogout: {
    backgroundColor: '#fee2e2', color: '#ef4444'
  },
  modalError: {
    backgroundColor: '#fef2f2', border: '1px solid #fca5a5',
    color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: '600'
  },
  pipelineCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '28px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
    border: '1px solid #f1f5f9'
  },
  pipelineTitle: {
    margin: '0 0 16px 0',
    fontSize: '12px',
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  pipelineSteps: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: '12px'
  },
  pipelineStep: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    minWidth: '80px'
  },
  stepCircle: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontSize: '16px'
  },
  stepLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center'
  },
  stepArrow: {
    fontSize: '18px',
    color: '#cbd5e1',
    fontWeight: 'bold',
    userSelect: 'none'
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
    marginBottom: '32px'
  },
  newStatCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  newStatLabel: {
    margin: 0,
    fontSize: '12px',
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'capitalize'
  },
  newStatValue: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '800'
  },
  newStatSub: {
    margin: 0,
    fontSize: '12px',
    color: '#64748b'
  },
  filterTabsRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '24px',
    flexWrap: 'wrap'
  },
  tabBtn: {
    padding: '10px 20px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#64748b',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  tabBtnActive: {
    backgroundColor: '#f1f5f9',
    color: '#1e293b',
    borderColor: '#cbd5e1',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
  },
  sectionTitleUpper: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  cardsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '16px'
  },
  expenseListItem: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '16px 20px',
    border: '1.5px solid #f1f5f9',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.01)',
    boxSizing: 'border-box'
  },
  itemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  itemAvatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontSize: '16px'
  },
  itemDesc: {
    margin: '0 0 4px 0',
    fontSize: '15px',
    fontWeight: '700',
    color: '#1e293b'
  },
  itemMeta: {
    margin: 0,
    fontSize: '12px',
    color: '#64748b'
  },
  itemVendor: {
    margin: '4px 0 0 0',
    fontSize: '11px',
    color: '#94a3b8',
    fontStyle: 'italic'
  },
  itemRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end'
  },
  itemAmount: {
    fontSize: '16px',
    fontWeight: '800',
    color: '#1e293b'
  },
  cardLinkBadge: {
    fontSize: '10px',
    fontWeight: '600',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    padding: '2px 6px',
    borderRadius: '4px',
    display: 'inline-block'
  }
};

export default ExpenseDashboard;