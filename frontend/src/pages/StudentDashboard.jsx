import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBalance, generatePaymentReference } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const StudentDashboard = () => {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [reference, setReference] = useState(null);
  const [error, setError] = useState('');
  const [certLoading, setCertLoading] = useState(false);
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const certificateRef = useRef();

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

  // Generate Certificate PDF
  const generateCertificate = async () => {
    setCertLoading(true);
    try {
      // Check if user is cleared
      if (balance?.balance?.status !== 'CLEARED') {
        setError('You must clear all dues before downloading a certificate.');
        setCertLoading(false);
        return;
      }

      // Create a temporary div for the certificate
      const certDiv = document.createElement('div');
      certDiv.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 800px;
        padding: 40px;
        background: white;
        font-family: 'Times New Roman', serif;
        border: 2px solid #003087;
        border-radius: 8px;
      `;
      
      // Generate verification code
      const verCode = `HTU-COMP-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      certDiv.innerHTML = `
        <div style="text-align:center; border-bottom: 3px double #003087; padding-bottom: 20px; margin-bottom: 20px;">
          <h1 style="color: #003087; font-size: 28px; margin: 0;">HO TECHNICAL UNIVERSITY</h1>
          <h2 style="color: #0051d4; font-size: 20px; margin: 5px 0;">COMPUTER SCIENCE DEPARTMENT</h2>
          <p style="font-size: 14px; color: #666; margin: 5px 0;">P.O. Box HP 217, Ho, Volta Region, Ghana</p>
        </div>
        
        <div style="text-align:center; margin: 30px 0;">
          <h2 style="font-size: 24px; text-transform: uppercase; letter-spacing: 4px; color: #003087;">DEPARTMENTAL CLEARANCE CERTIFICATE</h2>
          <p style="font-size: 14px; color: #666;">This certifies that the following student has cleared all departmental dues</p>
        </div>

        <div style="background: #f0f4ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; font-size: 16px; border-collapse: collapse;">
            <tr><td style="padding: 8px; font-weight: bold; width: 40%;">Full Name:</td>
                <td style="padding: 8px;">${balance?.student?.full_name || 'N/A'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Index Number:</td>
                <td style="padding: 8px;">${balance?.student?.index_number || 'N/A'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Current Level:</td>
                <td style="padding: 8px;">${balance?.student?.level || 'N/A'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Academic Year:</td>
                <td style="padding: 8px;">${balance?.session?.academic_year || 'N/A'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Semester:</td>
                <td style="padding: 8px;">Semester ${balance?.session?.semester || 'N/A'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Status:</td>
                <td style="padding: 8px; color: #276749; font-weight: bold; font-size: 18px;">✅ CLEARED</td></tr>
          </table>
        </div>

        <div style="text-align:center; margin: 20px 0; padding: 15px; background: #f0fff4; border-radius: 8px; border: 1px solid #9ae6b4;">
          <p style="font-size: 14px; margin: 0; color: #276749;">This student has no financial holds with the department and is eligible for:</p>
          <p style="font-size: 14px; margin: 5px 0; color: #276749;">📚 Registration • 📝 Examinations • 🎓 Graduation • 💼 Internships</p>
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <div style="text-align: center; flex: 1;">
            <div style="border-top: 1px solid #000; padding-top: 8px; margin-top: 40px; width: 200px; display: inline-block;">
              <p style="margin: 0; font-size: 12px;">Head of Department</p>
              <p style="margin: 0; font-size: 12px; color: #666;">Computer Science Department</p>
            </div>
          </div>
          <div style="text-align: center; flex: 1;">
            <div style="border-top: 1px solid #000; padding-top: 8px; margin-top: 40px; width: 200px; display: inline-block;">
              <p style="margin: 0; font-size: 12px;">Date Issued</p>
              <p style="margin: 0; font-size: 12px; color: #666;">${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
        </div>

        <div style="text-align:center; margin-top: 30px; padding-top: 15px; border-top: 2px double #003087;">
          <p style="font-size: 12px; color: #666; margin: 0;">Verification Code: <strong style="color: #003087;">${verCode}</strong></p>
          <p style="font-size: 12px; color: #666; margin: 5px 0;">Verify at: https://htu.edu.gh/verify</p>
          <p style="font-size: 11px; color: #a0aec0; margin: 5px 0;">This certificate is electronically generated and does not require a signature</p>
        </div>
      `;
      
      document.body.appendChild(certDiv);

      // Convert to canvas and then to PDF
      const canvas = await html2canvas(certDiv, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Clearance_Certificate_${balance?.student?.index_number || 'Student'}.pdf`);
      
      document.body.removeChild(certDiv);
      setCertLoading(false);
    } catch (err) {
      console.error('Certificate generation error:', err);
      setError('Failed to generate certificate. Please try again.');
      setCertLoading(false);
    }
  };

  if (loading) return <div style={styles.loading}>Loading your dashboard...</div>;

  return (
    <div style={styles.container}>
      {/* Navbar */}
      <div style={styles.navbar}>
        <div>
          <h1 style={styles.navTitle}>HTU Computer Science — Student Dues</h1>
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

        {/* NEW: Download Certificate Button */}
        {balance?.balance?.status === 'CLEARED' && (
          <div style={styles.certSection}>
            <button
              onClick={generateCertificate}
              style={certLoading ? { ...styles.certBtn, opacity: 0.7 } : styles.certBtn}
              disabled={certLoading}
            >
              {certLoading ? '⏳ Generating Certificate...' : '📄 Download Clearance Certificate'}
            </button>
            <p style={styles.certNote}>PDF certificate with official department letterhead</p>
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
  certSection: { textAlign: 'center', marginBottom: '24px' },
  certBtn: {
    backgroundColor: '#003087', color: '#fff',
    padding: '14px 40px', borderRadius: '8px',
    border: 'none', fontSize: '16px',
    fontWeight: 'bold', cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,48,135,0.3)',
  },
  certNote: {
    fontSize: '12px', color: '#718096',
    marginTop: '8px',
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