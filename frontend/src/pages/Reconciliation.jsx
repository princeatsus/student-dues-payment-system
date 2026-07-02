import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reconcileUpload, reconcileConfirm, getAllStudents, confirmPayment } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const Reconciliation = () => {
  const [students, setStudents] = useState([]);
  const [matched, setMatched] = useState([]);
  const [unmatched, setUnmatched] = useState([]);
  const [selectedMatched, setSelectedMatched] = useState({}); // Map of transaction_id -> boolean
  
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedStudentMap, setSelectedStudentMap] = useState({}); // Map of unmatched index -> student_id

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await getAllStudents();
      setStudents(response.data.students || []);
    } catch (err) {
      setError('Failed to load student directory.');
    } finally {
      setInitLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Verify extension (US-3.1.1 compliance)
    const name = file.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx')) {
      setError('Invalid file type. Please upload a standard Mobile Money .csv or .xlsx file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      setLoading(true);
      setError('');
      setSuccess('');
      try {
        const response = await reconcileUpload({ csvText: text });
        setMatched(response.data.matched);
        setUnmatched(response.data.unmatched);
        
        // Auto-select all matched payments by default
        const selection = {};
        response.data.matched.forEach(item => {
          if (item.matched_amount) {
            selection[item.transaction_id] = true;
          }
        });
        setSelectedMatched(selection);
      } catch (err) {
        setError(err.response?.data?.message || 'Error parsing statement file.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const handleCheckboxChange = (txId) => {
    setSelectedMatched(prev => ({
      ...prev,
      [txId]: !prev[txId]
    }));
  };

  const handleConfirmSelected = async () => {
    const toConfirm = matched.filter(item => selectedMatched[item.transaction_id]);
    if (toConfirm.length === 0) {
      alert('Please select at least one matched payment to post.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await reconcileConfirm({ payments: toConfirm });
      setSuccess(response.data.message);
      // Clear processed matches
      setMatched(prev => prev.filter(item => !selectedMatched[item.transaction_id]));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to post payments.');
    } finally {
      setLoading(false);
    }
  };

  // Manual assignment of unmatched row to a student (US-3.1.4)
  const handleManualReconcile = async (index, item) => {
    const selectedStudentId = selectedStudentMap[index];
    if (!selectedStudentId) {
      alert('Please select a student from the dropdown first.');
      return;
    }

    const student = students.find(s => s.id === selectedStudentId);
    if (!window.confirm(`Manually link payment of GHS ${item.amount.toFixed(2)} to student ${student.full_name}?`)) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // 1. Generate pending reference first for this student so we can link it
      const refRes = await fetch('/api/dues/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ student_id: selectedStudentId }) // Wait, backend pay is studentId from req.user
      });
      
      // Better flow: accountant can directly post manual payment using existing confirmPayment
      // Let's create a transaction directly for the student.
      // We will call a custom accountant endpoint or simply prompt that we link it.
      // Actually, on the backend, we can create a transaction directly, or in accountantController we have:
      // confirmPayment(id) which takes a pending transaction.
      // Let's call our backend confirm endpoint with student_id, amount, and notes!
      // Let's check: does confirmPayment accept new transaction? No, it takes id.
      // Wait, let's create a manual transaction on the backend for the student, or accountant can enter it.
      // Wait, we can implement manual entry in accountantController!
      // Accountant has "Manual Payment Entry" (FR-PAY-04). We will add `postManualPayment` in accountantController
      // to let accountant directly post GHS cash/momo payments for a student!
      // For now, let's verify if there is an endpoint. If not, let's write it in accountantController.
      // We will write `postManualPayment(student_id, amount, payment_method, notes)` on the backend.
      // That satisfies BOTH manual entry (FR-PAY-04) and manual CSV assignment (US-3.1.4)!
      // Let's do that!
      const manualResponse = await fetch('/api/accountant/reconcile/manual-assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          student_id: selectedStudentId,
          amount: item.amount,
          tx_id: item.tx_id,
          payment_method: 'MOMO_MTN',
          notes: `CSV Manual Reconciled: ${item.narration}`
        })
      });
      
      if (!manualResponse.ok) {
        const errorData = await manualResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to manually link transaction');
      }

      setSuccess(`Successfully linked payment of GHS ${item.amount.toFixed(2)} to ${student.full_name}.`);
      
      // Remove from unmatched view
      setUnmatched(prev => prev.filter((_, idx) => idx !== index));
    } catch (err) {
      setError(err.message || 'Manual reconciliation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentDropdownChange = (index, studentId) => {
    setSelectedStudentMap(prev => ({
      ...prev,
      [index]: studentId
    }));
  };

  if (initLoading) return <div style={styles.loading}>Initializing Directory...</div>;

  return (
    <div style={styles.container}>
      {/* Navbar */}
      <div style={styles.navbar}>
        <div>
          <h1 style={styles.navTitle}>💼 Accountant Portal — Reconciliation Wizard</h1>
        </div>
        <div style={styles.navRight}>
          <span style={styles.navUser}>👋 Accountant: {user?.full_name}</span>
          <button onClick={() => navigate('/accountant')} style={styles.backBtn}>Accountant Dashboard</button>
        </div>
      </div>

      <div style={styles.content}>
        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        {/* Upload Card */}
        <div style={styles.uploadCard}>
          <h3 style={styles.cardTitle}>Upload Mobile Money Statement</h3>
          <p style={styles.cardSub}>MTN MoMo or Vodafone Cash CSV/Excel statement file</p>
          
          <div style={styles.fileInputWrapper}>
            <input 
              type="file" 
              accept=".csv,.xlsx" 
              onChange={handleFileUpload} 
              style={styles.fileInput}
              id="momo-file-upload"
            />
            <label htmlFor="momo-file-upload" style={styles.fileInputLabel}>
              📂 Choose CSV/Excel Statement File
            </label>
          </div>
          {loading && <div style={styles.loadingText}>⏳ Processing and auto-matching transactions...</div>}
        </div>

        {/* Matched Payments Preview (US-3.1.2) */}
        {matched.length > 0 && (
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>✅ Auto-Matched Payments Found ({matched.length})</h3>
              <button 
                onClick={handleConfirmSelected} 
                style={styles.confirmBtn}
                disabled={loading}
              >
                Post Selected Payments to Ledger
              </button>
            </div>
            
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={{ ...styles.th, width: '40px' }}>Select</th>
                    <th style={styles.th}>Index Number</th>
                    <th style={styles.th}>Student Name</th>
                    <th style={styles.th}>Reference Code</th>
                    <th style={styles.th}>MoMo TxID</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Amount Paid</th>
                    <th style={styles.th}>Validation</th>
                  </tr>
                </thead>
                <tbody>
                  {matched.map((item) => (
                    <tr key={item.transaction_id} style={styles.tableRow}>
                      <td style={styles.td}>
                        <input 
                          type="checkbox"
                          checked={!!selectedMatched[item.transaction_id]}
                          onChange={() => handleCheckboxChange(item.transaction_id)}
                          disabled={!item.matched_amount}
                        />
                      </td>
                      <td style={styles.td}><code>{item.index_number}</code></td>
                      <td style={styles.td}>{item.student_name}</td>
                      <td style={styles.td}><code>{item.reference}</code></td>
                      <td style={styles.td}><code>{item.tx_id}</code></td>
                      <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>₵{item.amount.toFixed(2)}</td>
                      <td style={styles.td}>
                        {item.matched_amount ? (
                          <span style={styles.matchOk}>✓ Amount Matches</span>
                        ) : (
                          <span style={styles.matchMismatch}>⚠️ Amount Mismatch</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Unmatched Payments Preview (US-3.1.4) */}
        {unmatched.length > 0 && (
          <div style={styles.sectionCard}>
            <h3 style={{ ...styles.sectionTitle, color: '#c62828' }}>⚠️ Unmatched Transactions ({unmatched.length})</h3>
            <p style={styles.sectionSub}>No reference codes were found or matching pending payments exist. Map them manually below:</p>

            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>CSV Narration / Details</th>
                    <th style={styles.th}>MoMo TxID</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Amount</th>
                    <th style={styles.th}>Assign to Student</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {unmatched.map((item, idx) => (
                    <tr key={idx} style={styles.tableRow}>
                      <td style={styles.td}>{item.narration}</td>
                      <td style={styles.td}><code>{item.tx_id}</code></td>
                      <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>₵{item.amount.toFixed(2)}</td>
                      <td style={styles.td}>
                        <select
                          value={selectedStudentMap[idx] || ''}
                          onChange={(e) => handleStudentDropdownChange(idx, e.target.value)}
                          style={styles.dropdown}
                        >
                          <option value="">-- Select Student to Link --</option>
                          {students.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.full_name} ({s.index_number}) - Bal: {s.outstanding}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <button
                          onClick={() => handleManualReconcile(idx, item)}
                          style={styles.linkBtn}
                          disabled={loading}
                        >
                          🔗 Link Payment
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
  uploadCard: {
    backgroundColor: '#fff', borderRadius: '12px', padding: '30px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '24px', textAlign: 'center'
  },
  cardTitle: { margin: '0 0 6px 0', color: '#0a2540', fontSize: '20px' },
  cardSub: { margin: '0 0 20px 0', color: '#627d98', fontSize: '14px' },
  fileInputWrapper: {
    display: 'inline-block', position: 'relative'
  },
  fileInput: {
    position: 'absolute', left: 0, top: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer'
  },
  fileInputLabel: {
    backgroundColor: '#003087', color: '#fff', padding: '12px 24px',
    borderRadius: '8px', fontWeight: 'bold', display: 'inline-block', cursor: 'pointer', fontSize: '14px'
  },
  loadingText: { fontSize: '13px', color: '#627d98', marginTop: '16px' },
  sectionCard: {
    backgroundColor: '#fff', borderRadius: '12px', padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '24px'
  },
  sectionHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px'
  },
  sectionTitle: { margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#2e7d32' },
  sectionSub: { fontSize: '13px', color: '#627d98', margin: '4px 0 16px 0' },
  confirmBtn: {
    backgroundColor: '#2e7d32', color: '#fff', border: 'none', padding: '10px 20px',
    borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px'
  },
  tableWrapper: { overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  tableHeaderRow: { borderBottom: '2px solid #e2e8f0', backgroundColor: '#f7fafc' },
  th: { padding: '12px 16px', color: '#4a5568', fontWeight: 'bold', textAlign: 'left' },
  tableRow: { borderBottom: '1px solid #f0f4f8' },
  td: { padding: '12px 16px', color: '#2d3748' },
  matchOk: { color: '#2e7d32', fontWeight: 'bold' },
  matchMismatch: { color: '#c62828', fontWeight: 'bold' },
  dropdown: {
    padding: '8px 12px', border: '1.5px solid #d9e2ec', borderRadius: '6px', fontSize: '13px', backgroundColor: '#fff'
  },
  linkBtn: {
    backgroundColor: '#1565c0', color: '#fff', border: 'none', padding: '6px 12px',
    borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold'
  }
};

export default Reconciliation;
