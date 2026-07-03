import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllStudents, confirmPayment, setDuesConfig, syncGoogleDirectory } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import AppHeader from '../components/AppHeader';
import { 
  Users, CheckCircle, AlertCircle, CreditCard, Search, 
  Database, RefreshCw, LogOut, Sun, Moon, Settings, Coins,
  Menu, X
} from 'lucide-react';

const AccountantDashboard = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme-dark') === 'true');
  const [duesForm, setDuesForm] = useState({
    academic_year: '2025/2026',
    semester: 1,
    dues: [
      { level: 100, amount: 100 },
      { level: 200, amount: 150 },
      { level: 300, amount: 250 },
      { level: 400, amount: 300 },
    ]
  });
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    localStorage.setItem('theme-dark', darkMode ? 'true' : 'false');
  }, [darkMode]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await getAllStudents();
      setStudents(response.data.students);
    } catch (err) {
      setError('Failed to load students.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDues = async () => {
    try {
      await setDuesConfig(duesForm);
      setSuccess('Dues configured successfully!');
      fetchStudents();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to configure dues.');
    }
  };

  const handleLogout = () => {
    logoutUser();
    navigate('/');
  };

  const handleSyncDirectory = async () => {
    setSyncing(true);
    setError('');
    setSuccess('');
    try {
      const response = await syncGoogleDirectory();
      if (response.data.success) {
        setSuccess(`✅ Google Workspace Sync Success! ${response.data.stats.syncedCount} new student profiles added.`);
        fetchStudents();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Google Workspace Synchronization failed.');
    } finally {
      setSyncing(false);
    }
  };

  const filteredStudents = students.filter(student => 
    student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.index_number?.includes(searchTerm) ||
    (`level ${student.current_level}`).includes(searchTerm.toLowerCase())
  );

  if (loading) return <div style={styles.loading}>Loading dashboard...</div>;

  const totalCollected = students.reduce((sum, s) => sum + parseFloat(s.total_paid || 0), 0);

  const darkStylesText = {
    color: darkMode ? '#f8fafc' : '#1e293b'
  };

  return (
    <div style={{ ...styles.container, backgroundColor: darkMode ? '#0f172a' : '#f8fafc' }}>
      {/* Global CSS Styles Injector */}
      <style>{`
        html, body, #root {
          max-width: 100vw !important;
          overflow-x: hidden !important;
          margin: 0;
          padding: 0;
        }
        body {
          background-color: ${darkMode ? '#0f172a' : '#f8fafc'} !important;
          transition: background-color 0.3s ease;
        }
        .card-override {
          background-color: ${darkMode ? '#1e293b' : '#ffffff'} !important;
          border: 1px solid ${darkMode ? '#334155' : '#e2e8f0'} !important;
          box-shadow: ${darkMode ? '0 10px 30px rgba(0,0,0,0.3)' : '0 4px 6px -1px rgba(0,0,0,0.05)'} !important;
          color: ${darkMode ? '#f8fafc' : '#1e293b'} !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-override:hover {
          transform: translateY(-2px);
        }
        .text-title {
          color: ${darkMode ? '#f8fafc' : '#1e293b'} !important;
        }
        .text-muted {
          color: ${darkMode ? '#94a3b8' : '#64748b'} !important;
        }
        .input-override {
          background-color: ${darkMode ? '#0f172a' : '#ffffff'} !important;
          border: 1px solid ${darkMode ? '#334155' : '#cbd5e1'} !important;
          color: ${darkMode ? '#f8fafc' : '#1e293b'} !important;
          transition: all 0.2s ease;
        }
        .input-override:focus {
          border-color: #3b82f6 !important;
          outline: none;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15) !important;
        }
        .table-row-override {
          border-bottom: 1px solid ${darkMode ? '#334155' : '#e2e8f0'} !important;
          transition: background-color 0.2s ease;
        }
        .table-row-override:hover {
          background-color: ${darkMode ? '#1e293b' : '#f8fafc'} !important;
        }
        .table-header-override {
          background-color: ${darkMode ? '#334155' : '#f1f5f9'} !important;
          color: ${darkMode ? '#cbd5e1' : '#475569'} !important;
        }
        .stat-card-glow-1 { border-left: 4px solid #3b82f6 !important; }
        .stat-card-glow-2 { border-left: 4px solid #10b981 !important; }
        .stat-card-glow-3 { border-left: 4px solid #ef4444 !important; }
        .stat-card-glow-4 { border-left: 4px solid #8b5cf6 !important; }

        /* Desktop & Mobile display configurations */
        .desktop-only {
          display: block !important;
        }
        .mobile-only {
          display: none !important;
        }

        @media (max-width: 768px) {
          .desktop-only {
            display: none !important;
          }
          .mobile-only {
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
          }
          .cards-row-override {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 12px !important;
            margin-bottom: 16px !important;
          }
          .stat-card-override {
            margin-bottom: 0 !important;
            padding: 12px 14px !important;
            min-width: 0 !important;
          }
          .stat-value-override {
            font-size: 20px !important;
            font-weight: 800 !important;
          }
          .grid-container-override {
            flex-direction: column !important;
          }
          .content-override {
            padding: 12px !important;
          }
          .directory-header-override {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .search-wrapper-override {
            width: 100% !important;
          }
          .search-input-override {
            width: 100% !important;
          }
          .dues-grid-override {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 12px !important;
          }
          .due-item-override {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
          .due-input-wrapper-override {
            width: 100% !important;
          }
          .due-input-override {
            width: 100% !important;
          }
          .section-card-override {
            min-width: 0 !important;
            padding: 16px !important;
          }
          .mobile-menu-btn-override {
            transition: all 0.2s ease-in-out !important;
          }
          .mobile-menu-btn-override:active {
            transform: scale(0.97) !important;
            background-color: rgba(255, 255, 255, 0.2) !important;
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .mobile-menu-animate {
          animation: slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        }
      `}</style>
      <AppHeader 
        role="ACCOUNTANT" 
        userName={user?.full_name} 
        pageTitle="Accountant dashboard" 
        subtitle="Department Dues & Financial Statements" 
        onBack={() => navigate('/expenses')} 
        onLogout={handleLogout}
      />

      <div style={styles.content} className="content-override">
        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        {/* Stats Row */}
        <div style={styles.cardsRow} className="cards-row-override">
          <div className="card-override stat-card-glow-1 stat-card-override" style={styles.statCard}>
            <div style={styles.statHeader}>
              <p style={styles.statLabel} className="text-muted">Total Students</p>
              <Users size={16} color="#3b82f6" />
            </div>
            <p className="stat-value-override" style={{ ...styles.statValue, ...darkStylesText }}>{students.length}</p>
          </div>
          
          <div className="card-override stat-card-glow-2 stat-card-override" style={styles.statCard}>
            <div style={styles.statHeader}>
              <p style={styles.statLabel} className="text-muted">Cleared Dues</p>
              <CheckCircle size={16} color="#10b981" />
            </div>
            <p className="stat-value-override" style={{ ...styles.statValue, color: '#10b981' }}>
              {students.filter(s => s.status === 'CLEARED').length}
            </p>
          </div>
          
          <div className="card-override stat-card-glow-3 stat-card-override" style={styles.statCard}>
            <div style={styles.statHeader}>
              <p style={styles.statLabel} className="text-muted">Owing Dues</p>
              <AlertCircle size={16} color="#ef4444" />
            </div>
            <p className="stat-value-override" style={{ ...styles.statValue, color: '#ef4444' }}>
              {students.filter(s => s.status === 'OWING').length}
            </p>
          </div>
          
          <div className="card-override stat-card-glow-4 stat-card-override" style={styles.statCard}>
            <div style={styles.statHeader}>
              <p style={styles.statLabel} className="text-muted">Total Collected</p>
              <CreditCard size={16} color="#8b5cf6" />
            </div>
            <p className="stat-value-override" style={{ ...styles.statValue, color: '#8b5cf6' }}>
              ₵{totalCollected.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Grid for Dues Config & Students */}
        <div style={styles.gridContainer} className="grid-container-override">
          {/* Configure Dues Section */}
          <div className="card-override section-card-override" style={styles.section}>
            <h2 style={styles.sectionTitle} className="text-title">
              <Settings size={18} style={styles.titleIcon} />
              Configure Semester Dues
            </h2>
            <p style={styles.configSubtitle} className="text-muted">Set academic fees configured per class level</p>
            
            <div style={styles.duesGrid} className="dues-grid-override">
              {duesForm.dues.map((due, index) => (
                <div key={due.level} style={styles.dueItem} className="due-item-override">
                  <label style={styles.dueLabel} className="text-muted">Level {due.level}</label>
                  <div style={styles.inputWrapper} className="due-input-wrapper-override">
                    <span style={styles.currencyPrefix}>₵</span>
                    <input
                      type="number"
                      value={due.amount}
                      onChange={(e) => {
                        const updated = [...duesForm.dues];
                        updated[index].amount = parseFloat(e.target.value) || 0;
                        setDuesForm({ ...duesForm, dues: updated });
                      }}
                      style={styles.dueInput}
                      className="input-override due-input-override"
                    />
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleSetDues} style={styles.configBtn}>
              💾 Save Dues Configuration
            </button>
          </div>

          {/* Students Directory */}
          <div className="card-override section-card-override" style={{ ...styles.section, flex: 2 }}>
            <div style={styles.directoryHeader} className="directory-header-override">
              <h2 style={styles.sectionTitle} className="text-title">
                👥 Student Ledger Directory
              </h2>
              
              {/* Search Bar */}
              <div style={styles.searchWrapper} className="search-wrapper-override">
                <Search size={14} style={styles.searchIcon} className="text-muted" />
                <input 
                  type="text"
                  placeholder="Search index or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={styles.searchInput}
                  className="input-override search-input-override"
                />
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="desktop-only" style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr className="table-header-override">
                    <th style={styles.th}>Index Number</th>
                    <th style={styles.th}>Full Name</th>
                    <th style={styles.th}>Level</th>
                    <th style={styles.th}>Total Dues</th>
                    <th style={styles.th}>Total Paid</th>
                    <th style={styles.th}>Outstanding</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={styles.emptyRow} className="text-muted">
                        No students found matching your search
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr key={student.id} className="table-row-override">
                        <td style={{ ...styles.td, fontWeight: '600', fontFamily: 'monospace' }}>{student.index_number}</td>
                        <td style={styles.td}>{student.full_name}</td>
                        <td style={styles.td}>
                          <span style={styles.levelBadge}>L{student.current_level}</span>
                        </td>
                        <td style={styles.td}>₵{parseFloat(student.total_dues || 0).toFixed(2)}</td>
                        <td style={styles.td}>₵{parseFloat(student.total_paid || 0).toFixed(2)}</td>
                        <td style={{ 
                          ...styles.td, 
                          color: parseFloat(student.outstanding) > 0 ? '#ef4444' : '#10b981',
                          fontWeight: '600'
                        }}>
                          ₵{parseFloat(student.outstanding || 0).toFixed(2)}
                        </td>
                        <td style={styles.td}>
                          <span style={student.status === 'CLEARED' ? styles.badgeCleared : styles.badgeOwing}>
                            {student.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="mobile-only" style={styles.mobileCardList}>
              {filteredStudents.length === 0 ? (
                <div style={styles.emptyRow} className="text-muted">
                  No students found matching your search
                </div>
              ) : (
                filteredStudents.map((student) => (
                  <div key={student.id} style={styles.mobileStudentCard} className="card-override">
                    <div style={styles.mobileCardHeader}>
                      <div>
                        <h4 style={styles.mobileCardName} className="text-title">{student.full_name}</h4>
                        <span style={styles.mobileCardIndex} className="text-muted">{student.index_number}</span>
                      </div>
                      <span style={student.status === 'CLEARED' ? styles.badgeCleared : styles.badgeOwing}>
                        {student.status}
                      </span>
                    </div>

                    <div style={styles.mobileCardDivider} />

                    <div style={styles.mobileCardGrid}>
                      <div style={styles.mobileCardCol}>
                        <span style={styles.mobileColLabel} className="text-muted">Level</span>
                        <span style={styles.mobileColValue} className="text-title">L{student.current_level}</span>
                      </div>
                      <div style={styles.mobileCardCol}>
                        <span style={styles.mobileColLabel} className="text-muted">Paid</span>
                        <span style={styles.mobileColValue} className="text-title">₵{parseFloat(student.total_paid || 0).toFixed(2)}</span>
                      </div>
                      <div style={styles.mobileCardCol}>
                        <span style={styles.mobileColLabel} className="text-muted">Outstanding</span>
                        <span style={{ 
                          ...styles.mobileColValue, 
                          color: parseFloat(student.outstanding) > 0 ? '#ef4444' : '#10b981',
                          fontWeight: '700'
                        }}>
                          ₵{parseFloat(student.outstanding || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', transition: 'all 0.3s ease' },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '16px',
    fontWeight: '500',
    color: '#64748b'
  },
  navbar: {
    color: '#fff',
    padding: '12px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    zIndex: 100,
    position: 'relative'
  },
  navLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: '6px',
    borderRadius: '8px',
    fontSize: '16px'
  },
  navTitle: { margin: 0, fontSize: '15px', fontWeight: '700', letterSpacing: '0.3px' },
  navRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  navUser: { fontSize: '13px', fontWeight: '500', opacity: 0.9, marginRight: '6px' },
  navBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#fff',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'background 0.2s',
  },
  btnIcon: { opacity: 0.9 },
  logoutBtn: {
    backgroundColor: '#ef4444',
    border: 'none',
    color: '#fff',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'background 0.2s',
  },
  mobileNavActions: { display: 'flex', alignItems: 'center' },
  hamburgerBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px'
  },
  mobileMenu: {
    width: '100%',
    padding: '16px 24px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    zIndex: 99,
    position: 'relative',
    boxSizing: 'border-box'
  },
  mobileMenuHeader: {
    marginBottom: '16px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    paddingBottom: '12px'
  },
  mobileMenuUser: {
    color: '#ffffff',
    fontSize: '13px'
  },
  mobileMenuContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  mobileMenuBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#ffffff',
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    width: '100%',
    boxSizing: 'border-box'
  },
  mobileMenuLogoutBtn: {
    backgroundColor: '#ef4444',
    border: 'none',
    color: '#ffffff',
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    marginTop: '8px',
    width: '100%',
    boxSizing: 'border-box'
  },
  content: { maxWidth: '1280px', margin: '0 auto', padding: '24px' },
  error: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '13px',
    fontWeight: '500'
  },
  success: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#16a34a',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '13px',
    fontWeight: '500'
  },
  cardsRow: { display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' },
  statCard: {
    flex: 1,
    minWidth: '200px',
    borderRadius: '12px',
    padding: '16px 20px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
  },
  statHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' },
  statLabel: { margin: 0, fontSize: '12px', fontWeight: '600', letterSpacing: '0.3px' },
  statValue: { margin: 0, fontSize: '24px', fontWeight: '800' },
  gridContainer: { display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' },
  section: {
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    flex: 1,
    minWidth: '320px'
  },
  sectionTitle: { margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' },
  titleIcon: { color: '#3b82f6' },
  configSubtitle: { margin: '-10px 0 20px 0', fontSize: '12px' },
  duesGrid: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' },
  dueItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' },
  dueLabel: { fontSize: '13px', fontWeight: '600' },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  currencyPrefix: { position: 'absolute', left: '10px', fontSize: '13px', color: '#94a3b8', fontWeight: '600' },
  dueInput: {
    padding: '8px 12px 8px 24px',
    borderRadius: '6px',
    fontSize: '13px',
    width: '100px',
    textAlign: 'right',
    fontWeight: '600'
  },
  configBtn: {
    backgroundColor: '#10b981',
    color: '#fff',
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'center',
    transition: 'opacity 0.2s',
  },
  directoryHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' },
  searchWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  searchIcon: { position: 'absolute', left: '10px' },
  searchInput: {
    padding: '6px 12px 6px 28px',
    borderRadius: '6px',
    fontSize: '13px',
    width: '200px'
  },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' },
  td: { padding: '10px 14px', fontSize: '13px' },
  levelBadge: {
    backgroundColor: '#eff6ff',
    color: '#3b82f6',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600'
  },
  badgeCleared: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    color: '#10b981',
    border: '1px solid rgba(16,185,129,0.2)',
    padding: '3px 8px',
    borderRadius: '20px',
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '0.3px',
    boxShadow: '0 0 8px rgba(16,185,129,0.1)'
  },
  badgeOwing: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    color: '#ef4444',
    border: '1px solid rgba(239,68,68,0.2)',
    padding: '3px 8px',
    borderRadius: '20px',
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '0.3px',
    boxShadow: '0 0 8px rgba(239,68,68,0.1)'
  },
  emptyRow: { padding: '24px 0', textAlign: 'center', fontSize: '13px', fontWeight: '500' },
  toggleTrack: {
    width: '32px',
    height: '16px',
    borderRadius: '8px',
    padding: '1px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'background-color 0.2s',
  },
  toggleThumb: {
    width: '14px',
    height: '14px',
    borderRadius: '7px',
    transition: 'transform 0.2s',
  },

  // Mobile Student Card specific styling
  mobileCardList: { display: 'none' },
  mobileStudentCard: {
    padding: '16px',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    transition: 'all 0.3s ease'
  },
  mobileCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px'
  },
  mobileCardName: {
    margin: 0,
    fontSize: '14px',
    fontWeight: '700',
    lineHeight: '1.2'
  },
  mobileCardIndex: {
    fontSize: '11px',
    fontFamily: 'monospace',
    marginTop: '2px',
    display: 'block'
  },
  mobileCardDivider: {
    height: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    width: '100%',
    margin: '4px 0'
  },
  mobileCardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px'
  },
  mobileCardCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  mobileColLabel: {
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    fontWeight: '600'
  },
  mobileColValue: {
    fontSize: '12px',
    fontWeight: '600'
  }
};

export default AccountantDashboard;