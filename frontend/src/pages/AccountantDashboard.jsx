import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getAllStudents, 
  setDuesConfig, 
  syncGoogleDirectory, 
  getSyncLogs, 
  reconcileUpload 
} from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { 
  Calculator, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Coins, 
  Upload, 
  Settings, 
  Save, 
  Search, 
  LogOut, 
  RefreshCw,
  Info,
  ListTodo
} from 'lucide-react';

// Custom Google Brand Icon SVG
const GoogleIcon = ({ size = 16, className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.555 0-6.435-2.88-6.435-6.435s2.88-6.435 6.435-6.435c1.637 0 3.136.612 4.3 1.62l3.22-3.22C19.58 2.235 16.14 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 11.24-4.557 11.24-11.24 0-.768-.078-1.503-.22-1.955H12.24z" />
  </svg>
);

const AccountantDashboard = () => {
  const [activeTab, setActiveTab] = useState('Overview'); // Overview, Student ledger, Reconciliation, Google sync, Dues config
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Toast notification state
  const [toast, setToast] = useState('');
  
  // Dues configuration Form State
  const [duesForm, setDuesForm] = useState({
    academic_year: '2025/2026',
    semester: 1,
    level100: 100,
    level200: 150,
    level300: 250,
    level400: 300
  });

  // Google Sync UI States
  const [syncing, setSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState({
    lastSynced: 'Today, 2:00 AM',
    newAccounts: 0,
    suspendedAccounts: 0
  });
  const [syncLogsList, setSyncLogsList] = useState([
    { timestamp: 'Jul 3 · 2:00 AM', new_students_count: 10, errors_count: 0 },
    { timestamp: 'Jul 2 · 2:00 AM', new_students_count: 0, errors_count: 0 },
    { timestamp: 'Jul 1 · 2:00 AM', new_students_count: 0, errors_count: 0 }
  ]);

  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await getAllStudents();
      setStudents(response.data.students || []);
      
      // Load sync logs from database
      const logsRes = await getSyncLogs();
      if (logsRes.data.logs && logsRes.data.logs.length > 0) {
        setSyncLogsList(logsRes.data.logs);
      }
    } catch (err) {
      setError('Failed to load students.');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => {
      setToast('');
    }, 2500);
  };

  const handleSetDues = async (e) => {
    e.preventDefault();
    try {
      const duesPayload = {
        academic_year: duesForm.academic_year,
        semester: duesForm.semester,
        dues: [
          { level: 100, amount: parseFloat(duesForm.level100) },
          { level: 200, amount: parseFloat(duesForm.level200) },
          { level: 300, amount: parseFloat(duesForm.level300) },
          { level: 400, amount: parseFloat(duesForm.level400) }
        ]
      };
      await setDuesConfig(duesPayload);
      showToast('Dues configuration saved successfully');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to configure dues.');
    }
  };

  const handleSyncDirectory = async () => {
    setSyncing(true);
    setError('');
    try {
      const response = await syncGoogleDirectory();
      
      // Simulate the 2.5 second spinning animation requested
      setTimeout(async () => {
        if (response.data.success) {
          setSyncStats({
            lastSynced: 'Just now',
            newAccounts: response.data.stats.syncedCount,
            suspendedAccounts: response.data.stats.suspendedCount
          });
          
          showToast('Google Directory sync completed');
          
          // Prepend entry to sync logs list
          const newLog = {
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            new_students_count: response.data.stats.syncedCount,
            errors_count: 0
          };
          setSyncLogsList(prev => [newLog, ...prev.slice(0, 4)]);
          
          fetchData();
        }
        setSyncing(false);
      }, 2500);

    } catch (err) {
      setError(err.response?.data?.message || 'Google sync failed.');
      setSyncing(false);
    }
  };

  const handleMomoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Verify extension (US-3.1.1 compliance)
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'csv' && ext !== 'xlsx') {
      setError('Please upload a valid MoMo CSV or Excel file.');
      return;
    }

    const formData = new FormData();
    formData.append('statement', file);
    
    try {
      await reconcileUpload(formData);
      showToast('MoMo statement parsed successfully');
      navigate('/reconcile');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload MoMo statement.');
    }
  };

  const handleLogout = () => {
    logoutUser();
    navigate('/');
  };

  const getStudentStatus = (student) => {
    const paid = parseFloat(student.total_paid || 0);
    const outstanding = parseFloat(student.outstanding || 0);
    if (paid > 0 && outstanding > 0) return 'PARTIAL';
    if (outstanding <= 0) return 'CLEARED';
    return 'OWING';
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#0F6E56] border-t-transparent animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Loading accountant dashboard...</span>
        </div>
      </div>
    );
  }

  // Aggregate numbers
  const totalStudents = students.length;
  const clearedStudentsCount = students.filter(s => getStudentStatus(s) === 'CLEARED').length;
  const owingStudentsCount = students.filter(s => getStudentStatus(s) === 'OWING').length;
  const totalCollectedAmount = students.reduce((sum, s) => sum + parseFloat(s.total_paid || 0), 0);

  // Search filter
  const filteredStudents = students.filter(student => 
    student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.index_number?.includes(searchTerm)
  );

  const tabs = ['Overview', 'Student ledger', 'Reconciliation', 'Google sync', 'Dues config'];

  return (
    <div className="w-full min-h-screen bg-slate-50 flex justify-center py-0 lg:py-8 font-sans">
      <div className="w-full max-w-[420px] lg:max-w-6xl min-h-screen lg:min-h-0 lg:my-auto bg-white flex flex-col border-x border-slate-300 text-slate-700 shadow-none pb-16 lg:pb-8 relative lg:rounded-[16px] lg:border lg:shadow-sm">
        
        {/* 1. NAVBAR & 2. TAB BAR (Navy Background #1F3864) */}
        <div className="bg-[#1F3864] text-white shrink-0">
          {/* Navbar */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
            <div>
              <span className="block text-[9px] text-white/50 tracking-wider uppercase font-medium">
                Electrical Dept
              </span>
              <span className="block text-base font-medium text-white -mt-0.5">
                Accountant dashboard
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Role chip pill (Accountant specifications) */}
              <div className="rounded-full bg-[#E1F5EE] border-[0.5px] border-[#E1F5EE]/20 text-[#085041] px-2.5 py-0.5 pr-3.5 flex items-center gap-1.5 shrink-0">
                <div className="w-5 h-5 rounded-full bg-[#0F6E56] flex items-center justify-center text-white shrink-0">
                  <Calculator size={11} />
                </div>
                <div className="flex flex-col items-start leading-[1.1]">
                  <span className="text-[7.5px] font-medium uppercase tracking-wider opacity-90">
                    Accountant
                  </span>
                  <span className="text-[10px] font-medium truncate max-w-[80px]">
                    {user?.full_name}
                  </span>
                </div>
              </div>
              
              {/* Logout button */}
              <button 
                type="button" 
                onClick={handleLogout}
                className="w-8 h-8 rounded-[8px] border border-white/10 flex items-center justify-center bg-white/5 text-white/80 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition active:scale-95 shrink-0"
                aria-label="Log out"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>

          {/* Tab Bar */}
          <div className="flex px-4 pt-1 gap-5 overflow-x-auto scrollbar-none">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  setError('');
                  setSuccess('');
                }}
                className={`pb-2.5 text-xs font-medium transition-all relative flex items-center shrink-0 ${
                  activeTab === tab ? "text-white" : "text-white/60 hover:text-white/80"
                }`}
              >
                <span>{tab}</span>
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Global Error Banner inside view frame */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-300 text-red-700 rounded-[12px] text-xs font-medium flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 text-sm">✕</button>
          </div>
        )}

        {/* 3. OVERVIEW TAB content */}
        {activeTab === 'Overview' && (
          <div className="flex-1 p-4 flex flex-col gap-4">
            <span className="text-[10px] font-medium tracking-wider text-slate-400 uppercase">Financial Summary</span>
            
            {/* 2x2 stats grid (becomes 4-column on desktop) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              {/* Total Students */}
              <div className="border border-slate-300 rounded-[12px] bg-white p-3.5 flex flex-col justify-between h-[115px]">
                <div className="w-8 h-8 rounded-[8px] bg-blue-50 flex items-center justify-center text-blue-600">
                  <Users size={16} />
                </div>
                <div>
                  <span className="block text-xl font-medium text-slate-900 leading-tight">
                    {totalStudents}
                  </span>
                  <span className="block text-[11px] text-slate-400 font-medium">
                    Total students
                  </span>
                </div>
              </div>

              {/* Cleared Dues */}
              <div className="border border-slate-300 rounded-[12px] bg-white p-3.5 flex flex-col justify-between h-[115px]">
                <div className="w-8 h-8 rounded-[8px] bg-green-50 flex items-center justify-center text-green-600">
                  <CheckCircle size={16} />
                </div>
                <div>
                  <span className="block text-xl font-medium text-green-700 leading-tight">
                    {clearedStudentsCount}
                  </span>
                  <span className="block text-[11px] text-slate-400 font-medium">
                    Cleared dues
                  </span>
                </div>
              </div>

              {/* Owing Dues */}
              <div className="border border-slate-300 rounded-[12px] bg-white p-3.5 flex flex-col justify-between h-[115px]">
                <div className="w-8 h-8 rounded-[8px] bg-red-50 flex items-center justify-center text-red-600">
                  <AlertCircle size={16} />
                </div>
                <div>
                  <span className="block text-xl font-medium text-red-700 leading-tight">
                    {owingStudentsCount}
                  </span>
                  <span className="block text-[11px] text-slate-400 font-medium">
                    Owing dues
                  </span>
                </div>
              </div>

              {/* Total Collected */}
              <div className="border border-slate-300 rounded-[12px] bg-white p-3.5 flex flex-col justify-between h-[115px]">
                <div className="w-8 h-8 rounded-[8px] bg-teal-50 flex items-center justify-center text-[#0F6E56]">
                  <Coins size={16} />
                </div>
                <div>
                  <span className="block text-xl font-medium text-[#0F6E56] leading-tight">
                    ₵{totalCollectedAmount.toFixed(0)}
                  </span>
                  <span className="block text-[11px] text-slate-400 font-medium">
                    Total collected
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions 2x2 Button Grid */}
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-medium tracking-wider text-slate-400 uppercase">Quick Actions</span>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                <button 
                  type="button"
                  onClick={() => setActiveTab('Reconciliation')}
                  className="border border-teal-300 bg-teal-50 text-[#085041] p-3.5 rounded-[12px] flex flex-col items-center justify-center gap-1.5 text-xs font-medium hover:bg-teal-100 transition active:scale-95 cursor-pointer"
                >
                  <Upload size={16} className="text-[#0F6E56]" />
                  <span>Upload Momo CSV</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('Student ledger')}
                  className="border border-blue-300 bg-blue-50 text-blue-700 p-3.5 rounded-[12px] flex flex-col items-center justify-center gap-1.5 text-xs font-medium hover:bg-blue-100 transition active:scale-95 cursor-pointer"
                >
                  <Users size={16} />
                  <span>Student ledger</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('Google sync')}
                  className="border border-amber-300 bg-amber-50 text-amber-700 p-3.5 rounded-[12px] flex flex-col items-center justify-center gap-1.5 text-xs font-medium hover:bg-amber-100 transition active:scale-95 cursor-pointer"
                >
                  <GoogleIcon size={16} className="text-amber-600" />
                  <span>Google sync</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('Dues config')}
                  className="border border-[#1F3864]/20 bg-[#1F3864]/5 text-[#1F3864] p-3.5 rounded-[12px] flex flex-col items-center justify-center gap-1.5 text-xs font-medium hover:bg-[#1F3864]/10 transition active:scale-95 cursor-pointer"
                >
                  <Settings size={16} />
                  <span>Dues config</span>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* 4. STUDENT LEDGER TAB content */}
        {activeTab === 'Student ledger' && (
          <div className="flex-1 p-4 flex flex-col gap-4">
            <span className="text-[10px] font-medium tracking-wider text-slate-400 uppercase">Student Ledger Directory</span>
            
            {/* Search Bar */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search size={16} />
              </span>
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by index or name"
                className="w-full text-xs pl-9 pr-4 py-2.5 border border-slate-300 rounded-[8px] bg-white text-slate-700 focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>

            {/* Students List Grid (multi-column on desktop) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
              {filteredStudents.map((student) => {
                const status = getStudentStatus(student);
                const initials = student.full_name
                  ? student.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                  : 'ST';
                
                // Color mapping for avatar initials
                const statusStyles = {
                  CLEARED: {
                    avatar: 'bg-green-50 text-green-700 border border-green-300',
                    pill: 'bg-green-50 text-green-700 border border-green-300',
                    label: 'Cleared'
                  },
                  PARTIAL: {
                    avatar: 'bg-amber-50 text-amber-700 border border-amber-300',
                    pill: 'bg-amber-50 text-amber-700 border border-amber-300',
                    label: 'Partial'
                  },
                  OWING: {
                    avatar: 'bg-red-50 text-red-700 border border-red-300',
                    pill: 'bg-red-50 text-red-700 border border-red-300',
                    label: 'Owing'
                  }
                };

                const style = statusStyles[status];

                return (
                  <div key={student.id} className="border border-slate-300 rounded-[12px] bg-white p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium shrink-0 ${style.avatar}`}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <span className="block text-sm font-medium text-slate-900 truncate">
                            {student.full_name}
                          </span>
                          <span className="block text-[11px] font-mono text-slate-500 font-medium">
                            {student.index_number}
                          </span>
                        </div>
                      </div>
                      
                      {/* Pill Badge */}
                      <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full ${style.pill}`}>
                        {style.label}
                      </span>
                    </div>

                    {/* Bottom ledger info row split by borders */}
                    <div className="grid grid-cols-3 text-center border-t border-slate-300 mt-2 pt-2.5 text-[10px] text-slate-500 font-medium leading-tight">
                      <div className="border-r border-slate-200">
                        <span className="block text-[8px] text-slate-400 uppercase tracking-wide">Level</span>
                        <span className="block mt-0.5 text-slate-900 font-medium">L{student.current_level}</span>
                      </div>
                      <div className="border-r border-slate-200">
                        <span className="block text-[8px] text-slate-400 uppercase tracking-wide">Paid</span>
                        <span className="block mt-0.5 text-green-700 font-medium">₵{parseFloat(student.total_paid || 0).toFixed(0)}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-slate-400 uppercase tracking-wide">Outstanding</span>
                        <span className="block mt-0.5 text-red-600 font-medium">₵{parseFloat(student.outstanding || 0).toFixed(0)}</span>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* 5. RECONCILIATION TAB content */}
        {activeTab === 'Reconciliation' && (
          <div className="flex-1 p-4 flex flex-col gap-4">
            <span className="text-[10px] font-medium tracking-wider text-slate-400 uppercase">Momo CSV Reconciliation</span>
            
            <div className="flex flex-col lg:flex-row gap-4 items-stretch">
              {/* Dashed Dropzone Box */}
              <label className="flex-1 border-2 border-dashed border-slate-300 rounded-[12px] p-8 text-center flex flex-col items-center justify-center gap-3 bg-slate-50/50 hover:bg-slate-100/50 transition cursor-pointer">
                <input 
                  type="file" 
                  accept=".csv, .xlsx"
                  className="hidden" 
                  onChange={handleMomoUpload}
                />
                <Upload size={24} className="text-slate-400" />
                <div>
                  <span className="block text-sm font-medium text-slate-800">Upload Momo statement</span>
                  <span className="block text-[11px] text-slate-400 font-medium mt-1">CSV or XLSX · MTN, Vodafone, or AirtelTigo</span>
                </div>
              </label>

              <div className="lg:w-[320px] flex flex-col gap-3 shrink-0 justify-between">
                {/* Info Hint Box */}
                <div className="bg-blue-50 border border-blue-300 text-blue-800 rounded-[8px] p-3 text-[11.5px] leading-normal flex items-start gap-2.5 font-medium">
                  <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    The system parses the Narration column and auto-matches payment references to student records for your confirmation.
                  </span>
                </div>

                <button 
                  type="button"
                  onClick={() => navigate('/reconcile')}
                  className="w-full py-2.5 border border-blue-300 bg-blue-50 text-blue-700 rounded-[8px] text-xs font-medium hover:bg-blue-100 transition active:scale-95 cursor-pointer"
                >
                  Open Reconciliation Wizard
                </button>
              </div>
            </div>

          </div>
        )}

        {/* 6. GOOGLE SYNC TAB content */}
        {activeTab === 'Google sync' && (
          <div className="flex-1 p-4 flex flex-col gap-4">
            <span className="text-[10px] font-medium tracking-wider text-slate-400 uppercase">Google Workspace Sync</span>
            
            <div className="flex flex-col lg:flex-row gap-4 items-start w-full">
              {/* Sync configuration card (Left) */}
              <div className="flex-1 w-full border border-slate-300 rounded-[12px] bg-white p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                      <GoogleIcon size={14} />
                    </div>
                    <span className="text-sm font-medium text-slate-900">Directory sync</span>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">
                    Connected
                  </span>
                </div>

                <div className="h-[0.5px] bg-slate-100 w-full" />
                
                <div className="flex flex-col gap-2.5 text-xs">
                  <div className="flex justify-between items-center font-medium">
                    <span className="text-slate-500">Last synced</span>
                    <span className="text-slate-950">{syncStats.lastSynced}</span>
                  </div>
                  <div className="flex justify-between items-center font-medium">
                    <span className="text-slate-500">New accounts found</span>
                    <span className="text-slate-950">{syncStats.newAccounts}</span>
                  </div>
                  <div className="flex justify-between items-center font-medium">
                    <span className="text-slate-500">Suspended accounts</span>
                    <span className="text-slate-950">{syncStats.suspendedAccounts}</span>
                  </div>
                  <div className="flex justify-between items-center font-medium">
                    <span className="text-slate-500">Total synced students</span>
                    <span className="text-blue-600">{totalStudents}</span>
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={handleSyncDirectory}
                  disabled={syncing}
                  className="mt-1 bg-[#E1F5EE] border border-[#0F6E56] text-[#085041] hover:bg-[#d0f0e4] font-medium py-2 rounded-[8px] flex items-center justify-center gap-2 text-xs w-full transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                  <span>{syncing ? 'Synchronizing...' : 'Run sync now'}</span>
                </button>
              </div>

              {/* Sync log card (Right) */}
              <div className="lg:w-[350px] w-full border border-slate-300 rounded-[12px] bg-white p-4 flex flex-col gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <ListTodo size={16} className="text-slate-400" />
                  <span className="text-sm font-medium text-slate-900">Sync log</span>
                </div>
                
                <div className="h-[0.5px] bg-slate-100 w-full" />
                
                <div className="flex flex-col gap-3 text-xs">
                  {syncLogsList.slice(0, 3).map((log, index) => (
                    <div key={index} className="flex justify-between items-center font-medium">
                      <span className="text-slate-500">
                        {log.timestamp || new Date(log.created_at).toLocaleString()}
                      </span>
                      <span className="text-green-700 font-medium">
                        {log.new_students_count} synced · {log.errors_count || 0} errors
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* 7. DUES CONFIG TAB content */}
        {activeTab === 'Dues config' && (
          <div className="flex-1 p-4 flex flex-col gap-4">
            <span className="text-[10px] font-medium tracking-wider text-slate-400 uppercase">Dues configuration</span>
            
            <form onSubmit={handleSetDues} className="border border-slate-300 rounded-[12px] bg-white p-4 flex flex-col gap-4 max-w-md lg:mx-auto lg:w-full lg:mt-6">
              <div className="flex items-center gap-2">
                <Settings size={16} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-900">Configure semester dues</span>
              </div>
              
              <p className="text-[11px] text-slate-400 font-medium leading-normal -mt-2">
                Set the dues amount per level for the active semester.
              </p>

              <div className="h-[0.5px] bg-slate-100 w-full" />
              
              {/* 2x2 Input Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-slate-400">Level 100</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500 text-xs">₵</span>
                    <input 
                      type="number"
                      required
                      value={duesForm.level100}
                      onChange={(e) => setDuesForm({...duesForm, level100: e.target.value})}
                      className="w-full text-xs pl-6 pr-3 py-2 border border-slate-300 rounded-[8px] bg-white focus:outline-none focus:border-blue-500 font-medium text-slate-700"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-slate-400">Level 200</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500 text-xs">₵</span>
                    <input 
                      type="number"
                      required
                      value={duesForm.level200}
                      onChange={(e) => setDuesForm({...duesForm, level200: e.target.value})}
                      className="w-full text-xs pl-6 pr-3 py-2 border border-slate-300 rounded-[8px] bg-white focus:outline-none focus:border-blue-500 font-medium text-slate-700"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-slate-400">Level 300</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500 text-xs">₵</span>
                    <input 
                      type="number"
                      required
                      value={duesForm.level300}
                      onChange={(e) => setDuesForm({...duesForm, level300: e.target.value})}
                      className="w-full text-xs pl-6 pr-3 py-2 border border-slate-300 rounded-[8px] bg-white focus:outline-none focus:border-blue-500 font-medium text-slate-700"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-slate-400">Level 400</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500 text-xs">₵</span>
                    <input 
                      type="number"
                      required
                      value={duesForm.level400}
                      onChange={(e) => setDuesForm({...duesForm, level400: e.target.value})}
                      className="w-full text-xs pl-6 pr-3 py-2 border border-slate-300 rounded-[8px] bg-white focus:outline-none focus:border-blue-500 font-medium text-slate-700"
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                className="mt-1 bg-[#1F3864] hover:bg-[#1a3055] text-white py-2 rounded-[8px] flex items-center justify-center gap-2 text-xs font-medium w-full transition active:scale-95 cursor-pointer"
              >
                <Save size={13} />
                <span>Save dues configuration</span>
              </button>
            </form>

          </div>
        )}

        {/* Global Toast Notification Card at bottom center */}
        {toast && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1F3864] text-white text-xs px-4 py-2.5 rounded-[12px] shadow-lg font-medium whitespace-nowrap animate-bounce">
            {toast}
          </div>
        )}

      </div>
    </div>
  );
};

export default AccountantDashboard;