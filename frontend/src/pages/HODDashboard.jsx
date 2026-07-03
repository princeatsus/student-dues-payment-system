import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDefaulters, grantOverride, getAllOverrides, getHODStats } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { 
  AlertTriangle, 
  ShieldCheck, 
  Users, 
  CheckCircle, 
  Download, 
  Receipt, 
  LogOut, 
  X 
} from 'lucide-react';

// Custom UserStar Icon SVG (compliant with specifications)
const UserStar = ({ size = 16, className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
    <path d="m22 10-1.25-.25L20 8.5l-.75 1.25L18 10l1.25.25.75 1.25.75-1.25L22 10z" />
  </svg>
);

// Custom ShieldPlus Icon SVG
const ShieldPlus = ({ size = 16, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <line x1="12" y1="8" x2="12" y2="14" />
    <line x1="9" y1="11" x2="15" y2="11" />
  </svg>
);

const HODDashboard = () => {
  const [activeTab, setActiveTab] = useState('Overview'); // Overview, Defaulters, Expenses
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
  
  // Override Modal Dialog state
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
    setError('');
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
      setSuccess(`Clearance exception granted for ${selectedStudent.full_name}`);
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to grant clearance.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportDefaulters = () => {
    if (defaulters.length === 0) return;
    const headers = ['Index number', 'Full name', 'Level', 'Class group', 'Outstanding dues (GHS)'];
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
    link.setAttribute('download', `Defaulters_list_HTU_computer_science.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLogout = () => {
    logoutUser();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#534AB7] border-t-transparent animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Loading department dashboard...</span>
        </div>
      </div>
    );
  }

  const tabs = ['Overview', 'Defaulters', 'Expenses'];

  return (
    <div className="w-full min-h-screen bg-slate-50 flex justify-center py-0 md:py-8 font-sans">
      <div className="w-full max-w-[420px] min-h-screen bg-white flex flex-col border-x border-slate-200 text-slate-700 shadow-none pb-16 relative">
        
        {/* 1. NAVBAR & 2. TAB BAR (Navy Background #1F3864) */}
        <div className="bg-[#1F3864] text-white shrink-0">
          {/* Navbar */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
            <div>
              <span className="block text-[9px] text-white/50 tracking-wider uppercase font-medium">
                HTU · Computer Science
              </span>
              <span className="block text-base font-medium text-white -mt-0.5">
                HOD Dashboard
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Role chip pill (HOD specifications) */}
              <div className="rounded-full bg-[#EEEDFE] border-[0.5px] border-[#EEEDFE]/20 text-[#3C3489] px-2.5 py-0.5 pr-3.5 flex items-center gap-1.5 shrink-0">
                <div className="w-5 h-5 rounded-full bg-[#534AB7] flex items-center justify-center text-white shrink-0">
                  <UserStar size={11} />
                </div>
                <div className="flex flex-col items-start leading-[1.1]">
                  <span className="text-[7.5px] font-medium uppercase tracking-wider opacity-90">
                    HOD
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
          <div className="flex px-4 pt-1 gap-6">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  setError('');
                  setSuccess('');
                }}
                className={`pb-2.5 text-xs font-medium transition-all relative flex items-center ${
                  activeTab === tab ? "text-white" : "text-white/60 hover:text-white/80"
                }`}
              >
                <span>{tab}</span>
                {tab === 'Defaulters' && defaulters.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[8px] font-medium leading-none">
                    {defaulters.length}
                  </span>
                )}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Success/Error Toasts inside content */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border-[0.5px] border-red-200 text-red-700 rounded-[12px] text-xs font-medium flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 text-sm">✕</button>
          </div>
        )}
        {success && (
          <div className="mx-4 mt-4 p-3 bg-green-50 border-[0.5px] border-green-200 text-green-700 rounded-[12px] text-xs font-medium flex items-center justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700 text-sm">✕</button>
          </div>
        )}

        {/* 3. OVERVIEW TAB content */}
        {activeTab === 'Overview' && (
          <div className="flex-1 p-4 flex flex-col gap-4">
            <span className="text-[10px] font-medium tracking-wider text-slate-400 uppercase">At a glance</span>
            
            {/* 2x2 stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Total Defaulters */}
              <div className="border-[0.5px] border-slate-200 rounded-[12px] bg-white p-3.5 flex flex-col justify-between h-[115px]">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-[8px] bg-red-50 flex items-center justify-center text-red-600">
                    <AlertTriangle size={16} />
                  </div>
                  <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 border-[0.5px] border-red-100">
                    Action needed
                  </span>
                </div>
                <div>
                  <span className="block text-xl font-medium text-slate-900 leading-tight">
                    {defaulters.length}
                  </span>
                  <span className="block text-[11px] text-slate-400 font-medium">
                    Total defaulters
                  </span>
                </div>
              </div>

              {/* Override Exceptions */}
              <div className="border-[0.5px] border-slate-200 rounded-[12px] bg-white p-3.5 flex flex-col justify-between h-[115px]">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-[8px] bg-amber-50 flex items-center justify-center text-amber-600">
                    <ShieldCheck size={16} />
                  </div>
                  <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border-[0.5px] border-amber-100">
                    Active
                  </span>
                </div>
                <div>
                  <span className="block text-xl font-medium text-slate-900 leading-tight">
                    {overrides.length}
                  </span>
                  <span className="block text-[11px] text-slate-400 font-medium">
                    Override exceptions
                  </span>
                </div>
              </div>

              {/* Total Enrolled */}
              <div className="border-[0.5px] border-slate-200 rounded-[12px] bg-white p-3.5 flex flex-col justify-between h-[115px]">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-[8px] bg-blue-50 flex items-center justify-center text-blue-600">
                    <Users size={16} />
                  </div>
                </div>
                <div>
                  <span className="block text-xl font-medium text-slate-900 leading-tight">
                    {stats.total_students}
                  </span>
                  <span className="block text-[11px] text-slate-400 font-medium">
                    Total enrolled
                  </span>
                </div>
              </div>

              {/* Fully Cleared */}
              <div className="border-[0.5px] border-slate-200 rounded-[12px] bg-white p-3.5 flex flex-col justify-between h-[115px]">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-[8px] bg-green-50 flex items-center justify-center text-green-600">
                    <CheckCircle size={16} />
                  </div>
                </div>
                <div>
                  <span className="block text-xl font-medium text-slate-900 leading-tight">
                    {stats.paid_students}
                  </span>
                  <span className="block text-[11px] text-slate-400 font-medium">
                    Fully cleared
                  </span>
                </div>
              </div>
            </div>

            {/* Collection Efficiency Card */}
            <div className="border-[0.5px] border-slate-200 rounded-[12px] bg-white p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-900">Collection efficiency</span>
                <span className="text-base font-medium text-blue-600">{stats.collection_efficiency}%</span>
              </div>
              
              {/* Progress bar (blue fill, gray track) */}
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-500" 
                  style={{ width: `${stats.collection_efficiency}%` }} 
                />
              </div>

              {/* Stats breakdown list */}
              <div className="flex flex-col gap-2.5 mt-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2 font-medium text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-green-500 block" />
                    Paid in full
                  </span>
                  <span className="font-medium text-slate-900">{stats.paid_students} student{stats.paid_students !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2 font-medium text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-red-500 block" />
                    Owing dues
                  </span>
                  <span className="font-medium text-slate-900">{defaulters.length} student{defaulters.length !== 1 ? 's' : ''}</span>
                </div>
                
                <div className="h-[0.5px] bg-slate-100 w-full my-0.5" />
                
                <div className="flex justify-between items-center">
                  <span className="font-medium text-slate-900">Total collected</span>
                  <span className="font-medium text-blue-600">₵{stats.total_collected.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Class Budget Card */}
            <div className="border-[0.5px] border-slate-200 rounded-[12px] bg-white p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-900">Class budget</span>
                <span className="text-xs font-medium text-slate-400">{stats.spend_ratio || 0}% spent</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="bg-slate-50 border-[0.5px] border-slate-100 rounded-[8px] p-2.5 flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-400 font-medium">Approved & disbursed</span>
                  <span className="text-xs font-medium text-green-600">₵{stats.total_disbursed.toFixed(2)}</span>
                </div>
                <div className="bg-slate-50 border-[0.5px] border-slate-100 rounded-[8px] p-2.5 flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-400 font-medium">Pending HOD/Finance</span>
                  <span className="text-xs font-medium text-amber-600">₵{stats.total_pending.toFixed(2)}</span>
                </div>
                <div className="bg-slate-50 border-[0.5px] border-slate-100 rounded-[8px] p-2.5 flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-400 font-medium">Total collected</span>
                  <span className="text-xs font-medium text-blue-600">₵{stats.total_collected.toFixed(2)}</span>
                </div>
                <div className="bg-slate-50 border-[0.5px] border-slate-100 rounded-[8px] p-2.5 flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-400 font-medium">Remaining balance</span>
                  <span className="text-xs font-medium text-slate-700">₵{stats.remaining_budget.toFixed(2)}</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* 4. DEFAULTERS TAB content */}
        {activeTab === 'Defaulters' && (
          <div className="flex-1 p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] font-medium tracking-wider text-slate-400 uppercase">Defaulters list</span>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{defaulters.length} student{defaulters.length !== 1 ? 's' : ''} with outstanding dues</p>
              </div>
              
              <button 
                type="button" 
                onClick={handleExportDefaulters}
                className="border-[0.5px] border-blue-200 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-[12px] flex items-center gap-1.5 text-xs font-medium hover:bg-blue-100 transition active:scale-95 shrink-0"
              >
                <Download size={13} />
                <span>Export</span>
              </button>
            </div>

            {defaulters.length === 0 ? (
              <div className="border-[0.5px] border-slate-200 rounded-[12px] p-8 text-center bg-white flex flex-col items-center gap-2 mt-4">
                <CheckCircle size={32} className="text-green-600" />
                <span className="text-sm font-medium text-slate-900">All cleared</span>
                <span className="text-xs text-slate-500 font-medium">No students are currently owing departmental dues.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {defaulters.map((student) => {
                  const initials = student.full_name
                    ? student.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                    : 'ST';
                  return (
                    <div key={student.id} className="border-[0.5px] border-slate-200 rounded-[12px] bg-white p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Red initials avatar */}
                        <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-medium shrink-0">
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
                      
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="inline-block text-[9px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                            L{student.current_level || '100'}
                          </span>
                          <span className="block text-xs font-medium text-red-600 mt-1">
                            ₵{parseFloat(student.outstanding || 0).toFixed(2)}
                          </span>
                        </div>

                        {/* HOD Clearance Exception override button */}
                        <button 
                          type="button" 
                          onClick={() => handleOpenModal(student)}
                          title="Grant exam clearance exception"
                          className="w-8 h-8 rounded-[8px] border border-slate-200 flex items-center justify-center bg-white text-slate-500 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200 active:scale-95 transition shrink-0"
                        >
                          <ShieldPlus size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 5. EXPENSES TAB content */}
        {activeTab === 'Expenses' && (
          <div className="flex-1 p-4 flex flex-col justify-center items-center py-20">
            <div className="border-[0.5px] border-slate-200 rounded-[12px] bg-white p-8 text-center flex flex-col items-center gap-2 max-w-[280px]">
              <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                <Receipt size={18} />
              </div>
              <span className="text-sm font-medium text-slate-900 mt-1">No pending expenses</span>
              <span className="text-xs text-slate-500 font-medium leading-normal">
                All expense requisitions have been approved or disbursed.
              </span>
            </div>
          </div>
        )}

        {/* Override Exception Text Area Dialog Modal */}
        {showModal && selectedStudent && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border-[0.5px] border-slate-200 rounded-[12px] w-full max-w-[340px] flex flex-col overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-900">Grant exam clearance</span>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="w-6 h-6 rounded-[6px] hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
                  aria-label="Close"
                >
                  <X size={14} />
                </button>
              </div>
              
              <div className="p-4 flex flex-col gap-3">
                <div className="bg-amber-50 border-[0.5px] border-amber-200 rounded-[8px] p-3 text-[11px] text-amber-800 leading-normal font-medium">
                  You are granting an exam clearance exception to <strong className="text-amber-950 font-medium">{selectedStudent.full_name}</strong> ({selectedStudent.index_number}).
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                    Reason for clearance
                  </label>
                  <textarea 
                    required
                    rows={4}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter detailed reason (minimum 10 characters)..."
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-[8px] focus:outline-none focus:border-blue-500 resize-none font-medium text-slate-700 bg-white"
                  />
                  {reason.length > 0 && reason.length < 10 && (
                    <span className="text-[10px] text-red-600 font-medium">
                      Reason must be at least 10 characters (currently {reason.length}).
                    </span>
                  )}
                </div>
              </div>

              <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-[8px] border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  disabled={submitting || reason.length < 10}
                  onClick={handleGrantOverride}
                  className="px-3 py-1.5 rounded-[8px] bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition flex items-center justify-center"
                >
                  {submitting ? 'Granting...' : 'Grant Exception'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default HODDashboard;