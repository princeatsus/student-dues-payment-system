import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getStudentDashboard, 
  generatePaymentReference, 
  getStudentTransactionsHistory, 
  getStudentClassFundStatus,
  confirmPayment
} from '../utils/api';
import { useAuth } from '../context/AuthContext';
import jsPDF from 'jspdf';

const StudentDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [classFund, setClassFund] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('All');
  
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [reference, setReference] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [certLoading, setCertLoading] = useState(false);
  const [statementLoading, setStatementLoading] = useState(false);

  // Simulated MoMo Modal State
  const [showMomoModal, setShowMomoModal] = useState(false);
  const [momoNumber, setMomoNumber] = useState('');
  const [momoProvider, setMomoProvider] = useState('MOMO_MTN');
  const [momoStep, setMomoStep] = useState(1); // 1 = Input, 2 = Pin Prompt, 3 = Success
  const [momoPin, setMomoPin] = useState('');

  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [dashRes, fundRes, histRes] = await Promise.all([
        getStudentDashboard(),
        getStudentClassFundStatus(),
        getStudentTransactionsHistory()
      ]);
      setDashboardData(dashRes.data);
      setClassFund(fundRes.data);
      setHistory(histRes.data.transactions);
      
      // If there's an active pending transaction, load it
      const pendingTx = dashRes.data.recent_transactions.find(tx => tx.status === 'PENDING');
      if (pendingTx) {
        setReference({
          id: pendingTx.id,
          reference: pendingTx.payment_reference,
          amount: `₵${parseFloat(pendingTx.amount).toFixed(2)}`,
          instructions: `Dial *170# → Send Money → Enter reference: ${pendingTx.payment_reference}`
        });
      }
    } catch (err) {
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayRequest = async () => {
    setPayLoading(true);
    setError('');
    try {
      const response = await generatePaymentReference();
      const refData = response.data;
      setReference({
        id: refData.transaction.id,
        reference: refData.reference,
        amount: refData.amount,
        instructions: refData.instructions
      });
      // Open the simulated MoMo prompt directly!
      setMomoStep(1);
      setShowMomoModal(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate payment reference.');
    } finally {
      setPayLoading(false);
    }
  };

  const handleMomoSubmit = (e) => {
    e.preventDefault();
    if (!momoNumber.match(/^\d{10}$/)) {
      alert('Please enter a valid 10-digit mobile money number.');
      return;
    }
    setMomoStep(2); // Go to PIN prompt
  };

  const handleMomoConfirmPayment = async () => {
    if (momoPin.length < 4) {
      alert('Please enter your 4-digit MoMo PIN.');
      return;
    }
    setPayLoading(true);
    try {
      // Reconcile/Confirm payment using the Accountant confirmPayment endpoint in simulated gateway
      await confirmPayment(reference.id, {
        payment_method: momoProvider,
        notes: `Simulated Online Payment via ${momoProvider} (${momoNumber})`
      });
      setMomoStep(3);
      setSuccessMsg('Payment completed successfully!');
      // Refresh dashboard info
      await fetchData();
    } catch (err) {
      alert('Simulated transaction failed. Please try again.');
    } finally {
      setPayLoading(false);
    }
  };

  const handleHistoryFilterChange = async (filter) => {
    setHistoryFilter(filter);
    try {
      const levelQuery = filter === 'All' ? '' : filter.replace('Level ', '');
      const response = await getStudentTransactionsHistory(levelQuery);
      setHistory(response.data.transactions);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    logoutUser();
    navigate('/');
  };

  // Helper to load QR code image dynamically for PDF insertion
  const loadQrImage = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null); // fallback if offline
    });
  };

  // Generate Clearance Certificate PDF (US-1.2)
  const generateCertificate = async () => {
    setCertLoading(true);
    try {
      const hasOverride = dashboardData?.balance?.has_override;
      const isCleared = dashboardData?.balance?.status === 'CLEARED';

      if (!isCleared && !hasOverride) {
        setError('You must clear all dues before downloading a certificate.');
        setCertLoading(false);
        return;
      }

      const doc = new jsPDF('p', 'mm', 'a4');
      const student = dashboardData.student;
      const session = dashboardData.session;
      const balance = dashboardData.balance;

      const verCode = `HTU-ELE-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Generate public verification link QR Code
      const verifyUrl = `${window.location.origin}/verify?index_number=${student.index_number}&graduation_year=${new Date().getFullYear()}`;
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verifyUrl)}`;
      const qrImg = await loadQrImage(qrApiUrl);

      // Letterhead Branding
      doc.setFillColor(10, 37, 64);
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('HO TECHNICAL UNIVERSITY', 105, 18, { align: 'center' });
      doc.setFontSize(14);
      doc.text('DEPARTMENT OF COMPUTER SCIENCE', 105, 28, { align: 'center' });

      // Watermark
      doc.setTextColor(230, 230, 230);
      doc.setFontSize(60);
      doc.setFont('Helvetica', 'bold');
      doc.text('VERIFIED CLEARANCE', 105, 140, { align: 'center', angle: 45 });

      // Document Title
      doc.setTextColor(10, 37, 64);
      doc.setFontSize(18);
      doc.text('SEMESTER CLEARANCE CERTIFICATE', 105, 60, { align: 'center' });
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(80, 80, 80);
      doc.text('This document serves as proof of departmental dues clearance for examinations.', 105, 68, { align: 'center' });

      // Certificate Details Box
      doc.setFillColor(244, 246, 252);
      doc.rect(20, 75, 170, 75, 'F');
      doc.setDrawColor(160, 180, 210);
      doc.rect(20, 75, 170, 75);

      doc.setTextColor(50, 50, 50);
      doc.setFontSize(12);
      doc.setFont('Helvetica', 'bold');
      doc.text('STUDENT INFORMATION', 30, 87);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Full Name:  ${student.full_name}`, 30, 97);
      doc.text(`Index Number:  ${student.index_number}`, 30, 105);
      doc.text(`Academic Level:  Level ${student.level}`, 30, 113);
      doc.text(`Class Group:  Class ${student.class_group}`, 30, 121);
      doc.text(`Academic Session:  ${session.academic_year} (Semester ${session.semester})`, 30, 129);
      
      const statusText = hasOverride 
        ? 'COMPASSIONATE EXEMPTION (HOD OVERRIDE)' 
        : 'FULLY CLEARED (PAID IN FULL)';
      
      doc.setTextColor(39, 103, 73);
      doc.setFont('Helvetica', 'bold');
      doc.text(`Status:  ${statusText}`, 30, 139);

      // Draw verification QR Code inside student info box
      if (qrImg) {
        doc.addImage(qrImg, 'PNG', 150, 85, 30, 30);
      }

      // Eligibility Notice
      doc.setFillColor(240, 255, 244);
      doc.rect(20, 160, 170, 22, 'F');
      doc.setDrawColor(154, 230, 180);
      doc.rect(20, 160, 170, 22);
      doc.setTextColor(39, 103, 73);
      doc.setFontSize(10);
      doc.text('The student listed above has no financial holds and is fully cleared to sit for', 105, 169, { align: 'center' });
      doc.text('all departmental papers and receive exam dockets for the current semester.', 105, 175, { align: 'center' });

      // Signatures
      doc.setTextColor(10, 37, 64);
      doc.setFontSize(11);
      doc.text('_______________________', 40, 215);
      doc.text('Head of Department', 40, 222);
      doc.setFontSize(9);
      doc.text('Ho Technical University', 40, 227);

      doc.setFontSize(11);
      doc.text('_______________________', 130, 215);
      doc.text('Date of Issue', 130, 222);
      doc.text(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), 130, 227);

      // Verification Footer
      doc.setDrawColor(10, 37, 64);
      doc.line(20, 250, 190, 250);
      doc.setTextColor(120, 120, 120);
      doc.setFontSize(9);
      doc.text(`Verification Ref: ${verCode}`, 105, 258, { align: 'center' });
      doc.text('Verify clearance status at: https://dues.compssa.htu.edu.gh/verify', 105, 264, { align: 'center' });
      doc.setTextColor(180, 180, 180);
      doc.text('This is an immutable system clearance certificate generated via OAuth credentials.', 105, 272, { align: 'center' });

      doc.save(`HTU_Dues_Clearance_${student.index_number}.pdf`);
    } catch (err) {
      console.error(err);
      setError('Failed to generate clearance slip.');
    } finally {
      setCertLoading(false);
    }
  };

  // Generate Statement of Lifetime Payments (US-8.2)
  const generateStatement = async () => {
    setStatementLoading(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const student = dashboardData.student;
      const balance = dashboardData.balance;

      // Letterhead
      doc.setFillColor(10, 37, 64);
      doc.rect(0, 0, 210, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('HO TECHNICAL UNIVERSITY', 105, 15, { align: 'center' });
      doc.setFontSize(11);
      doc.text('DEPARTMENT OF COMPUTER SCIENCE - DUES LEDGER', 105, 25, { align: 'center' });

      // Statement Metadata
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(12);
      doc.text('DUES PAYMENT HISTORY STATEMENT', 20, 48);
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Student: ${student.full_name} (${student.index_number})`, 20, 56);
      doc.text(`Academic Level: Level ${student.level} Class ${student.class_group}`, 20, 62);
      doc.text(`Total Lifetime Paid: ${balance.total_paid}`, 20, 68);
      doc.text(`Date Exported: ${new Date().toLocaleDateString('en-GB')}`, 140, 56);

      // Ledger Table Headers
      doc.setFillColor(230, 235, 245);
      doc.rect(20, 78, 170, 8, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.text('Date', 25, 83);
      doc.text('Reference', 55, 83);
      doc.text('Semester/Year', 95, 83);
      doc.text('Method', 135, 83);
      doc.text('Amount', 170, 83);

      // Ledger Rows
      let yOffset = 93;
      doc.setFont('Helvetica', 'normal');
      history.forEach((tx) => {
        const dateStr = new Date(tx.created_at).toLocaleDateString('en-GB');
        doc.text(dateStr, 25, yOffset);
        doc.text(tx.payment_reference, 55, yOffset);
        doc.text(`${tx.academic_year} Sem ${tx.semester}`, 95, yOffset);
        doc.text(tx.payment_method || 'CASH', 135, yOffset);
        doc.text(`₵${parseFloat(tx.amount).toFixed(2)}`, 170, yOffset);
        
        doc.setDrawColor(240, 240, 240);
        doc.line(20, yOffset + 3, 190, yOffset + 3);
        yOffset += 10;
      });

      // Total Paid Summary at bottom
      doc.setFont('Helvetica', 'bold');
      doc.text(`Total Paid: ${balance.total_paid}`, 150, yOffset + 5);

      doc.save(`HTU_Dues_Statement_${student.index_number}.pdf`);
    } catch (err) {
      console.error(err);
      setError('Failed to generate statement PDF.');
    } finally {
      setStatementLoading(false);
    }
  };

  if (loading) return <div style={styles.loading}>Loading student portal...</div>;

  const balance = dashboardData?.balance;
  const student = dashboardData?.student;
  const session = dashboardData?.session;

  return (
    <div style={styles.container}>
      {/* Navbar */}
      <div style={styles.navbar}>
        <div>
          <h1 style={styles.navTitle}>HTU Computer Science — Student Portal</h1>
        </div>
        <div style={styles.navRight}>
          <span style={styles.navUser}>👋 {student?.full_name}</span>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div style={styles.content}>
        {error && <div style={styles.error}>{error}</div>}
        {successMsg && <div style={styles.success}>{successMsg}</div>}

        {/* Welcome Banner */}
        <div style={styles.welcomeCard}>
          <div style={styles.welcomeInfo}>
            <h2 style={styles.welcomeTitle}>Welcome back, {student?.full_name}!</h2>
            <p style={styles.welcomeSub}>
              Level {student?.level} Class {student?.class_group} | {session?.academic_year} Semester {session?.semester}
            </p>
          </div>
          <div style={styles.clearanceBadgeWrapper}>
            <span style={balance?.status === 'CLEARED' || balance?.has_override ? styles.badgeCleared : styles.badgeOwing}>
              {balance?.status === 'CLEARED' ? '✅ FULLY CLEARED' : balance?.has_override ? 'ℹ️ EXAM CLEARANCE GRANTED' : '⚠️ OUTSTANDING BALANCE'}
            </span>
          </div>
        </div>

        {/* Dues Breakdown Grid (US-8.1.4) */}
        <div style={styles.gridRow}>
          <div style={styles.duesBreakdownCard}>
            <h3 style={styles.cardSectionTitle}>Semester Dues Ledger</h3>
            <div style={styles.ledgerRow}>
              <span>Current Semester Dues:</span>
              <strong style={styles.ledgerAmount}>{balance?.current_dues}</strong>
            </div>
            <div style={styles.ledgerRow}>
              <span>Previous Carryover Balance:</span>
              <strong style={{ ...styles.ledgerAmount, color: parseFloat(balance?.previous_balance.replace('₵', '')) > 0 ? '#e53e3e' : '#2d3748' }}>
                {balance?.previous_balance}
              </strong>
            </div>
            <div style={styles.ledgerDivider} />
            <div style={{ ...styles.ledgerRow, ...styles.ledgerTotal }}>
              <span>Total Outstanding Dues:</span>
              <strong style={styles.ledgerAmountTotal}>{balance?.total_outstanding}</strong>
            </div>

            {balance?.has_override && (
              <div style={styles.overrideAlert}>
                <strong>Compassionate Exam Exception Active</strong>
                <p style={styles.overrideReason}>Reason: "{balance.override_reason}"</p>
                <span style={styles.overrideNotice}>* Note: Outstanding financial balance remains unchanged on the ledger.</span>
              </div>
            )}

            {/* Clearance Certificate Action (US-1.2) */}
            {(balance?.status === 'CLEARED' || balance?.has_override) ? (
              <div style={styles.actionBlock}>
                <button
                  onClick={generateCertificate}
                  style={styles.certBtn}
                  disabled={certLoading}
                >
                  {certLoading ? '⏳ Generating Certificate...' : '📄 Download Clearance Certificate'}
                </button>
              </div>
            ) : (
              <div style={styles.actionBlock}>
                <button
                  onClick={handlePayRequest}
                  style={payLoading ? { ...styles.payBtn, opacity: 0.7 } : styles.payBtn}
                  disabled={payLoading}
                >
                  {payLoading ? '⏳ Generating...' : '💳 Pay Dues Now'}
                </button>
                <p style={styles.cardHelpNote}>Generates reference and opens MoMo prompt</p>
              </div>
            )}
          </div>

          {/* Reference display if pending */}
          {reference && (
            <div style={styles.referenceCard}>
              <h3 style={styles.refTitle}>Momo Reference Info</h3>
              <div style={styles.refCode}>{reference.reference}</div>
              <p style={styles.refAmount}>Amount: {reference.amount}</p>
              
              {/* QR Code for scanning (AC 1.1.3 Requirement) */}
              <div style={{ textAlign: 'center', margin: '14px 0' }}>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#718096', display: 'block', marginBottom: '6px' }}>Scan QR to Pay:</span>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(reference.reference)}`} 
                  alt="Payment QR Code" 
                  style={{ width: '110px', height: '110px', border: '1px solid #e2e8f0', padding: '4px', borderRadius: '8px', backgroundColor: '#fff', display: 'inline-block' }} 
                />
              </div>

              <div style={styles.refDivider} />
              
              <button 
                onClick={() => { setMomoStep(1); setShowMomoModal(true); }}
                style={styles.simulatePayBtn}
              >
                📱 Open MoMo Payment Interface
              </button>

              <div style={styles.usdsBlock}>
                <span style={styles.usdTitle}>Offline Manual USSD Code:</span>
                <code>{reference.instructions}</code>
              </div>
            </div>
          )}
        </div>

        {/* Class Fund Transparency Widget (US-7.2) */}
        {classFund && (
          <div style={styles.transparencyCard}>
            <h3 style={styles.cardSectionTitle}>📊 Class Fund Transparency Dashboard (Level {student?.level})</h3>
            <div style={styles.transparencyGrid}>
              <div style={styles.transpBox}>
                <span style={styles.transpLabel}>Total Dues Collected</span>
                <strong style={styles.transpVal}>₵{parseFloat(classFund.total_collected).toFixed(2)}</strong>
              </div>
              <div style={styles.transpBox}>
                <span style={styles.transpLabel}>Total Expenses Disbursed</span>
                <strong style={{ ...styles.transpVal, color: '#e53e3e' }}>₵{parseFloat(classFund.total_spent).toFixed(2)}</strong>
              </div>
              <div style={styles.transpBox}>
                <span style={styles.transpLabel}>Current Fund Balance</span>
                <strong style={{ ...styles.transpVal, color: '#2b6cb0' }}>₵{parseFloat(classFund.current_balance).toFixed(2)}</strong>
              </div>
            </div>

            <h4 style={styles.subSectionTitle}>Approved Class Projects / Expenditures</h4>
            {classFund.recent_expenses.length === 0 ? (
              <p style={styles.noExpensesText}>No expenses disbursed yet for Level {student?.level} this semester.</p>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Project / Item Description</th>
                      <th style={styles.th}>Approved By</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classFund.recent_expenses.map((expense, idx) => (
                      <tr key={idx} style={styles.tableRow}>
                        <td style={styles.td}>{new Date(expense.date).toLocaleDateString('en-GB')}</td>
                        <td style={styles.td}>{expense.description}</td>
                        <td style={styles.td}>{expense.approved_by || 'Dr. Joseph Darko'}</td>
                        <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>₵{parseFloat(expense.amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Payment History and Filters (US-8.2) */}
        <div style={styles.historyCard}>
          <div style={styles.historyHeader}>
            <h3 style={styles.cardSectionTitle}>📋 Dues Payment History</h3>
            <button 
              onClick={generateStatement}
              style={styles.statementBtn}
              disabled={statementLoading}
            >
              {statementLoading ? 'Generating...' : '📥 Download Full Statement (PDF)'}
            </button>
          </div>

          <div style={styles.filterBar}>
            {['All', 'Level 100', 'Level 200', 'Level 300', 'Level 400'].map((filter) => (
              <button
                key={filter}
                onClick={() => handleHistoryFilterChange(filter)}
                style={{
                  ...styles.filterBtn,
                  ...(historyFilter === filter ? styles.activeFilterBtn : {})
                }}
              >
                {filter}
              </button>
            ))}
          </div>

          {history.length === 0 ? (
            <p style={styles.noHistoryText}>No payments logged for the selected filter.</p>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Reference Code</th>
                    <th style={styles.th}>Academic Semester</th>
                    <th style={styles.th}>Payment Method</th>
                    <th style={styles.th}>Status</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((tx) => (
                    <tr key={tx.id} style={styles.tableRow}>
                      <td style={styles.td}>{new Date(tx.created_at).toLocaleDateString('en-GB')}</td>
                      <td style={styles.td}><code>{tx.payment_reference}</code></td>
                      <td style={styles.td}>{tx.academic_year} Sem {tx.semester}</td>
                      <td style={styles.td}>{tx.payment_method?.replace('MOMO_', '') || 'MoMo'}</td>
                      <td style={styles.td}>
                        <span style={tx.status === 'RECONCILED' || tx.status === 'PAID' ? styles.statusBadgePaid : styles.statusBadgePending}>
                          {tx.status}
                        </span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>₵{parseFloat(tx.amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Interactive MoMo Payment Dialog Modal (COMPSSA Hackathon Specific UI) */}
      {showMomoModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.momoCard}>
            <div style={styles.momoHeader}>
              <span>Mobile Money Gateway</span>
              <button onClick={() => setShowMomoModal(false)} style={styles.closeModalBtn}>×</button>
            </div>
            
            {momoStep === 1 && (
              <form onSubmit={handleMomoSubmit} style={styles.momoForm}>
                <h4 style={styles.momoPromptTitle}>Payment Authorization</h4>
                <p style={styles.momoText}>Select your Mobile Money provider and enter your 10-digit wallet number to pay <strong>{reference?.amount}</strong>.</p>
                
                <div style={styles.providerRow}>
                  <button 
                    type="button" 
                    onClick={() => setMomoProvider('MOMO_MTN')} 
                    style={{ ...styles.providerBtn, ...(momoProvider === 'MOMO_MTN' ? styles.activeMtn : {}) }}
                  >
                    MTN MoMo
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setMomoProvider('MOMO_VODAFONE')} 
                    style={{ ...styles.providerBtn, ...(momoProvider === 'MOMO_VODAFONE' ? styles.activeTelecel : {}) }}
                  >
                    Telecel Cash
                  </button>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.momoLabel}>Mobile Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 0541234567"
                    value={momoNumber}
                    onChange={(e) => setMomoNumber(e.target.value)}
                    style={styles.momoInput}
                    required
                  />
                </div>

                <button type="submit" style={styles.momoSubmitBtn}>
                  Authorize Payment Request
                </button>
              </form>
            )}

            {momoStep === 2 && (
              <div style={styles.momoForm}>
                <div style={styles.simulatedPhoneScreen}>
                  <div style={styles.phoneHeader}>MOMO MERCHANT AUTH</div>
                  <p style={styles.phonePrompt}>
                    Authorize transaction of <strong>{reference?.amount}</strong> to <strong>COMPSSA-HTU</strong>.
                  </p>
                  <div style={styles.inputGroup}>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="Enter 4-Digit Wallet PIN"
                      value={momoPin}
                      onChange={(e) => setMomoPin(e.target.value)}
                      style={styles.phonePinInput}
                      required
                    />
                  </div>
                  <div style={styles.phoneActions}>
                    <button 
                      onClick={() => setShowMomoModal(false)} 
                      style={{ ...styles.phoneBtn, color: '#e53e3e' }}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleMomoConfirmPayment} 
                      style={{ ...styles.phoneBtn, color: '#2b6cb0', fontWeight: 'bold' }}
                      disabled={payLoading}
                    >
                      {payLoading ? 'Sending...' : 'Confirm'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {momoStep === 3 && (
              <div style={styles.momoSuccessState}>
                <div style={styles.successIcon}>✓</div>
                <h4 style={styles.successText}>Transaction Cleared</h4>
                <p style={styles.successDesc}>Your payment has been successfully auto-reconciled and posted to the departmental ledger.</p>
                <button 
                  onClick={() => setShowMomoModal(false)} 
                  style={styles.closeSuccessBtn}
                >
                  Return to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}
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
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  },
  navTitle: { margin: 0, fontSize: '18px', fontWeight: 'bold', letterSpacing: '0.3px' },
  navRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  navUser: { fontSize: '14px', fontWeight: '500' },
  logoutBtn: {
    backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.4)',
    color: '#fff', padding: '6px 14px', borderRadius: '6px',
    cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s',
  },
  content: { maxWidth: '1100px', margin: '0 auto', padding: '30px' },
  error: {
    backgroundColor: '#fff5f5', border: '1px solid #feb2b2',
    color: '#c53030', padding: '14px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px'
  },
  success: {
    backgroundColor: '#f0fff4', border: '1px solid #c6f6d5',
    color: '#22543d', padding: '14px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px'
  },
  welcomeCard: {
    backgroundColor: '#fff', borderRadius: '12px',
    padding: '28px', marginBottom: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    flexWrap: 'wrap', gap: '20px'
  },
  welcomeInfo: { display: 'flex', flexDirection: 'column', gap: '6px' },
  welcomeTitle: { margin: '0', color: '#0a2540', fontSize: '24px', fontWeight: 'bold' },
  welcomeSub: { margin: 0, color: '#627d98', fontSize: '14px' },
  clearanceBadgeWrapper: {},
  badgeCleared: {
    backgroundColor: '#e6fffa', color: '#234e52',
    padding: '8px 18px', borderRadius: '30px',
    fontWeight: 'bold', fontSize: '13px',
    border: '1.5px solid #b2f5ea',
    letterSpacing: '0.3px'
  },
  badgeOwing: {
    backgroundColor: '#fff5f5', color: '#742a2a',
    padding: '8px 18px', borderRadius: '30px',
    fontWeight: 'bold', fontSize: '13px',
    border: '1.5px solid #fed7d7',
    letterSpacing: '0.3px'
  },
  gridRow: { display: 'flex', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' },
  duesBreakdownCard: {
    flex: 1.2, minWidth: '320px', backgroundColor: '#fff',
    borderRadius: '12px', padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
  },
  cardSectionTitle: { margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold', color: '#0a2540', borderBottom: '1px solid #f0f4f8', paddingBottom: '10px' },
  ledgerRow: { display: 'flex', justifyContent: 'space-between', margin: '12px 0', fontSize: '14px', color: '#486581' },
  ledgerAmount: { color: '#0a2540', fontWeight: '600' },
  ledgerDivider: { height: '1px', backgroundColor: '#e2e8f0', margin: '14px 0' },
  ledgerTotal: { fontSize: '16px', fontWeight: 'bold', color: '#0a2540', margin: '16px 0' },
  ledgerAmountTotal: { fontSize: '18px', color: '#2b6cb0', fontWeight: 'bold' },
  overrideAlert: {
    backgroundColor: '#ebf8ff', border: '1px solid #bee3f8',
    borderRadius: '8px', padding: '12px 16px', margin: '16px 0',
  },
  overrideReason: { fontSize: '13px', color: '#2b6cb0', margin: '4px 0', fontStyle: 'italic' },
  overrideNotice: { fontSize: '11px', color: '#4a5568', opacity: 0.8 },
  actionBlock: { marginTop: '20px', textAlign: 'center' },
  certBtn: {
    backgroundColor: '#003087', color: '#fff',
    padding: '12px 30px', borderRadius: '8px',
    border: 'none', fontSize: '14px', fontWeight: 'bold',
    cursor: 'pointer', boxShadow: '0 4px 14px rgba(0, 48, 135, 0.3)',
    width: '100%', transition: 'all 0.2s',
  },
  payBtn: {
    backgroundColor: '#2d6a4f', color: '#fff',
    padding: '12px 30px', borderRadius: '8px',
    border: 'none', fontSize: '14px', fontWeight: 'bold',
    cursor: 'pointer', boxShadow: '0 4px 14px rgba(45, 106, 79, 0.3)',
    width: '100%', transition: 'all 0.2s',
  },
  cardHelpNote: { fontSize: '11px', color: '#829ab1', marginTop: '6px', margin: '6px 0 0 0' },
  referenceCard: {
    flex: 1, minWidth: '300px', backgroundColor: '#fff',
    borderRadius: '12px', padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    alignItems: 'center', border: '2px dashed #cbd5e0',
  },
  refTitle: { margin: '0', fontSize: '14px', fontWeight: 'bold', color: '#486581' },
  refCode: {
    fontSize: '26px', fontWeight: 'bold', color: '#003087',
    backgroundColor: '#f7fafc', padding: '14px 24px', borderRadius: '8px',
    margin: '12px 0', letterSpacing: '1px', border: '1px solid #e2e8f0',
  },
  refAmount: { fontSize: '16px', fontWeight: 'bold', color: '#2e7d32', margin: '0' },
  refDivider: { height: '1px', backgroundColor: '#e2e8f0', width: '100%', margin: '14px 0' },
  simulatePayBtn: {
    backgroundColor: '#1565c0', color: '#fff',
    padding: '10px 18px', borderRadius: '6px',
    border: 'none', fontSize: '13px', fontWeight: 'bold',
    cursor: 'pointer', width: '100%', transition: 'all 0.2s',
  },
  usdsBlock: { width: '100%', textAlign: 'center', marginTop: '12px' },
  usdTitle: { display: 'block', fontSize: '11px', color: '#718096', marginBottom: '4px' },
  transparencyCard: {
    backgroundColor: '#fff', borderRadius: '12px', padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '24px',
  },
  transparencyGrid: { display: 'flex', gap: '16px', flexWrap: 'wrap', margin: '20px 0' },
  transpBox: {
    flex: 1, minWidth: '160px', backgroundColor: '#f7fafc',
    border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px',
  },
  transpLabel: { fontSize: '11px', color: '#718096', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '6px' },
  transpVal: { fontSize: '20px', color: '#2d6a4f', fontWeight: 'bold' },
  subSectionTitle: { fontSize: '14px', fontWeight: 'bold', color: '#0a2540', margin: '20px 0 10px 0' },
  noExpensesText: { fontSize: '13px', color: '#a0aec0', fontStyle: 'italic', margin: '10px 0' },
  tableWrapper: { overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  tableHeaderRow: { backgroundColor: '#f7fafc', borderBottom: '1.5px solid #e2e8f0' },
  th: { padding: '12px 16px', textAlign: 'left', fontWeight: 'bold', color: '#4a5568' },
  tableRow: { borderBottom: '1px solid #f0f4f8', transition: 'background-color 0.2s' },
  td: { padding: '12px 16px', color: '#2d3748' },
  historyCard: {
    backgroundColor: '#fff', borderRadius: '12px', padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
  },
  historyHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' },
  statementBtn: {
    backgroundColor: '#f7fafc', border: '1.5px solid #cbd5e0',
    color: '#4a5568', padding: '8px 16px', borderRadius: '6px',
    cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s'
  },
  filterBar: { display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' },
  filterBtn: {
    padding: '6px 14px', border: '1px solid #d9e2ec',
    borderRadius: '20px', backgroundColor: '#fff',
    fontSize: '12px', color: '#486581', cursor: 'pointer', transition: 'all 0.2s'
  },
  activeFilterBtn: {
    backgroundColor: '#003087', color: '#fff', borderColor: '#003087', fontWeight: 'bold'
  },
  noHistoryText: { fontSize: '13px', color: '#a0aec0', fontStyle: 'italic', margin: '20px 0', textAlign: 'center' },
  statusBadgePaid: {
    backgroundColor: '#c6f6d5', color: '#22543d', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold'
  },
  statusBadgePending: {
    backgroundColor: '#feebc8', color: '#744210', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold'
  },
  // Modal Styles
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(10, 37, 64, 0.65)', backdropFilter: 'blur(4px)',
    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
  },
  momoCard: {
    backgroundColor: '#fff', width: '92%', maxWidth: '380px',
    borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
  },
  momoHeader: {
    backgroundColor: '#ffcc00', padding: '14px 20px', display: 'flex',
    justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold',
    color: '#000', fontSize: '14px',
  },
  closeModalBtn: {
    border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', fontWeight: 'bold'
  },
  momoForm: { padding: '24px' },
  momoPromptTitle: { margin: '0 0 10px 0', fontSize: '16px', color: '#0a2540', fontWeight: 'bold' },
  momoText: { fontSize: '13px', color: '#627d98', lineHeight: '1.5', margin: '0 0 20px 0' },
  providerRow: { display: 'flex', gap: '10px', marginBottom: '16px' },
  providerBtn: {
    flex: 1, padding: '10px', border: '1px solid #d9e2ec',
    borderRadius: '8px', backgroundColor: '#fff', fontSize: '12px',
    cursor: 'pointer', fontWeight: '600', color: '#627d98', transition: 'all 0.2s'
  },
  activeMtn: {
    backgroundColor: '#fff9db', borderColor: '#fab005', color: '#000'
  },
  activeTelecel: {
    backgroundColor: '#fff5f5', borderColor: '#fa5252', color: '#e53e3e'
  },
  momoLabel: { fontSize: '11px', fontWeight: 'bold', color: '#627d98', display: 'block', marginBottom: '6px' },
  momoInput: {
    padding: '10px 14px', border: '1.5px solid #d9e2ec',
    borderRadius: '8px', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box'
  },
  momoSubmitBtn: {
    backgroundColor: '#ffcc00', color: '#000', border: 'none',
    width: '100%', padding: '12px', borderRadius: '8px', fontSize: '14px',
    fontWeight: 'bold', cursor: 'pointer', marginTop: '16px', transition: 'opacity 0.2s'
  },
  simulatedPhoneScreen: {
    backgroundColor: '#1a1a1a', borderRadius: '12px', padding: '20px',
    color: '#fff', fontFamily: 'monospace', textAlign: 'center', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8)'
  },
  phoneHeader: {
    fontSize: '11px', color: '#888', borderBottom: '1px solid #333', paddingBottom: '6px', marginBottom: '14px'
  },
  phonePrompt: { fontSize: '12px', lineHeight: '1.6', color: '#ddd', marginBottom: '16px' },
  phonePinInput: {
    backgroundColor: '#2a2a2a', border: '1px solid #444', color: '#fff',
    padding: '8px', borderRadius: '6px', fontSize: '18px', textAlign: 'center',
    width: '120px', letterSpacing: '4px', outline: 'none'
  },
  phoneActions: { display: 'flex', justifyContent: 'space-around', marginTop: '20px' },
  phoneBtn: {
    border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', fontFamily: 'monospace'
  },
  momoSuccessState: {
    padding: '30px 24px', textAlign: 'center'
  },
  successIcon: {
    width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#e6fffa',
    color: '#38b2ac', fontSize: '24px', fontWeight: 'bold', display: 'flex',
    justifyContent: 'center', alignItems: 'center', margin: '0 auto 16px auto'
  },
  successText: { margin: '0 0 8px 0', fontSize: '16px', color: '#0a2540', fontWeight: 'bold' },
  successDesc: { fontSize: '13px', color: '#627d98', lineHeight: '1.5', margin: '0 0 20px 0' },
  closeSuccessBtn: {
    backgroundColor: '#003087', color: '#fff', border: 'none',
    padding: '10px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer'
  }
};

export default StudentDashboard;