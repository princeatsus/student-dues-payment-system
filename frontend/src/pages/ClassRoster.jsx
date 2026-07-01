import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClassRoster, sendReminderEmail } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { 
  GraduationCap, 
  LogOut, 
  DollarSign, 
  Download, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  Bell,
  Menu,
  X 
} from 'lucide-react';

const ClassRoster = () => {
  const [rosterData, setRosterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [remindLoading, setRemindLoading] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  // Handle window resize for responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setMenuOpen(false); // Auto-close menu on resize to desktop
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      // Automatically fade out success message
      setTimeout(() => setSuccess(''), 8000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reminder.');
      setTimeout(() => setError(''), 8000);
    } finally {
      setRemindLoading(null);
    }
  };

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

  const handleLogout = () => {
    logoutUser();
    navigate('/');
  };

  // Filter & search student array
  const filteredRoster = (rosterData?.roster || []).filter(student => {
    const matchesSearch = 
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.index_number.includes(searchTerm);
    
    const matchesFilter = 
      filterStatus === 'ALL' ||
      (filterStatus === 'PAID' && student.status === 'PAID') ||
      (filterStatus === 'OWING' && student.status === 'OWING');

    return matchesSearch && matchesFilter;
  });

  // Calculate metrics
  const totalCount = rosterData?.roster?.length || 0;
  const paidCount = rosterData?.roster?.filter(s => s.status === 'PAID').length || 0;
  const owingCount = rosterData?.roster?.filter(s => s.status === 'OWING').length || 0;
  const percentCleared = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;

  // SVG Progress Ring calculations
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentCleared / 100) * circumference;

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <div style={{ marginTop: '16px', fontSize: '15px', color: '#6366f1', fontWeight: '600' }}>
          Loading class roster...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Premium Navbar */}
      <div style={styles.navbar}>
        <div style={styles.navBrand}>
          <div style={styles.navIconContainer}>
            <GraduationCap size={24} style={{ color: '#a5b4fc' }} />
          </div>
          <div>
            <h1 style={styles.navTitle}>COMPSSA SDMS</h1>
            <p style={styles.navSubtitle}>Ho Technical University</p>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        {!isMobile && (
          <div style={styles.navActions}>
            <span style={styles.navUser}>👋 Rep: <strong>{user?.full_name}</strong></span>
            <button onClick={() => navigate('/expenses')} style={styles.expensesBtn}>
              <DollarSign size={14} style={{ marginRight: '4px' }} />
              Expenses
            </button>
            <button onClick={handleLogout} style={styles.logoutBtn}>
              <LogOut size={13} style={{ marginRight: '4px' }} />
              Logout
            </button>
          </div>
        )}

        {/* Mobile Hamburger Toggle Button */}
        {isMobile && (
          <button onClick={() => setMenuOpen(!menuOpen)} style={styles.menuToggleBtn}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        )}
      </div>

      {/* Mobile Drawer Dropdown Menu */}
      {isMobile && menuOpen && (
        <div style={styles.mobileMenu}>
          <div style={styles.mobileMenuHeader}>
            <span style={styles.mobileMenuUser}>👋 Rep: <strong>{user?.full_name}</strong></span>
          </div>
          <button 
            onClick={() => { setMenuOpen(false); navigate('/expenses'); }} 
            style={styles.mobileMenuBtn}
          >
            <DollarSign size={16} style={{ marginRight: '8px' }} />
            Expenses Dashboard
          </button>
          <button onClick={handleLogout} style={styles.mobileMenuLogoutBtn}>
            <LogOut size={14} style={{ marginRight: '8px' }} />
            Logout
          </button>
        </div>
      )}

      {/* Main Content Body */}
      <div style={styles.content}>
        {error && <div style={styles.errorBox}>⚠️ {error}</div>}
        {success && <div style={styles.successBox}>✅ {success}</div>}

        {/* Portal Greeting Card with Circular Chart */}
        <div style={styles.heroCard}>
          <div style={styles.heroLeft}>
            <div style={styles.badge}>Level {rosterData?.level} Class Group {rosterData?.class_group}</div>
            <h2 style={styles.heroTitle}>Class Financial Overview</h2>
            <p style={styles.heroSub}>
              Academic Session: <strong>{rosterData?.session?.academic_year} Semester {rosterData?.session?.semester}</strong>
            </p>
            <button onClick={handleExportRoster} style={styles.exportBtn}>
              <Download size={13} style={{ marginRight: '6px' }} />
              Export Roster Sheet (CSV)
            </button>
          </div>
          
          {/* Glowing Circular Clearance Ring */}
          <div style={styles.chartWrapper}>
            <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#e2e8f0" strokeWidth="8" />
              <circle 
                cx="50" cy="50" r={radius} 
                fill="transparent" 
                stroke="url(#tealGradient)" 
                strokeWidth="8" 
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
              />
              <defs>
                <linearGradient id="tealGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>
            <div style={styles.chartCenterText}>
              <span style={styles.chartNumber}>{percentCleared}%</span>
              <span style={styles.chartLabel}>Cleared</span>
            </div>
          </div>
        </div>

        {/* Stats Grid Cards */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIconWrapper, backgroundColor: '#e0e7ff', color: '#6366f1' }}>
              <Users size={22} />
            </div>
            <div>
              <p style={styles.statLabel}>Total Class Strength</p>
              <h3 style={styles.statValue}>{totalCount} Students</h3>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIconWrapper, backgroundColor: '#ecfdf5', color: '#10b981' }}>
              <CheckCircle size={22} />
            </div>
            <div>
              <p style={styles.statLabel}>Fully Cleared</p>
              <h3 style={{ ...styles.statValue, color: '#10b981' }}>{paidCount} Paid</h3>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIconWrapper, backgroundColor: '#fff1f2', color: '#f43f5e' }}>
              <AlertCircle size={22} />
            </div>
            <div>
              <p style={styles.statLabel}>Outstanding Defaulters</p>
              <h3 style={{ ...styles.statValue, color: '#f43f5e' }}>{owingCount} Owing</h3>
            </div>
          </div>
        </div>

        {/* Search, Filter Panel & List Section */}
        <div style={styles.tableCard}>
          <div style={styles.controlHeader}>
            {/* Filter Tabs */}
            <div style={styles.tabContainer}>
              <button 
                onClick={() => setFilterStatus('ALL')} 
                style={filterStatus === 'ALL' ? styles.activeTab : styles.tab}
              >
                All
              </button>
              <button 
                onClick={() => setFilterStatus('PAID')} 
                style={filterStatus === 'PAID' ? styles.activeTab : styles.tab}
              >
                Cleared
              </button>
              <button 
                onClick={() => setFilterStatus('OWING')} 
                style={filterStatus === 'OWING' ? styles.activeTab : styles.tab}
              >
                Owing
              </button>
            </div>

            {/* Search Input Box */}
            <div style={styles.searchWrapper}>
              <Search size={14} style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search index or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
            </div>
          </div>

          {/* Table View (Desktop) / Card View (Mobile) */}
          {filteredRoster.length === 0 ? (
            <div style={styles.emptyState}>
              <Search size={32} style={{ color: '#94a3b8' }} />
              <p style={{ marginTop: '8px', color: '#64748b' }}>No students found matching filters.</p>
            </div>
          ) : isMobile ? (
            /* MOBILE STACKED CARD VIEW */
            <div style={styles.mobileCardList}>
              {filteredRoster.map((student) => {
                const progressPercent = student.total_dues > 0 
                  ? Math.min(100, Math.round((student.total_paid / student.total_dues) * 100)) 
                  : 0;

                return (
                  <div key={student.id} style={styles.mobileStudentCard}>
                    <div style={styles.mobileCardHeader}>
                      <div>
                        <h4 style={styles.mobileStudentName}>{student.full_name}</h4>
                        <code style={styles.mobileStudentIndex}>{student.index_number}</code>
                      </div>
                      <span style={student.status === 'PAID' ? styles.badgePaid : styles.badgeOwing}>
                        {student.status}
                      </span>
                    </div>

                    <div style={styles.progressContainer}>
                      <div style={styles.progressLabels}>
                        <span>Paid: ₵{student.total_paid.toFixed(0)}</span>
                        <span>Dues: ₵{student.total_dues.toFixed(0)}</span>
                      </div>
                      <div style={styles.progressBarBg}>
                        <div style={{ ...styles.progressBarFill, width: `${progressPercent}%`, backgroundColor: student.status === 'PAID' ? '#10b981' : '#6366f1' }}></div>
                      </div>
                    </div>

                    <div style={styles.mobileCardFooter}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {student.outstanding > 0 ? (
                          <span>Balance: <strong style={{ color: '#f43f5e' }}>₵{student.outstanding.toFixed(2)}</strong></span>
                        ) : (
                          <span style={{ color: '#10b981' }}>Fully Cleared</span>
                        )}
                      </div>
                      
                      {student.status === 'OWING' && (
                        <button
                          onClick={() => handleSendReminder(student.id, student.full_name)}
                          style={styles.mobileNudgeBtn}
                          disabled={remindLoading === student.id}
                        >
                          <Bell size={11} style={{ marginRight: '3px', display: 'inline-block', verticalAlign: 'middle' }} />
                          {remindLoading === student.id ? 'Sending...' : 'Send Nudge'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* DESKTOP TABLE VIEW */
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Index Number</th>
                    <th style={styles.th}>Full Name</th>
                    <th style={styles.th}>Email Address</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Dues Configured</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Paid</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Outstanding</th>
                    <th style={styles.th}>Status</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoster.map((student) => (
                    <tr key={student.id} style={styles.tableRow}>
                      <td style={styles.td}><code>{student.index_number}</code></td>
                      <td style={{ ...styles.td, fontWeight: '500', color: '#0f172a' }}>{student.full_name}</td>
                      <td style={styles.td}>{student.email}</td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>₵{student.total_dues.toFixed(2)}</td>
                      <td style={{ ...styles.td, textAlign: 'right', color: '#10b981', fontWeight: 'bold' }}>₵{student.total_paid.toFixed(2)}</td>
                      <td style={{ ...styles.td, textAlign: 'right', color: student.outstanding > 0 ? '#f43f5e' : '#0f172a', fontWeight: student.outstanding > 0 ? 'bold' : 'normal' }}>
                        ₵{student.outstanding.toFixed(2)}
                      </td>
                      <td style={styles.td}>
                        <span style={student.status === 'PAID' ? styles.badgePaid : styles.badgeOwing}>
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
                            <Bell size={11} style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }} />
                            {remindLoading === student.id ? 'Sending...' : 'Send Nudge'}
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
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { 
    minHeight: '100vh', 
    backgroundColor: '#f8fafc',
    fontFamily: "'Inter', sans-serif" 
  },
  loadingContainer: { 
    display: 'flex', 
    flexDirection: 'column',
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    backgroundColor: '#f8fafc'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  navbar: {
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
    color: '#fff',
    padding: '14px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    position: 'relative'
  },
  navBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  navIconContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)'
  },
  navTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: '700',
    letterSpacing: '0.5px'
  },
  navSubtitle: {
    margin: 0,
    fontSize: '11px',
    color: '#94a3b8'
  },
  navActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  navUser: {
    fontSize: '13px',
    color: '#cbd5e1'
  },
  expensesBtn: {
    backgroundColor: '#6366f1',
    color: '#fff',
    border: 'none',
    padding: '7px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(99, 102, 241, 0.2)'
  },
  logoutBtn: {
    backgroundColor: 'transparent',
    border: '1px solid #475569',
    color: '#cbd5e1',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s ease'
  },
  menuToggleBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: 'none',
    color: '#fff',
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  mobileMenu: {
    backgroundColor: '#1e1b4b',
    borderBottom: '1px solid #312e81',
    padding: '16px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    animation: 'slideDown 0.2s ease-out'
  },
  mobileMenuHeader: {
    borderBottom: '1px solid #312e81',
    paddingBottom: '8px',
    marginBottom: '4px'
  },
  mobileMenuUser: {
    color: '#cbd5e1',
    fontSize: '14px'
  },
  mobileMenuBtn: {
    backgroundColor: '#6366f1',
    color: '#fff',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center'
  },
  mobileMenuLogoutBtn: {
    backgroundColor: 'transparent',
    border: '1px solid #475569',
    color: '#cbd5e1',
    padding: '10px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center'
  },
  content: {
    maxWidth: '1140px',
    margin: '0 auto',
    padding: '20px 16px 40px 16px'
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
  heroCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
    border: '1px solid #f1f5f9',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '24px'
  },
  heroLeft: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '8px'
  },
  badge: {
    backgroundColor: '#e0e7ff',
    color: '#4f46e5',
    fontSize: '11px',
    fontWeight: '700',
    padding: '4px 10px',
    borderRadius: '20px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  heroTitle: {
    margin: 0,
    fontSize: '22px',
    fontWeight: '800',
    color: '#0f172a'
  },
  heroSub: {
    margin: 0,
    fontSize: '13px',
    color: '#475569'
  },
  exportBtn: {
    backgroundColor: '#0f172a',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    marginTop: '6px',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s ease'
  },
  chartWrapper: {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100px',
    height: '100px'
  },
  chartCenterText: {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  chartNumber: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#0f172a'
  },
  chartLabel: {
    fontSize: '9px',
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: '0.5px'
  },
  statsGrid: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap'
  },
  statCard: {
    flex: 1,
    minWidth: '220px',
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 4px 15px -3px rgba(0, 0, 0, 0.04)',
    border: '1px solid #f1f5f9'
  },
  statIconWrapper: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '20px'
  },
  statLabel: {
    margin: 0,
    fontSize: '11px',
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.3px'
  },
  statValue: {
    margin: '2px 0 0 0',
    fontSize: '17px',
    fontWeight: '800',
    color: '#0f172a'
  },
  tableCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
    border: '1px solid #f1f5f9'
  },
  controlHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  tabContainer: {
    display: 'flex',
    backgroundColor: '#f1f5f9',
    padding: '4px',
    borderRadius: '8px',
    gap: '2px'
  },
  tab: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#64748b',
    padding: '6px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'all 0.15s ease'
  },
  activeTab: {
    backgroundColor: '#ffffff',
    border: 'none',
    color: '#0f172a',
    padding: '6px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '700',
    boxShadow: '0 2px 5px rgba(0,0,0,0.06)'
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    maxWidth: '260px'
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    color: '#94a3b8'
  },
  searchInput: {
    width: '100%',
    padding: '7px 12px 7px 32px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '12px',
    color: '#0f172a',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
  },
  emptyState: {
    padding: '40px 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px'
  },
  tableHeaderRow: {
    borderBottom: '1.5px solid #e2e8f0',
    backgroundColor: '#f8fafc'
  },
  th: {
    padding: '12px 14px',
    color: '#475569',
    fontWeight: '600',
    textAlign: 'left'
  },
  tableRow: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.15s ease',
    '&:hover': {
      backgroundColor: '#f8fafc'
    }
  },
  td: {
    padding: '12px 14px',
    color: '#334155'
  },
  badgePaid: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: '700',
    display: 'inline-block'
  },
  badgeOwing: {
    backgroundColor: '#ffe4e6',
    color: '#9f1239',
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: '700',
    display: 'inline-block'
  },
  remindBtn: {
    backgroundColor: '#f43f5e',
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '10px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(244, 63, 94, 0.15)',
    transition: 'all 0.2s ease'
  },
  noActionText: {
    color: '#94a3b8',
    fontSize: '11px',
    fontStyle: 'italic'
  },

  /* MOBILE CARD VIEW STYLES */
  mobileCardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  mobileStudentCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #f1f5f9',
    borderRadius: '12px',
    padding: '14px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  mobileCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  mobileStudentName: {
    margin: 0,
    fontSize: '13px',
    fontWeight: '700',
    color: '#0f172a'
  },
  mobileStudentIndex: {
    fontSize: '11px',
    color: '#64748b'
  },
  progressContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  progressLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '10px',
    color: '#64748b',
    fontWeight: '600'
  },
  progressBarBg: {
    height: '6px',
    backgroundColor: '#f1f5f9',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.4s ease'
  },
  mobileCardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #f8fafc',
    paddingTop: '8px'
  },
  mobileNudgeBtn: {
    backgroundColor: '#f43f5e',
    color: '#fff',
    border: 'none',
    padding: '6px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '10px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(244, 63, 94, 0.15)'
  }
};

export default ClassRoster;
