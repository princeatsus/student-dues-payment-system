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
import { 
  Menu, 
  X, 
  Bell, 
  User, 
  BookOpen, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Download,
  DollarSign,
  QrCode,
  ArrowRight,
  TrendingUp,
  Inbox,
  Search,
  MessageSquare,
  LogOut
} from 'lucide-react';

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

  // Hamburger Menu Mobile Toggle
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [darkMode, setDarkMode] = useState(false);

  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  // Handle window resize for mobile navigation
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const handleTriggerPaystack = async (transactionId, refCode, amountText) => {
    const numericAmount = parseFloat(amountText.replace(/[₵\s,]/g, ''));
    const amountInPesewas = Math.round(numericAmount * 100);

    if (typeof window.PaystackPop === 'undefined' || typeof window.PaystackPop.setup !== 'function') {
      alert('⚠️ Paystack payment service is currently loading. Please wait a second and try again.');
      return;
    }

    const handler = window.PaystackPop.setup({
      key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0',
      email: user?.email || 'student@htu.edu.gh',
      amount: amountInPesewas,
      currency: 'GHS',
      ref: refCode,
      callback: function(response) {
        setPayLoading(true);
        confirmPayment(transactionId, {
          payment_method: 'MOMO_MTN',
          notes: `Paystack Ref: ${response.reference}`
        })
        .then(() => {
          alert('🎉 Dues paid successfully! Your account is now cleared.');
          fetchData();
        })
        .catch((err) => {
          alert('⚠️ Error confirming transaction with backend: ' + (err.response?.data?.message || err.message));
        })
        .finally(() => {
          setPayLoading(false);
        });
      },
      onClose: () => {
        alert('❌ Payment cancelled.');
      }
    });

    handler.openIframe();
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
      await handleTriggerPaystack(refData.transaction.id, refData.reference, refData.amount);
    } catch (err) {
      console.error('Payment generation error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to generate payment reference.');
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

      // Circular digital seal / stamp
      doc.setDrawColor(26, 86, 219); // Royal Blue Seal
      doc.setLineWidth(0.8);
      doc.circle(95, 218, 14); // circular seal outline
      doc.setFillColor(239, 246, 255);
      doc.circle(95, 218, 13.5, 'FD'); // filled circle
      
      doc.setTextColor(26, 86, 219);
      doc.setFontSize(5);
      doc.setFont('Helvetica', 'bold');
      doc.text('HTU COMPSSA', 95, 212, { align: 'center' });
      doc.setFontSize(8);
      doc.text('APPROVED', 95, 219, { align: 'center' });
      doc.setFontSize(5);
      doc.text('DEPT CLEARANCE', 95, 225, { align: 'center' });

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
      doc.text(`Level / Group: Level ${student.level} Class ${student.class_group}`, 20, 62);
      doc.text(`Statement Generated: ${new Date().toLocaleDateString('en-GB')}`, 20, 68);

      // Table Headers
      doc.setFillColor(240, 244, 248);
      doc.rect(20, 78, 170, 10, 'F');
      doc.setTextColor(10, 37, 64);
      doc.setFont('Helvetica', 'bold');
      doc.text('Date', 25, 84);
      doc.text('Reference Code', 55, 84);
      doc.text('Semester/Year', 95, 84);
      doc.text('Payment Method', 135, 84);
      doc.text('Amount', 170, 84);

      // Table Rows
      let yOffset = 96;
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(80, 80, 80);

      history.forEach((tx) => {
        if (yOffset > 270) {
          doc.addPage();
          yOffset = 30;
        }
        doc.text(new Date(tx.created_at).toLocaleDateString('en-GB'), 25, yOffset);
        doc.text(tx.payment_reference, 55, yOffset);
        doc.text(`${tx.academic_year} Sem ${tx.semester}`, 95, yOffset);
        doc.text(tx.payment_method?.replace('MOMO_', '') || 'MoMo', 135, yOffset);
        doc.text(`GHS ${parseFloat(tx.amount).toFixed(2)}`, 170, yOffset);
        yOffset += 10;
      });

      doc.save(`HTU_Dues_Statement_${student.index_number}.pdf`);
    } catch (err) {
      console.error(err);
      setError('Failed to generate statement of payment history.');
    } finally {
      setStatementLoading(false);
    }
  };

  const student = dashboardData?.student;
  const session = dashboardData?.session;
  const balance = dashboardData?.balance;

  const isCleared = balance?.status === 'CLEARED' || balance?.has_override;
  const hasOutstanding = balance && !isCleared;
  const initial = student?.full_name ? student.full_name.charAt(0).toUpperCase() : 'S';

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <div style={{ marginTop: '16px', fontSize: '15px', color: '#1a56db', fontWeight: '600' }}>
          Loading SDMS dashboard...
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div style={styles.loadingContainer}>
        {error && <div style={{ ...styles.errorBox, maxWidth: '400px' }}>⚠️ {error}</div>}
        <button onClick={fetchData} style={{ ...styles.payBtn, width: 'auto', marginTop: '12px' }}>
          🔄 Retry Loading Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container} className={darkMode ? 'dark-mode' : ''}>
      {darkMode && (
        <style>{`
          .dark-mode {
            background-color: #0f172a !important;
            color: #f8fafc !important;
          }
          .dark-mode .navbar-override {
            background-color: #1e293b !important;
            color: #f8fafc !important;
            border-bottom: 1px solid #334155 !important;
          }
          .dark-mode .card-override {
            background-color: #1e293b !important;
            border-color: #334155 !important;
            color: #f8fafc !important;
          }
          .dark-mode .card-header-override {
            background-color: #1e293b !important;
            background: #1e293b !important;
            border-bottom: 1.5px solid #334155 !important;
            color: #ffffff !important;
          }
          .dark-mode .transp-box-override {
            background-color: #334155 !important;
            border-color: #475569 !important;
            color: #cbd5e1 !important;
          }
          .dark-mode .text-title {
            color: #ffffff !important;
          }
          .dark-mode .text-muted {
            color: #94a3b8 !important;
          }
          .dark-mode .text-blue {
            color: #60a5fa !important;
          }
          .dark-mode .text-blue-dark {
            color: #93c5fd !important;
          }
          .dark-mode .text-red {
            color: #f43f5e !important;
          }
          .dark-mode .filters-override {
            background-color: #1e293b !important;
            border-color: #334155 !important;
          }
          .dark-mode button.filters-override {
            background-color: #334155 !important;
            color: #cbd5e1 !important;
            border-color: #475569 !important;
          }
          .dark-mode button.filters-override.active-filter-override {
            background-color: #2563eb !important;
            color: #ffffff !important;
            border-color: #2563eb !important;
          }
          .dark-mode .th-override {
            background-color: #334155 !important;
            border-bottom-color: #475569 !important;
            color: #ffffff !important;
          }
          .dark-mode .td-override {
            border-bottom-color: #334155 !important;
            color: #cbd5e1 !important;
          }
          .dark-mode .input-override {
            background-color: #334155 !important;
            color: #ffffff !important;
            border-color: #475569 !important;
          }
          .dark-mode .logo-text {
            color: #93c5fd !important;
          }
          .dark-mode .bell-icon {
            color: #cbd5e1 !important;
          }
        `}</style>
      )}
      {/* Official HTU SDMS Style Header */}
      <div style={styles.navbar} className="navbar-override">
        <div style={styles.navLeft}>
          {isMobile && (
            <button onClick={() => setMenuOpen(!menuOpen)} style={styles.menuBtn}>
              {menuOpen ? <X size={20} style={{ color: '#1e3a8a' }} /> : <Menu size={20} style={{ color: '#1e3a8a' }} />}
            </button>
          )}
          <div style={styles.logoContainer}>
            <div style={styles.htuBadgeWrapper}>
              <div style={styles.htuBadgeCircle}>
                <span style={{ fontSize: '10px', color: '#1e3a8a', fontWeight: 'bold' }}>HTU</span>
              </div>
            </div>
            <span style={styles.sdmsText} className="logo-text">SDMS</span>
          </div>
        </div>

        <div style={styles.navRight}>
          {/* Notification Bell with Badge */}
          <div style={styles.bellWrapper}>
            <Bell size={20} style={{ color: '#475569' }} className="bell-icon" />
            {hasOutstanding && (
              <span style={styles.bellBadge}>1</span>
            )}
          </div>

          {/* Secondary controls shown ONLY on desktop to prevent mobile crowding */}
          {!isMobile && (
            <>
              {/* Chat Icon */}
              <div style={styles.chatWrapper}>
                <MessageSquare size={20} style={{ color: '#475569' }} />
              </div>

              {/* Student Profile Initial Circle */}
              <div style={styles.profileCircle}>
                {initial}
              </div>

              {/* Styled Dark Mode Toggle Mockup */}
              <div 
                onClick={() => setDarkMode(!darkMode)}
                style={{ 
                  ...styles.toggleTrack, 
                  backgroundColor: darkMode ? '#10b981' : '#cbd5e1' 
                }}
              >
                <div 
                  style={{ 
                    ...styles.toggleThumb, 
                    transform: darkMode ? 'translateX(16px)' : 'translateX(0px)' 
                  }}
                ></div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile Drawer Dropdown Menu */}
      {isMobile && menuOpen && (
        <div style={styles.mobileMenu}>
          <div style={styles.mobileMenuHeader}>
            <span style={styles.mobileMenuUser}>👋 Student: <strong>{student?.full_name}</strong></span>
            <span style={styles.mobileMenuIndex}>{student?.index_number}</span>
          </div>

          {/* Mobile Profile Display */}
          <div style={styles.mobileMenuRow}>
            <div style={{ ...styles.profileCircle, width: '28px', height: '28px', fontSize: '12px' }}>
              {initial}
            </div>
            <div style={{ color: '#93c5fd', fontSize: '11px', fontWeight: '600' }}>
              Level {student?.level} Class Group {student?.class_group}
            </div>
          </div>

          {/* Mobile Chat Link */}
          <div style={styles.mobileMenuItem}>
            <MessageSquare size={14} style={{ marginRight: '8px', color: '#93c5fd' }} />
            <span style={{ color: '#ffffff', fontSize: '12px', fontWeight: '600' }}>Class Messages</span>
          </div>

          {/* Mobile Dark Mode Toggle */}
          <div style={styles.mobileMenuToggleRow}>
            <span style={{ color: '#ffffff', fontSize: '12px', fontWeight: '600' }}>Dark Mode Theme</span>
            <div 
              onClick={() => setDarkMode(!darkMode)}
              style={{ 
                ...styles.toggleTrack, 
                backgroundColor: darkMode ? '#10b981' : '#475569',
                border: '1px solid #475569'
              }}
            >
              <div 
                style={{ 
                  ...styles.toggleThumb, 
                  transform: darkMode ? 'translateX(16px)' : 'translateX(0px)' 
                }}
              ></div>
            </div>
          </div>

          <button onClick={handleLogout} style={styles.mobileMenuLogoutBtn}>
            <LogOut size={14} style={{ marginRight: '8px' }} />
            Logout from SDMS
          </button>
        </div>
      )}

      {/* Main Content Body */}
      <div style={styles.content}>
        {/* Page Title */}
        <div style={styles.titleContainer}>
          <h2 style={styles.dashboardTitle} className="text-title">Dashboard</h2>
        </div>

        {error && <div style={styles.errorBox}>⚠️ {error}</div>}
        {successMsg && <div style={styles.successBox}>✅ {successMsg}</div>}

        {/* Welcome Card Banner */}
        <div style={styles.welcomeBanner}>
          <div style={styles.welcomeInfo}>
            <h3 style={styles.welcomeUserTitle}>Welcome back, {student?.full_name}!</h3>
            <p style={styles.welcomeUserSub}>
              Level {student?.level} Class Group {student?.class_group} · Current Semester: {session?.academic_year} Semester {session?.semester}
            </p>
          </div>
          <div style={styles.welcomeStatus}>
            <span style={isCleared ? styles.badgeCleared : styles.badgeOwing}>
              {isCleared ? '✅ FULLY CLEARED' : '⚠️ OUTSTANDING BALANCE'}
            </span>
          </div>
        </div>

        {/* Timeline / Dues Action Card (SDMS STYLE WITH BLUE TOP BORDER) */}
        <div style={styles.sdmsCard} className="card-override">
          <div style={styles.sdmsCardHeader} className="card-header-override">
            <h3 style={styles.sdmsCardTitle} className="text-title">Timeline</h3>
          </div>
          
          {/* Timeline Mock Filters matching screenshot */}
          <div style={styles.timelineFilters} className="filters-override">
            <div style={styles.filterDropdowns}>
              <select style={styles.sdmsSelect} disabled className="input-override">
                <option>Next 7 days</option>
              </select>
              <select style={styles.sdmsSelect} disabled className="input-override">
                <option>Sort by dates</option>
              </select>
            </div>
            <div style={styles.timelineSearchWrapper}>
              <Search size={13} style={styles.timelineSearchIcon} />
              <input 
                type="text" 
                placeholder="Search by activity type or name" 
                style={styles.timelineSearch} 
                className="input-override"
                disabled 
              />
            </div>
          </div>

          <div style={styles.timelineContent}>
            {/* If Student is fully cleared, show the official SDMS empty state look! */}
            {isCleared ? (
              <div style={styles.sdmsEmptyState}>
                <div style={styles.emptyIconWrapper}>
                  <FileText size={36} style={{ color: '#94a3b8' }} />
                </div>
                <h4 style={styles.emptyStateTitle}>No activities require action</h4>
                <p style={styles.emptyStateSub}>You are fully cleared for exams this semester. You can download your clearance slip below.</p>
                
                {balance?.has_override && (
                  <div style={styles.overrideAlert}>
                    <strong>Compassionate Exam Exception Active</strong>
                    <p style={styles.overrideReason}>Reason: "{balance.override_reason}"</p>
                    <span style={styles.overrideNotice}>* Note: Outstanding financial balance remains unchanged on the ledger.</span>
                  </div>
                )}

                <button
                  onClick={generateCertificate}
                  style={styles.certBtn}
                  disabled={certLoading}
                >
                  {certLoading ? '⏳ Generating Certificate...' : '📄 Download Clearance Certificate (PDF)'}
                </button>
              </div>
            ) : (
              /* If student owes, show dues ledger breakdown */
              <div style={styles.duesActiveTimeline}>
                <div style={styles.timelineAlertBadge}>⚠️ ACTION REQUIRED: OUTSTANDING DUES</div>
                
                <div style={styles.ledgerCard}>
                  <div style={styles.ledgerRow}>
                    <span>Current Semester Dues:</span>
                    <strong style={styles.ledgerAmount}>{balance?.current_dues}</strong>
                  </div>
                  <div style={styles.ledgerRow}>
                    <span>Previous Carryover Balance:</span>
                    <strong style={{ ...styles.ledgerAmount, color: parseFloat((balance?.previous_balance || '0').replace('₵', '')) > 0 ? '#f43f5e' : '#0f172a' }}>
                      {balance?.previous_balance}
                    </strong>
                  </div>
                  
                  {/* Payment Progress Tracker */}
                  {(() => {
                    const duesVal = parseFloat((balance?.current_dues || '0').replace(/[₵\s,]/g, '')) + parseFloat((balance?.previous_balance || '0').replace(/[₵\s,]/g, ''));
                    const paidVal = parseFloat((balance?.total_paid || '0').replace(/[₵\s,]/g, ''));
                    const progress = duesVal > 0 ? Math.min(100, Math.round((paidVal / duesVal) * 100)) : 0;
                    return (
                      <div style={{ marginTop: '12px', marginBottom: '12px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                          <span>Payment Progress</span>
                          <span>{progress}% Paid (₵{paidVal.toFixed(2)} of ₵{duesVal.toFixed(2)})</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div style={{ width: `${progress}%`, height: '100%', backgroundColor: progress >= 100 ? '#10b981' : '#3b82f6', transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    );
                  })()}

                  <div style={styles.ledgerDivider} />
                  <div style={{ ...styles.ledgerRow, ...styles.ledgerTotalRow }}>
                    <span>Total Outstanding Balance:</span>
                    <strong style={styles.ledgerTotalAmount}>{balance?.total_outstanding}</strong>
                  </div>
                </div>



                <div style={styles.paymentActionsBlock}>
                  <button
                    onClick={handlePayRequest}
                    style={payLoading ? { ...styles.payBtn, opacity: 0.7 } : styles.payBtn}
                    disabled={payLoading}
                  >
                    {payLoading ? '⏳ Initiating Payment...' : '💳 Pay Semester Dues Now'}
                  </button>
                  <p style={styles.cardHelpNote}>Generates unique reference code and opens Mobile Money Gateway prompt</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile USSD / QR Code display if reference is active */}
        {reference && !isCleared && (
          <div style={styles.sdmsCard} className="card-override">
            <div style={styles.sdmsCardHeader} className="card-header-override">
              <h3 style={styles.sdmsCardTitle} className="text-title">Mobile Money Reference Info</h3>
            </div>
            <div style={styles.refInfoContent}>
              <p style={styles.refCodeSub} className="text-muted">Your generated reference code:</p>
              <div style={styles.refCodeValue}>{reference.reference}</div>
              <p style={styles.refAmountVal}>Amount to Pay: <strong>{reference.amount}</strong></p>

              {/* QR Code */}
              <div style={styles.qrBlock}>
                <span style={styles.qrTitle}>Scan QR Code to Pay:</span>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(reference.reference)}`} 
                  alt="Payment QR Code" 
                  style={styles.qrImg} 
                />
              </div>

              <div style={styles.refDivider} />

              <button 
                onClick={() => handleTriggerPaystack(reference.id, reference.reference, reference.amount)}
                style={styles.momoGateBtn}
              >
                📱 Open MoMo Payment Interface
              </button>

              <div style={styles.ussdCodeBox}>
                <span style={styles.ussdTitle}>Offline Manual USSD Code:</span>
                <code style={styles.ussdCode}>{reference.instructions}</code>
              </div>
            </div>
          </div>
        )}

        {/* Class Fund Transparency Dashboard (SDMS STYLE WITH BLUE TOP BORDER) */}
        {classFund && (
          <div style={styles.sdmsCard} className="card-override">
            <div style={styles.sdmsCardHeader} className="card-header-override">
              <h3 style={styles.sdmsCardTitle} className="text-title">Class Fund Transparency Dashboard (Level {student?.level})</h3>
            </div>
            <div style={styles.transpContent}>
              <div style={styles.transpGrid}>
                <div style={styles.transpBox} className="transp-box-override">
                  <span style={styles.transpLabel} className="text-muted">Total Dues Collected</span>
                  <strong style={styles.transpVal} className="text-blue">₵{parseFloat(classFund.total_collected).toFixed(2)}</strong>
                </div>
                <div style={styles.transpBox} className="transp-box-override">
                  <span style={styles.transpLabel} className="text-muted">Total Dues Expenses Disbursed</span>
                  <strong style={{ ...styles.transpVal, color: '#f43f5e' }} className="text-red">₵{parseFloat(classFund.total_spent).toFixed(2)}</strong>
                </div>
                <div style={styles.transpBox} className="transp-box-override">
                  <span style={styles.transpLabel} className="text-muted">Current Fund Balance</span>
                  <strong style={{ ...styles.transpVal, color: '#1e3a8a' }} className="text-blue-dark">₵{parseFloat(classFund.current_balance).toFixed(2)}</strong>
                </div>
              </div>

              <h4 style={styles.tableHeading}>Approved Department Expenses / Projects</h4>
              {classFund.recent_expenses.length === 0 ? (
                <p style={styles.noDataText}>No expenditures have been approved yet this semester.</p>
              ) : (
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableHeaderRow}>
                        <th style={{ ...styles.th, textAlign: 'left' }} className="th-override">Date</th>
                        <th style={{ ...styles.th, textAlign: 'left' }} className="th-override">Description</th>
                        <th style={{ ...styles.th, textAlign: 'left' }} className="th-override">Approved By</th>
                        <th style={{ ...styles.th, textAlign: 'right' }} className="th-override">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classFund.recent_expenses.map((expense, idx) => (
                        <tr key={idx} style={styles.tableRow}>
                          <td style={{ ...styles.td, textAlign: 'left' }} className="td-override">{new Date(expense.date).toLocaleDateString('en-GB')}</td>
                          <td style={{ ...styles.td, textAlign: 'left' }} className="td-override">{expense.description}</td>
                          <td style={{ ...styles.td, textAlign: 'left' }} className="td-override">{expense.approved_by || 'Dr. Joseph Darko'}</td>
                          <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }} className="td-override">₵{parseFloat(expense.amount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dues Payment History Log (SDMS STYLE WITH BLUE TOP BORDER) */}
        <div style={styles.sdmsCard} className="card-override">
          <div style={styles.sdmsCardHeaderWithAction} className="card-header-override">
            <h3 style={styles.sdmsCardTitle} className="text-title">Dues Payment History</h3>
            <button 
              onClick={generateStatement}
              style={styles.statementBtn}
              disabled={statementLoading}
            >
              📥 Download Statement (PDF)
            </button>
          </div>

          <div style={styles.historyContent}>
            <div style={styles.filterBar} className="filters-override">
              {['All', 'Level 100', 'Level 200', 'Level 300', 'Level 400'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => handleHistoryFilterChange(filter)}
                  className={`filters-override ${historyFilter === filter ? 'active-filter-override' : ''}`}
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
              <p style={styles.noDataText}>No transactions logged for the selected academic level.</p>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={{ ...styles.th, textAlign: 'left' }} className="th-override">Date</th>
                      <th style={{ ...styles.th, textAlign: 'left' }} className="th-override">Reference Code</th>
                      <th style={{ ...styles.th, textAlign: 'left' }} className="th-override">Academic Semester</th>
                      <th style={{ ...styles.th, textAlign: 'left' }} className="th-override">Method</th>
                      <th style={{ ...styles.th, textAlign: 'center' }} className="th-override">Status</th>
                      <th style={{ ...styles.th, textAlign: 'right' }} className="th-override">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((tx) => (
                      <tr key={tx.id} style={styles.tableRow}>
                        <td style={{ ...styles.td, textAlign: 'left' }} className="td-override">{new Date(tx.created_at).toLocaleDateString('en-GB')}</td>
                        <td style={{ ...styles.td, textAlign: 'left' }} className="td-override"><code>{tx.payment_reference}</code></td>
                        <td style={{ ...styles.td, textAlign: 'left' }} className="td-override">{tx.academic_year} Sem {tx.semester}</td>
                        <td style={{ ...styles.td, textAlign: 'left' }} className="td-override">{tx.payment_method?.replace('MOMO_', '') || 'MoMo'}</td>
                        <td style={{ ...styles.td, textAlign: 'center' }} className="td-override">
                          <span style={tx.status === 'RECONCILED' || tx.status === 'PAID' ? styles.statusBadgePaid : styles.statusBadgePending}>
                            {tx.status}
                          </span>
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }} className="td-override">₵{parseFloat(tx.amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
                      placeholder="PIN"
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
  container: { 
    minHeight: '100vh', 
    backgroundColor: '#f1f5f9',
    fontFamily: "'Inter', sans-serif" 
  },
  loadingContainer: { 
    display: 'flex', 
    flexDirection: 'column',
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    backgroundColor: '#f1f5f9'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #1a56db',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  navbar: {
    backgroundColor: '#ffffff', 
    color: '#0f172a',
    padding: '12px 24px', 
    display: 'flex',
    justifyContent: 'space-between', 
    alignItems: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    borderBottom: '1px solid #e2e8f0'
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  menuBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#475569',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  htuBadgeWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  htuBadgeCircle: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#eff6ff',
    border: '1.5px solid #1e3a8a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sdmsText: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#1e3a8a',
    letterSpacing: '0.5px'
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  bellWrapper: {
    position: 'relative',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  },
  bellBadge: {
    position: 'absolute',
    top: '-6px',
    right: '-6px',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    fontSize: '9px',
    fontWeight: 'bold',
    width: '15px',
    height: '15px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  chatWrapper: {
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  },
  profileCircle: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#ec4899',
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  },
  toggleTrack: {
    width: '36px',
    height: '20px',
    borderRadius: '10px',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    transition: 'background-color 0.2s'
  },
  toggleThumb: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s'
  },
  mobileMenu: {
    backgroundColor: '#1e3a8a',
    borderBottom: '1px solid #172554',
    padding: '16px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  mobileMenuHeader: {
    borderBottom: '1px solid #1d4ed8',
    paddingBottom: '8px',
    display: 'flex',
    flexDirection: 'column'
  },
  mobileMenuUser: {
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600'
  },
  mobileMenuIndex: {
    color: '#93c5fd',
    fontSize: '12px'
  },
  mobileMenuLogoutBtn: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  mobileMenuRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '4px 0'
  },
  mobileMenuItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255,255,255,0.08)'
  },
  mobileMenuToggleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0'
  },
  content: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '20px 16px 40px 16px'
  },
  titleContainer: {
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: '8px',
    marginBottom: '20px'
  },
  dashboardTitle: {
    margin: 0,
    fontSize: '28px',
    fontWeight: '700',
    color: '#0f172a'
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fca5a5',
    color: '#b91c1c',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '13px',
    fontWeight: '500'
  },
  successBox: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #86efac',
    color: '#15803d',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '13px',
    fontWeight: '500'
  },
  welcomeBanner: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
    border: '1px solid #e2e8f0'
  },
  welcomeInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  welcomeUserTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '700',
    color: '#0f172a'
  },
  welcomeUserSub: {
    margin: 0,
    fontSize: '12px',
    color: '#475569'
  },
  welcomeStatus: {},
  badgeCleared: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    padding: '6px 14px',
    borderRadius: '20px',
    fontWeight: '700',
    fontSize: '11px',
    letterSpacing: '0.3px',
    display: 'inline-block'
  },
  badgeOwing: {
    backgroundColor: '#ffe4e6',
    color: '#9f1239',
    padding: '6px 14px',
    borderRadius: '20px',
    fontWeight: '700',
    fontSize: '11px',
    letterSpacing: '0.3px',
    display: 'inline-block'
  },
  sdmsCard: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    border: '1px solid #e2e8f0',
    borderTop: '3px solid #1a56db',
    marginBottom: '20px',
    overflow: 'hidden'
  },
  sdmsCardHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid #f1f5f9',
    backgroundColor: '#fafafb'
  },
  sdmsCardHeaderWithAction: {
    padding: '14px 20px',
    borderBottom: '1px solid #f1f5f9',
    backgroundColor: '#fafafb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px'
  },
  sdmsCardTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: '700',
    color: '#1e3a8a'
  },
  timelineFilters: {
    padding: '16px 20px 8px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    borderBottom: '1px solid #f8fafc'
  },
  filterDropdowns: {
    display: 'flex',
    gap: '8px'
  },
  sdmsSelect: {
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    padding: '5px 12px',
    fontSize: '12px',
    color: '#334155',
    outline: 'none',
    cursor: 'not-allowed'
  },
  timelineSearchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    maxWidth: '240px'
  },
  timelineSearchIcon: {
    position: 'absolute',
    left: '10px',
    color: '#94a3b8'
  },
  timelineSearch: {
    width: '100%',
    padding: '5px 10px 5px 28px',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    fontSize: '12px',
    outline: 'none',
    cursor: 'not-allowed'
  },
  timelineContent: {
    padding: '24px 20px'
  },
  sdmsEmptyState: {
    padding: '24px 0',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  emptyIconWrapper: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '14px'
  },
  emptyStateTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '700',
    color: '#0f172a'
  },
  emptyStateSub: {
    margin: '6px 0 16px 0',
    fontSize: '12px',
    color: '#64748b',
    maxWidth: '360px',
    lineHeight: '1.5'
  },
  certBtn: {
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(30, 58, 138, 0.15)',
    '&:hover': {
      backgroundColor: '#172554'
    }
  },
  overrideAlert: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '6px',
    padding: '12px',
    marginBottom: '16px',
    textAlign: 'left',
    width: '100%',
    maxWidth: '440px'
  },
  overrideReason: {
    fontSize: '12px',
    color: '#1e40af',
    margin: '4px 0',
    fontStyle: 'italic'
  },
  overrideNotice: {
    fontSize: '10px',
    color: '#64748b'
  },
  duesActiveTimeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  timelineAlertBadge: {
    backgroundColor: '#fff1f2',
    color: '#be123c',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '700',
    alignSelf: 'flex-start',
    border: '1px solid #fecdd3'
  },
  ledgerCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '16px'
  },
  ledgerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    fontSize: '13px',
    color: '#334155'
  },
  ledgerAmount: {
    fontWeight: '600',
    color: '#0f172a'
  },
  ledgerDivider: {
    height: '1px',
    backgroundColor: '#e2e8f0',
    margin: '8px 0'
  },
  ledgerTotalRow: {
    fontWeight: '700',
    fontSize: '14px',
    color: '#1e3a8a',
    paddingTop: '6px'
  },
  ledgerTotalAmount: {
    fontSize: '16px',
    color: '#1e3a8a'
  },
  paymentActionsBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '6px'
  },
  payBtn: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '700',
    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.15)',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#059669'
    }
  },
  cardHelpNote: {
    fontSize: '11px',
    color: '#64748b',
    margin: 0
  },
  refInfoContent: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center'
  },
  refCodeSub: {
    margin: 0,
    fontSize: '12px',
    color: '#64748b'
  },
  refCodeValue: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#1e3a8a',
    backgroundColor: '#f8fafc',
    padding: '12px 24px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    margin: '10px 0',
    letterSpacing: '1px'
  },
  refAmountVal: {
    fontSize: '14px',
    margin: 0,
    color: '#0f172a'
  },
  qrBlock: {
    margin: '16px 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px'
  },
  qrTitle: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#64748b'
  },
  qrImg: {
    width: '110px',
    height: '110px',
    border: '1px solid #e2e8f0',
    padding: '4px',
    borderRadius: '8px',
    backgroundColor: '#fff'
  },
  refDivider: {
    height: '1px',
    backgroundColor: '#e2e8f0',
    width: '100%',
    margin: '12px 0'
  },
  momoGateBtn: {
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: 'none',
    width: '100%',
    maxWidth: '300px',
    padding: '10px 16px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  ussdCodeBox: {
    marginTop: '12px',
    textAlign: 'center'
  },
  ussdTitle: {
    display: 'block',
    fontSize: '10px',
    color: '#64748b',
    marginBottom: '2px'
  },
  ussdCode: {
    fontSize: '11px',
    color: '#0f172a',
    fontWeight: '600',
    backgroundColor: '#f1f5f9',
    padding: '2px 8px',
    borderRadius: '4px'
  },
  transpContent: {
    padding: '20px'
  },
  transpGrid: {
    display: 'flex',
    gap: '14px',
    flexWrap: 'wrap',
    marginBottom: '20px'
  },
  transpBox: {
    flex: 1,
    minWidth: '160px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '14px'
  },
  transpLabel: {
    fontSize: '10px',
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    display: 'block',
    marginBottom: '4px'
  },
  transpVal: {
    fontSize: '18px',
    fontWeight: '800'
  },
  tableHeading: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#1e3a8a',
    margin: '20px 0 10px 0'
  },
  noDataText: {
    fontSize: '12px',
    color: '#64748b',
    fontStyle: 'italic',
    margin: '10px 0',
    textAlign: 'center'
  },
  tableWrapper: {
    overflowX: 'auto',
    border: '1px solid #e2e8f0',
    borderRadius: '6px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px'
  },
  tableHeaderRow: {
    backgroundColor: '#fafafb',
    borderBottom: '1px solid #cbd5e1'
  },
  th: {
    padding: '10px 14px',
    fontWeight: '600',
    color: '#475569',
    textAlign: 'left'
  },
  tableRow: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.2s'
  },
  td: {
    padding: '10px 14px',
    color: '#334155',
    textAlign: 'left'
  },
  historyContent: {
    padding: '20px'
  },
  statementBtn: {
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    color: '#334155',
    padding: '6px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s'
  },
  filterBar: {
    display: 'flex',
    gap: '6px',
    marginBottom: '14px',
    flexWrap: 'wrap'
  },
  filterBtn: {
    padding: '5px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '20px',
    backgroundColor: '#ffffff',
    fontSize: '11px',
    color: '#475569',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  activeFilterBtn: {
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    borderColor: '#1e3a8a',
    fontWeight: '700'
  },
  statusBadgePaid: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: '700',
    display: 'inline-block'
  },
  statusBadgePending: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: '700',
    display: 'inline-block'
  },

  // MOMO MODAL STYLES
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  momoCard: {
    backgroundColor: '#ffffff',
    width: '92%',
    maxWidth: '380px',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
  },
  momoHeader: {
    backgroundColor: '#ffcc00',
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontWeight: '700',
    color: '#000000',
    fontSize: '13px'
  },
  closeModalBtn: {
    border: 'none',
    background: 'transparent',
    fontSize: '18px',
    cursor: 'pointer',
    fontWeight: '700'
  },
  momoForm: {
    padding: '20px'
  },
  momoPromptTitle: {
    margin: '0 0 6px 0',
    fontSize: '15px',
    color: '#0f172a',
    fontWeight: '700'
  },
  momoText: {
    fontSize: '12px',
    color: '#64748b',
    lineHeight: '1.5',
    margin: '0 0 16px 0'
  },
  providerRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '14px'
  },
  providerBtn: {
    flex: 1,
    padding: '8px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    fontSize: '11px',
    cursor: 'pointer',
    fontWeight: '600',
    color: '#475569',
    transition: 'all 0.2s'
  },
  activeMtn: {
    backgroundColor: '#fffbeb',
    borderColor: '#d97706',
    color: '#78350f'
  },
  activeTelecel: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
    color: '#991b1b'
  },
  momoLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#475569',
    display: 'block',
    marginBottom: '4px'
  },
  momoInput: {
    padding: '8px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '13px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box'
  },
  momoSubmitBtn: {
    backgroundColor: '#ffcc00',
    color: '#000',
    border: 'none',
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '12px',
    transition: 'opacity 0.2s'
  },
  simulatedPhoneScreen: {
    backgroundColor: '#18181b',
    borderRadius: '8px',
    padding: '16px',
    color: '#ffffff',
    fontFamily: 'monospace',
    textAlign: 'center'
  },
  phoneHeader: {
    fontSize: '10px',
    color: '#a1a1aa',
    borderBottom: '1px solid #27272a',
    paddingBottom: '4px',
    marginBottom: '12px'
  },
  phonePrompt: {
    fontSize: '11px',
    lineHeight: '1.5',
    color: '#e4e4e7',
    marginBottom: '14px'
  },
  phonePinInput: {
    backgroundColor: '#27272a',
    border: '1px solid #3f3f46',
    color: '#ffffff',
    padding: '6px',
    borderRadius: '4px',
    fontSize: '16px',
    textAlign: 'center',
    width: '100px',
    letterSpacing: '3px',
    outline: 'none'
  },
  phoneActions: {
    display: 'flex',
    justifyContent: 'space-around',
    marginTop: '16px'
  },
  phoneBtn: {
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: 'monospace'
  },
  momoSuccessState: {
    padding: '24px 16px',
    textAlign: 'center'
  },
  successIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#d1fae5',
    color: '#059669',
    fontSize: '20px',
    fontWeight: '700',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '0 auto 12px auto'
  },
  successText: {
    margin: '0 0 6px 0',
    fontSize: '15px',
    color: '#0f172a',
    fontWeight: '700'
  },
  successDesc: {
    fontSize: '12px',
    color: '#64748b',
    lineHeight: '1.5',
    margin: '0 0 16px 0'
  },
  closeSuccessBtn: {
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: 'none',
    padding: '8px 20px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer'
  }
};

export default StudentDashboard;