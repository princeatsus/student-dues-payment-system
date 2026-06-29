import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClassRoster, sendReminderEmail } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const ClassRoster = () => {
  const [rosterData, setRosterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [remindLoading, setRemindLoading] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRoster();
  }, []);

  const fetchRoster = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getClassRoster();
      setRosterData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load class roster.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async (studentId, studentName) => {
    if (!window.confirm(`Send an automated email reminder to ${studentName}?`)) {
      return;
    }
    setRemindLoading(studentId);
    setError('');
    setSuccess('');
    try {
      const response = await sendReminderEmail({ student_id: studentId });
      setSuccess(response.data.message);
      // Optional: alert the simulated body content for the hackathon demo
      alert(`📧 Simulated Email Sent Successfully!\n\nTo: ${studentName}\n\nContent:\n"${response.data.simulated_body}"`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reminder.');
    } finally {
      setRemindLoading(null);
    }
  };

  // CSV Roster Exporter (satisfies US-2.1.3 "Export to Excel")
  const handleExportRoster = () => {
    if (!rosterData || rosterData.roster.length === 0) return;

    const headers = ['Index Number', 'Full Name', 'Amount Paid (GHS)', 'Balance (GHS)', 'Status'];
    const rows = rosterData.roster.map(student => [
      student.index_number,
      student.full_name,
      student.total_paid.toFixed(2),
      student.outstanding.toFixed(2),
      student.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Class_Roster_Level_${rosterData.level}${rosterData.class_group}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div style={styles.loading}>Loading class roster...</div>;

  return (
    <div style={styles.container}>
      {/* Navbar */}
      <div style={styles.navbar}>
        <div>
          <h1 style={styles.navTitle}>HTU Computer Science — Course Rep Portal</h1>
        </div>
        <div style={styles.navRight}>
          <span style={styles.navUser}>👋 Rep: {user?.full_name}</span>
          <button onClick={() => navigate('/expenses')} style={styles.backBtn}>Expenses Dashboard</button>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.content}>
        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        <div style={styles.headerCard}>
          <div style={styles.headerInfo}>
            <h2 style={styles.title}>Class Roster: Level {rosterData?.level} {rosterData?.class_group}</h2>
            <p style={styles.sub}>
              Academic Year {rosterData?.session?.academic_year} · Semester {rosterData?.session?.semester}
            </p>
          </div>
          <button onClick={handleExportRoster} style={styles.exportBtn}>
            📥 Export to Excel (CSV)
          </button>
        </div>

        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>Total Class Strength</span>
            <strong style={styles.statValue}>{rosterData?.roster?.length} students</strong>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>Fully Paid</span>
            <strong style={{ ...styles.statValue, color: '#2e7d32' }}>
              {rosterData?.roster?.filter(s => s.status === 'PAID').length}
            </strong>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>Owing Balance</span>
            <strong style={{ ...styles.statValue, color: '#c62828' }}>
              {rosterData?.roster?.filter(s => s.status === 'OWING').length}
            </strong>
          </div>
        </div>

        {/* Roster Table */}
        <div style={styles.tableCard}>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.th}>Index Number</th>
                  <th style={styles.th}>Full Name</th>
                  <th style={styles.th}>Email Address</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Dues Configured</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Paid (GHS)</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Outstanding</th>
                  <th style={styles.th}>Status</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rosterData?.roster?.map((student) => (
                  <tr key={student.id} style={styles.tableRow}>
                    <td style={styles.td}><code>{student.index_number}</code></td>
                    <td style={styles.td}>{student.full_name}</td>
                    <td style={styles.td}>{student.email}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>₵{student.total_dues.toFixed(2)}</td>
                    <td style={{ ...styles.td, textAlign: 'right', color: '#2e7d32', fontWeight: 'bold' }}>₵{student.total_paid.toFixed(2)}</td>
                    <td style={{ ...styles.td, textAlign: 'right', color: student.outstanding > 0 ? '#c62828' : '#2d3748' }}>₵{student.outstanding.toFixed(2)}</td>
                    <td style={styles.td}>
                      <span style={student.status === 'PAID' ? styles.statusBadgePaid : styles.statusBadgeOwing}>
                        {student.status}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      {student.status === 'OWING' ? (
                        <button
                          onClick={() => handleSendReminder(student.id, student.full_name)}
                          style={styles.remindBtn}
                          disabled={remindLoading === student.id}
                        >
                          {remindLoading === student.id ? 'Sending...' : '📢 Send Nudge'}
                        </button>
                      ) : (
                        <span style={styles.noActionText}>No Action</span>
                      )}
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
  container: { minHeight: '100vh', backgroundColor: '#f0f4f8' },
  loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '16px', color: '#003087', fontWeight: 'bold' },
  navbar: {
    backgroundColor: '#0a2540', color: '#fff',
    padding: '16px 30px', display: 'flex',
    justifyContent: 'space-between', alignItems: 'center',
  },
  navTitle: { margin: 0, fontSize: '18px', fontWeight: 'bold' },
  navRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  navUser: { fontSize: '14px', fontWeight: '500' },
  backBtn: {
    backgroundColor: 'transparent', border: '1px solid #fff',
    color: '#fff', padding: '6px 14px', borderRadius: '6px',
    cursor: 'pointer', fontSize: '13px',
  },
  content: { maxWidth: '1200px', margin: '0 auto', padding: '30px' },
  error: {
    backgroundColor: '#fff5f5', border: '1px solid #feb2b2',
    color: '#c53030', padding: '14px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px'
  },
  success: {
    backgroundColor: '#f0fff4', border: '1px solid #c6f6d5',
    color: '#22543d', padding: '14px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px'
  },
  headerCard: {
    backgroundColor: '#fff', borderRadius: '12px', padding: '24px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '24px', flexWrap: 'wrap', gap: '16px'
  },
  headerInfo: {},
  title: { margin: '0 0 6px 0', color: '#0a2540', fontSize: '22px' },
  sub: { margin: 0, color: '#627d98', fontSize: '14px' },
  exportBtn: {
    backgroundColor: '#1565c0', color: '#fff', padding: '10px 20px',
    borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold'
  },
  statsRow: { display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' },
  statCard: {
    flex: 1, minWidth: '180px', backgroundColor: '#fff', borderRadius: '12px', padding: '20px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '6px'
  },
  statLabel: { fontSize: '12px', color: '#627d98', fontWeight: '600' },
  statValue: { fontSize: '20px', color: '#0a2540', fontWeight: 'bold' },
  tableCard: {
    backgroundColor: '#fff', borderRadius: '12px', padding: '20px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
  },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  tableHeaderRow: { borderBottom: '2px solid #e2e8f0', backgroundColor: '#f7fafc' },
  th: { padding: '12px 16px', color: '#4a5568', fontWeight: 'bold', textAlign: 'left' },
  tableRow: { borderBottom: '1px solid #f0f4f8', '&:hover': { backgroundColor: '#f7fafc' } },
  td: { padding: '12px 16px', color: '#2d3748' },
  statusBadgePaid: {
    backgroundColor: '#e6fffa', color: '#234e52', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold'
  },
  statusBadgeOwing: {
    backgroundColor: '#fff5f5', color: '#742a2a', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold'
  },
  remindBtn: {
    backgroundColor: '#c62828', color: '#fff', padding: '6px 12px', borderRadius: '6px',
    border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold'
  },
  noActionText: { color: '#a0aec0', fontSize: '11px', fontStyle: 'italic' }
};

export default ClassRoster;
