import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDefaulters, grantOverride, getAllOverrides, getHODStats } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const HODDashboard = () => {
  const [defaulters, setDefaulters] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [stats, setStats] = useState({
    total_students: 0,
    paid_students: 0,
    owing_students: 0,
    collection_efficiency: 0,
    total_collected: 0,
    total_disbursed: 0,
    total_pending: 0,
    remaining_budget: 0,
    spend_ratio: 0
  });
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
      const [defRes, ovRes, statsRes] = await Promise.all([
        getDefaulters(),
        getAllOverrides(),
        getHODStats(),
      ]);
      setDefaulters(defRes.data.defaulters || []);
      setOverrides(ovRes.data.overrides || []);
      if (statsRes.data.stats) {
        setStats(statsRes.data.stats);
      }
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

  const handleExportDefaulters = () => {
    if (defaulters.length === 0) return;
    const headers = ['Index Number', 'Full Name', 'Level', 'Class Group', 'Outstanding Dues (GHS)'];
    const rows = defaulters.map(student => [
      student.index_number,
      student.full_name,
      student.current_level,
      student.class_group || '—',
      parseFloat(student.outstanding || 0).toFixed(2)
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Defaulters_List_HTU_Computer_Science.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        <h1 style={styles.navTitle}>HTU Computer Science — HOD Dashboard</h1>
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

        {/* Executive Dashboard Summary */}
        <div style={styles.dashboardSection}>
          <div style={styles.metricGrid}>
            <div style={styles.metricCard}>
              <div style={styles.metricHeader}>
                <span style={{ ...styles.metricIcon, backgroundColor: '#ffebe9', color: '#e53e3e' }}>📋</span>
                <p style={styles.metricLabel}>Total Defaulters</p>
              </div>
              <p style={{ ...styles.metricValue, color: '#e53e3e' }}>{defaulters.length}</p>
            </div>
            
            <div style={styles.metricCard}>
              <div style={styles.metricHeader}>
                <span style={{ ...styles.metricIcon, backgroundColor: '#e6fffa', color: '#2d6a4f' }}>🛡️</span>
                <p style={styles.metricLabel}>Active Overrides</p>
              </div>
              <p style={{ ...styles.metricValue, color: '#2d6a4f' }}>{overrides.length}</p>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.metricHeader}>
                <span style={{ ...styles.metricIcon, backgroundColor: '#ebf8ff', color: '#2b6cb0' }}>👥</span>
                <p style={styles.metricLabel}>Total Enrollment</p>
              </div>
              <p style={{ ...styles.metricValue, color: '#2b6cb0' }}>{stats.total_students}</p>
            </div>
          </div>

          <div style={styles.chartsRow}>
            {/* Collection Efficiency Card */}
            <div style={styles.chartCard}>
              <h3 style={styles.chartCardTitle}>📊 Dues Collection Efficiency</h3>
              <div style={styles.chartCardBody}>
                <div style={styles.progressRingContainer}>
                  <svg width="100" height="100">
                    <circle cx="50" cy="50" r="35" stroke="#edf2f7" strokeWidth="8" fill="transparent" />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="35" 
                      stroke="#003087" 
                      strokeWidth="8" 
                      fill="transparent" 
                      strokeDasharray={2 * Math.PI * 35}
                      strokeDashoffset={(2 * Math.PI * 35) - (stats.collection_efficiency / 100) * (2 * Math.PI * 35)}
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div style={styles.progressRingText}>{stats.collection_efficiency}%</div>
                </div>
                <div style={styles.chartStatsList}>
                  <div style={styles.chartStatItem}>
                    <span style={styles.chartStatDot} />
                    <div style={styles.chartStatContent}>
                      <span style={styles.chartStatLabel}>Paid in Full</span>
                      <span style={styles.chartStatVal}>{stats.paid_students} students</span>
                    </div>
                  </div>
                  <div style={styles.chartStatItem}>
                    <span style={{ ...styles.chartStatDot, backgroundColor: '#e53e3e' }} />
                    <div style={styles.chartStatContent}>
                      <span style={styles.chartStatLabel}>Owing Dues</span>
                      <span style={styles.chartStatVal}>{stats.owing_students} students</span>
                    </div>
                  </div>
                  <div style={styles.chartStatDivider} />
                  <div style={styles.chartStatContent}>
                    <span style={styles.chartStatLabel}>Total Dues Collected</span>
                    <span style={{ ...styles.chartStatVal, fontSize: '15px', color: '#003087', fontWeight: 'bold' }}>₵{stats.total_collected.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Class Budget Spend Card */}
            <div style={styles.chartCard}>
              <h3 style={styles.chartCardTitle}>💸 Class Budget Spend Ratio</h3>
              <div style={styles.chartCardBody}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <span style={styles.chartStatLabel}>Approved & Disbursed</span>
                      <p style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 'bold', color: '#e53e3e' }}>₵{stats.total_disbursed.toFixed(2)}</p>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#718096' }}>{stats.spend_ratio}% Spent</span>
                  </div>

                  <div style={styles.linearProgressBarBg}>
                    <div style={{ ...styles.linearProgressBarFill, width: `${Math.min(100, stats.spend_ratio)}%` }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px' }}>
                    <div>
                      <span style={styles.chartStatLabel}>Pending HOD/Finance</span>
                      <p style={{ margin: '2px 0 0 0', fontWeight: 'bold', color: '#dd6b20' }}>₵{stats.total_pending.toFixed(2)}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={styles.chartStatLabel}>Net Remaining Balance</span>
                      <p style={{ margin: '2px 0 0 0', fontWeight: 'bold', color: '#2d6a4f' }}>₵{stats.remaining_budget.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Defaulters Table */}
        <div style={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ ...styles.sectionTitle, margin: 0 }}>📋 Defaulters List</h2>
            {defaulters.length > 0 && (
              <button onClick={handleExportDefaulters} style={styles.exportBtn}>
                📥 Export Defaulters to Excel (CSV)
              </button>
            )}
          </div>
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
  dashboardSection: {
    marginBottom: '28px',
  },
  metricGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  metricCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '16px 20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  metricHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px',
  },
  metricIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
  },
  metricLabel: {
    margin: 0,
    color: '#718096',
    fontSize: '13px',
    fontWeight: '600',
  },
  metricValue: {
    margin: '0 0 0 42px',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1a202c',
  },
  chartsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '16px',
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  chartCardTitle: {
    margin: '0 0 16px 0',
    fontSize: '15px',
    color: '#1a365d',
    fontWeight: '600',
  },
  chartCardBody: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    minHeight: '120px',
  },
  progressRingContainer: {
    position: 'relative',
    width: '100px',
    height: '100px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingText: {
    position: 'absolute',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#003087',
  },
  chartStatsList: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  chartStatItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  chartStatDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#003087',
  },
  chartStatContent: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    fontSize: '13px',
  },
  chartStatLabel: {
    color: '#718096',
    fontWeight: '500',
  },
  chartStatVal: {
    color: '#2d3748',
    fontWeight: '600',
  },
  chartStatDivider: {
    height: '1px',
    backgroundColor: '#edf2f7',
    margin: '4px 0',
  },
  linearProgressBarBg: {
    width: '100%',
    height: '12px',
    backgroundColor: '#edf2f7',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  linearProgressBarFill: {
    height: '100%',
    backgroundColor: '#e53e3e',
    borderRadius: '6px',
    transition: 'width 0.3s ease',
  },
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
  exportBtn: {
    backgroundColor: '#003087',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
  },
};

export default HODDashboard;