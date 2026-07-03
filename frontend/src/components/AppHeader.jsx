import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  LogOut, 
  CircleUser, 
  GraduationCap, 
  UserCheck, 
  Calculator 
} from 'lucide-react';

const AppHeader = ({ 
  role = 'STUDENT', 
  userName = 'Unknown User', 
  pageTitle = 'Dashboard', 
  subtitle = '', 
  onBack,
  onLogout 
}) => {
  const navigate = useNavigate();
  const { logoutUser } = useAuth();

  const handleDefaultLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      logoutUser();
      navigate('/');
    }
  };

  const handleDefaultBack = () => {
    if (onBack) {
      onBack();
    } else {
      // Default back navigation helper
      if (role === 'STUDENT') navigate('/student');
      else if (role === 'ACCOUNTANT') navigate('/accountant');
      else if (role === 'HOD') navigate('/hod');
      else if (role === 'COURSE_REP') navigate('/expenses');
      else navigate(-1);
    }
  };

  // Role style mapping
  const getRoleConfig = (userRole) => {
    const normRole = userRole?.toUpperCase() || 'STUDENT';
    switch (normRole) {
      case 'COURSE_REP':
        return {
          bgClass: 'bg-[#FAEEDA] border-[#f3d7ab]',
          textClass: 'text-[#633806]',
          iconBgClass: 'bg-[#854F0B]',
          label: 'Course rep',
          Icon: CircleUser
        };
      case 'STUDENT':
        return {
          bgClass: 'bg-blue-50 border-blue-200',
          textClass: 'text-blue-900',
          iconBgClass: 'bg-[#1e40af]',
          label: 'Student',
          Icon: GraduationCap
        };
      case 'HOD':
        return {
          bgClass: 'bg-purple-50 border-purple-200',
          textClass: 'text-purple-950',
          iconBgClass: 'bg-[#6b21a8]',
          label: 'Hod',
          Icon: UserCheck
        };
      case 'ACCOUNTANT':
        return {
          bgClass: 'bg-teal-50 border-teal-200',
          textClass: 'text-teal-950',
          iconBgClass: 'bg-[#0f766e]',
          label: 'Accountant',
          Icon: Calculator
        };
      default:
        return {
          bgClass: 'bg-slate-50 border-slate-200',
          textClass: 'text-slate-900',
          iconBgClass: 'bg-slate-700',
          label: 'User',
          Icon: CircleUser
        };
    }
  };

  const config = getRoleConfig(role);
  const RoleIcon = config.Icon;

  return (
    <div className="w-full bg-white flex flex-col font-sans">
      
      {/* Top Navbar */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100">
        
        {/* Left Side: Back Arrow + Breadcrumb */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button 
            type="button"
            onClick={handleDefaultBack}
            className="w-8 h-8 rounded-[8px] border border-slate-200 flex items-center justify-center bg-white text-slate-700 hover:bg-slate-50 active:scale-95 transition shrink-0"
            aria-label="Back"
          >
            <ArrowLeft size={16} />
          </button>
          
          <div className="min-w-0">
            <span className="block text-[9px] font-bold text-slate-400 tracking-wider uppercase leading-tight">
              ELECTRICAL DEPT
            </span>
            <span className="block text-sm font-bold text-slate-950 truncate -mt-0.5">
              {pageTitle}
            </span>
          </div>
        </div>

        {/* Right Side: Role Chip + Logout */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Role Chip Pill */}
          <div className={`rounded-full border-[0.5px] px-2.5 py-0.5 pr-3.5 flex items-center gap-2 ${config.bgClass} ${config.textClass}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 ${config.iconBgClass}`}>
              <RoleIcon size={13} />
            </div>
            <div className="flex flex-col items-start leading-[1.1]">
              <span className="text-[8px] font-semibold uppercase tracking-wider opacity-85">
                {config.label}
              </span>
              <span className="text-[11px] font-bold truncate max-w-[80px]">
                {userName}
              </span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleDefaultLogout}
            className="w-8 h-8 rounded-[8px] border border-slate-200 flex items-center justify-center bg-white text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200 active:scale-95 transition"
            aria-label="Log out"
          >
            <LogOut size={15} />
          </button>
        </div>

      </div>

      {/* Hero Page Section */}
      <div className="px-4 py-5 bg-white">
        <h1 className="text-xl font-bold text-slate-950 leading-tight">
          {pageTitle}
        </h1>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1 font-medium leading-normal">
            {subtitle}
          </p>
        )}
      </div>

      {/* Thin divider line below hero */}
      <div className="w-full h-[0.5px] bg-slate-200"></div>

    </div>
  );
};

export default AppHeader;
