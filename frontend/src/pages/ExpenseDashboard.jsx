import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExpenses, submitExpense, approveExpense, rejectExpense, disburseExpense } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import AppHeader from '../components/AppHeader';
import { 
  ArrowLeft, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Upload, 
  X, 
  FolderOpen, 
  ArrowRight,
  TrendingUp,
  DollarSign,
  Info
} from 'lucide-react';

const ExpenseDashboard = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [selectedDisburseId, setSelectedDisburseId] = useState(null);
  
  // File Preview Modal
  const [previewImage, setPreviewImage] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [formData, setFormData] = useState({
    item_description: '',
    amount: '',
    vendor_name: '',
    purpose_justification: '',
    target_level: '',
    target_class_group: '',
    attachment_url: '' // Base64 image
  });
  const [disbursementProof, setDisbursementProof] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await getExpenses();
      setExpenses(response.data.expenses || []);
    } catch (err) {
      setError('Failed to load expenses. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Convert files to Base64 with a 2MB size check (NFR-PERF-03)
  const handleFileChange = (e, isDisbursement = false) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('⚠️ File size exceeds 2MB limit. Please upload a smaller receipt/invoice.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (isDisbursement) {
        setDisbursementProof(event.target.result);
      } else {
        setFormData(prev => ({ ...prev, attachment_url: event.target.result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await submitExpense(formData);
      setSuccess('Expense request submitted successfully!');
      setShowModal(false);
      setFormStep(1);
      setFormData({
        item_description: '',
        amount: '',
        vendor_name: '',
        purpose_justification: '',
        target_level: '',
        target_class_group: '',
        attachment_url: ''
      });
      fetchExpenses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveExpense(id);
      setSuccess('Expense approved! Sent to accountant.');
      fetchExpenses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve expense.');
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      await rejectExpense(id, { reason });
      setSuccess('Expense rejected.');
      fetchExpenses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject expense.');
    }
  };

  const handleOpenDisburseModal = (id) => {
    setSelectedDisburseId(id);
    setDisbursementProof('');
    setShowDisburseModal(true);
  };

  const handleOpenModal = () => {
    setError('');
    setSuccess('');
    setFormStep(1);
    setShowModal(true);
  };

  const handleConfirmDisbursement = async (e) => {
    e.preventDefault();
    if (!disbursementProof) {
      alert('Please upload the scanned receipt voucher first.');
      return;
    }
    setSubmitting(true);
    try {
      await disburseExpense(selectedDisburseId, {
        disbursement_proof_url: disbursementProof
      });
      setSuccess('Payment disbursed and receipt voucher logged successfully!');
      setShowDisburseModal(false);
      fetchExpenses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to disburse payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    navigate('/');
  };

  const handleBack = () => {
    if (user?.role === 'STUDENT') navigate('/student');
    else if (user?.role === 'ACCOUNTANT') navigate('/accountant');
    else if (user?.role === 'HOD') navigate('/hod');
    else navigate('/');
  };

  const isCourseRep = user?.role === 'COURSE_REP';
  const isHOD = user?.role === 'HOD';
  const isAccountant = user?.role === 'ACCOUNTANT';

  const sumAmountByStatus = (statusList) => {
    return expenses
      .filter(e => statusList.includes(e.status))
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  };

  const totalRequestedAmount = sumAmountByStatus(['PENDING_HOD', 'PENDING_FINANCE', 'DISBURSED']);
  const disbursedAmount = sumAmountByStatus(['DISBURSED']);
  const awaitingHodAmount = sumAmountByStatus(['PENDING_HOD']);
  const awaitingFinanceAmount = sumAmountByStatus(['PENDING_FINANCE']);

  const filteredExpenses = expenses.filter((exp) => {
    if (statusFilter === 'ALL') return true;
    return exp.status === statusFilter;
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'PENDING_HOD':
        return 'bg-amber-50 text-amber-800 border border-amber-200';
      case 'PENDING_FINANCE':
        return 'bg-teal-50 text-teal-800 border border-teal-200';
      case 'DISBURSED':
        return 'bg-teal-100 text-teal-900 border border-teal-300';
      case 'REJECTED':
        return 'bg-red-50 text-red-800 border border-red-200';
      default:
        return 'bg-slate-50 text-slate-600 border border-slate-200';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'PENDING_HOD':
        return 'Pending HOD';
      case 'PENDING_FINANCE':
        return 'Pending finance';
      case 'DISBURSED':
        return 'Disbursed';
      case 'REJECTED':
        return 'Rejected';
      default:
        return status.toLowerCase().replace('_', ' ');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-slate-900 font-semibold text-sm">Loading expenses...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 lg:bg-slate-50 flex justify-center items-start w-full font-sans">
      <div className="w-full max-w-[420px] lg:max-w-none bg-white lg:bg-slate-50 min-h-screen border-x border-slate-200 lg:border-none flex flex-col relative text-slate-700 shadow-none">
        
        {/* VIEW 1: Expense Request Multi-Step Form */}
        {showModal ? (
          <div className="flex-1 flex flex-col bg-white pb-6 max-w-xl lg:mx-auto w-full lg:my-8 lg:border lg:border-slate-300 lg:rounded-[12px] lg:shadow-sm">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center gap-3">
              <button 
                type="button"
                onClick={() => {
                  if (formStep > 1) setFormStep(formStep - 1);
                  else setShowModal(false);
                }} 
                className="p-1 text-slate-600 hover:bg-slate-50 rounded"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-lg font-bold text-slate-950">New expense request</h1>
                <p className="text-xs text-slate-500">
                  Level {user?.assigned_level || '300'} · Electrical Dept
                </p>
              </div>
            </div>

            {/* Form Progress */}
            <div className="px-6 py-4 flex items-center justify-between text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${formStep >= 1 ? 'bg-slate-950 text-white font-bold' : 'bg-slate-200 text-slate-600'}`}>1</span>
                <span className={formStep >= 1 ? 'text-slate-950 font-bold' : ''}>Details</span>
              </div>
              <div className="flex-1 h-[1px] bg-slate-200 mx-3"></div>
              <div className="flex items-center gap-1.5">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${formStep >= 2 ? 'bg-slate-950 text-white font-bold' : 'bg-slate-200 text-slate-600'}`}>2</span>
                <span className={formStep >= 2 ? 'text-slate-950 font-bold' : ''}>Amount</span>
              </div>
              <div className="flex-1 h-[1px] bg-slate-200 mx-3"></div>
              <div className="flex items-center gap-1.5">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${formStep >= 3 ? 'bg-slate-950 text-white font-bold' : 'bg-slate-200 text-slate-600'}`}>3</span>
                <span className={formStep >= 3 ? 'text-slate-950 font-bold' : ''}>Review</span>
              </div>
            </div>

            {/* Banner Warning */}
            <div className="m-4 p-3 bg-blue-50 border border-blue-100 rounded-[12px] flex gap-2.5">
              <Info size={16} className="text-blue-800 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-900 leading-normal">
                This request will go to the HOD for approval before the accountant can release funds.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col px-4 pb-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-[12px] text-xs text-red-800 font-medium">
                  ⚠️ {error}
                </div>
              )}

              {/* STEP 1: Details */}
              {formStep === 1 && (
                <div className="flex-1 flex flex-col gap-4">
                  <div className="bg-white border border-slate-200 rounded-[12px] p-4 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-800">Item description *</label>
                      <input
                        type="text"
                        name="item_description"
                        value={formData.item_description}
                        onChange={handleChange}
                        placeholder="e.g. Arduino Mega Kits ×5"
                        className="w-full px-3 py-2 border border-slate-200 rounded-[8px] text-sm focus:outline-none focus:border-slate-400 focus:bg-slate-50"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-800">Purpose / justification *</label>
                      <textarea
                        name="purpose_justification"
                        value={formData.purpose_justification}
                        onChange={handleChange}
                        placeholder="Explain why this purchase is needed for the class..."
                        rows="4"
                        className="w-full px-3 py-2 border border-slate-200 rounded-[8px] text-sm focus:outline-none focus:border-slate-400 focus:bg-slate-50 resize-none"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-800">Vendor name (optional)</label>
                      <input
                        type="text"
                        name="vendor_name"
                        value={formData.vendor_name}
                        onChange={handleChange}
                        placeholder="e.g. ElectroLab Ghana"
                        className="w-full px-3 py-2 border border-slate-200 rounded-[8px] text-sm focus:outline-none focus:border-slate-400 focus:bg-slate-50"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.item_description.trim() && formData.purpose_justification.trim()) {
                        setFormStep(2);
                      } else {
                        alert('Please fill out all required fields.');
                      }
                    }}
                    className="w-full mt-auto py-3 bg-slate-950 text-white rounded-[12px] font-semibold text-sm hover:bg-slate-900 transition flex items-center justify-center gap-1.5"
                  >
                    Next step <ArrowRight size={16} />
                  </button>
                </div>
              )}

              {/* STEP 2: Amount & Target */}
              {formStep === 2 && (
                <div className="flex-1 flex flex-col gap-4">
                  <div className="bg-white border border-slate-200 rounded-[12px] p-4 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-800">Amount (₵) *</label>
                      <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleChange}
                        placeholder="850"
                        className="w-full px-3 py-2 border border-slate-200 rounded-[8px] text-sm focus:outline-none focus:border-slate-400 focus:bg-slate-50"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-800">Target level *</label>
                      <select
                        name="target_level"
                        value={formData.target_level}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-200 rounded-[8px] text-sm bg-white focus:outline-none focus:border-slate-400 focus:bg-slate-50"
                        required
                      >
                        <option value="">Select level</option>
                        <option value="100">Level 100</option>
                        <option value="200">Level 200</option>
                        <option value="300">Level 300</option>
                        <option value="400">Level 400</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-800">Target class group</label>
                      <input
                        type="text"
                        name="target_class_group"
                        value={formData.target_class_group}
                        onChange={handleChange}
                        placeholder="e.g. A"
                        className="w-full px-3 py-2 border border-slate-200 rounded-[8px] text-sm focus:outline-none focus:border-slate-400 focus:bg-slate-50"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.amount && formData.target_level) {
                        setFormStep(3);
                      } else {
                        alert('Please fill out all required fields.');
                      }
                    }}
                    className="w-full mt-auto py-3 bg-slate-950 text-white rounded-[12px] font-semibold text-sm hover:bg-slate-900 transition flex items-center justify-center gap-1.5"
                  >
                    Next step <ArrowRight size={16} />
                  </button>
                </div>
              )}

              {/* STEP 3: Review & Upload */}
              {formStep === 3 && (
                <div className="flex-1 flex flex-col gap-4">
                  <div className="bg-white border border-slate-200 rounded-[12px] p-4 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-800">Supporting document *</label>
                      
                      <div className="relative border border-dashed border-slate-200 hover:border-slate-400 transition rounded-[8px] p-6 text-center cursor-pointer bg-slate-50/50 flex flex-col items-center justify-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, false)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          required={!formData.attachment_url}
                        />
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                          <Upload size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Tap to attach quote or receipt</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">PDF, JPG, or PNG · max 2MB</p>
                        </div>
                      </div>

                      {formData.attachment_url && (
                        <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-[8px] flex items-center justify-between">
                          <span className="text-xs text-teal-800 font-semibold flex items-center gap-1">
                            <CheckCircle size={14} className="text-teal-600" /> document_attached.jpg
                          </span>
                          <button 
                            type="button" 
                            onClick={() => setFormData(prev => ({ ...prev, attachment_url: '' }))}
                            className="p-1 text-slate-500 hover:text-red-500"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full mt-auto py-3 bg-slate-950 text-white rounded-[12px] font-semibold text-sm hover:bg-slate-900 transition disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    {submitting ? 'Submitting request...' : 'Submit request'}
                  </button>
                </div>
              )}
            </form>
          </div>
        ) : (
          /* VIEW 2: Dashboard Main Roster and Requests List */
          <div className="flex-1 flex flex-col bg-white lg:bg-slate-50 pb-20">
            <AppHeader 
              role={user?.role} 
              userName={user?.full_name} 
              pageTitle="Expense requests" 
              subtitle={`Level ${user?.assigned_level || user?.current_level || '300'} · Semester 1, 2025/2026`} 
              onBack={handleBack} 
              onLogout={handleLogout}
            />

            <div className="w-full px-4 lg:px-8 py-6 flex-1 flex flex-col gap-5">
              {/* Notification messages */}
              {success && (
                <div className="p-3 bg-teal-50 border border-teal-200 text-teal-800 rounded-[12px] text-xs font-semibold flex items-center justify-between">
                  <span>{success}</span>
                  <button onClick={() => setSuccess('')} className="text-teal-600 text-sm">✕</button>
                </div>
              )}

              {/* Course Rep Quick Navigation Actions */}
              {isCourseRep && (
                <div className="bg-white border border-slate-300 rounded-[12px] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-none">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Class management console</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Track your class members' payment history and send dues reminders.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => navigate('/roster')}
                    className="border border-slate-300 rounded-[8px] bg-slate-50 text-slate-700 px-4 py-2 flex items-center justify-center gap-1.5 text-xs font-semibold hover:bg-slate-100 transition active:scale-95 cursor-pointer shrink-0 font-medium"
                  >
                    <span>📋 View Class Roster</span>
                  </button>
                </div>
              )}

              {/* 2x2 Stats Cards Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 bg-slate-50/50 lg:bg-transparent p-4 lg:p-0 rounded-[12px] lg:rounded-none border border-slate-200 lg:border-none">
                <div className="bg-white border border-slate-300 rounded-[12px] p-3 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-500 font-semibold">Total requested</span>
                  <span className="text-sm font-bold text-slate-950 mt-1">₵{totalRequestedAmount.toFixed(2)}</span>
                  <span className="text-[9px] text-slate-400 mt-0.5">this semester</span>
                </div>
                <div className="bg-white border border-slate-300 rounded-[12px] p-3 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-500 font-semibold">Disbursed</span>
                  <span className="text-sm font-bold text-slate-950 mt-1">₵{disbursedAmount.toFixed(2)}</span>
                  <span className="text-[9px] text-slate-400 mt-0.5">released to rep</span>
                </div>
                <div className="bg-white border border-slate-300 rounded-[12px] p-3 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-500 font-semibold">Awaiting HOD</span>
                  <span className="text-sm font-bold text-slate-950 mt-1 text-amber-700">₵{awaitingHodAmount.toFixed(2)}</span>
                  <span className="text-[9px] text-slate-400 mt-0.5">pending HOD</span>
                </div>
                <div className="bg-white border border-slate-300 rounded-[12px] p-3 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-500 font-semibold">Awaiting finance</span>
                  <span className="text-sm font-bold text-slate-950 mt-1 text-teal-700">₵{awaitingFinanceAmount.toFixed(2)}</span>
                  <span className="text-[9px] text-slate-400 mt-0.5">approved funds</span>
                </div>
              </div>

              {/* Filter Toggle Buttons */}
              <div className="py-2 flex items-center justify-between border-y border-slate-200 lg:border-none bg-white lg:bg-transparent px-4 lg:px-0">
                <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
                  <button 
                    onClick={() => setStatusFilter('ALL')}
                    className={`text-xs px-3.5 py-1.5 font-bold rounded-full border transition shrink-0 ${statusFilter === 'ALL' ? 'bg-slate-950 text-white border-slate-950' : 'bg-white text-slate-600 border-slate-200'}`}
                  >
                    All
                  </button>
                  <button 
                    onClick={() => setStatusFilter('PENDING_HOD')}
                    className={`text-xs px-3.5 py-1.5 font-bold rounded-full border transition shrink-0 ${statusFilter === 'PENDING_HOD' ? 'bg-slate-950 text-white border-slate-950' : 'bg-white text-slate-600 border-slate-200'}`}
                  >
                    Pending HOD
                  </button>
                  <button 
                    onClick={() => setStatusFilter('PENDING_FINANCE')}
                    className={`text-xs px-3.5 py-1.5 font-bold rounded-full border transition shrink-0 ${statusFilter === 'PENDING_FINANCE' ? 'bg-slate-950 text-white border-slate-950' : 'bg-white text-slate-600 border-slate-200'}`}
                  >
                    Pending finance
                  </button>
                  <button 
                    onClick={() => setStatusFilter('DISBURSED')}
                    className={`text-xs px-3.5 py-1.5 font-bold rounded-full border transition shrink-0 ${statusFilter === 'DISBURSED' ? 'bg-slate-950 text-white border-slate-950' : 'bg-white text-slate-600 border-slate-200'}`}
                  >
                    Disbursed
                  </button>
                </div>
              </div>

              {/* Requests List */}
              <div className="mt-2 flex-1">
                <h2 className="text-[11px] font-bold text-slate-400 tracking-wider mb-2">REQUESTS</h2>
              
              {filteredExpenses.length === 0 ? (
                <div className="m-4 p-8 border border-slate-200 border-dashed rounded-[12px] bg-white text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center text-slate-400">
                    <FolderOpen size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-950">No requests found</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-[280px]">
                      All digital requisitions and reimbursement proofs will appear here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredExpenses.map((exp) => {
                    const description = exp.item_description?.trim() || 'Expense request';
                    const createdAtText = exp.created_at
                      ? new Date(exp.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : 'No date';

                    return (
                      <div 
                        key={exp.id} 
                        onClick={() => {
                          if (exp.attachment_url) setPreviewImage(exp.attachment_url);
                        }}
                        className="bg-white border border-slate-300 rounded-[12px] p-4 flex flex-col gap-3 hover:border-slate-400 transition cursor-pointer"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex gap-3">
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-[8px] bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                              {description.charAt(0).toUpperCase()}
                            </div>
                            
                            {/* Meta details */}
                            <div className="min-w-0">
                              <h4 className="text-sm font-semibold text-slate-950 truncate leading-snug">{description}</h4>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {exp.vendor_name || 'No vendor'} · {createdAtText}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                by {exp.requested_by_name || 'Unknown'} · Level {exp.target_level || 'N/A'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right shrink-0">
                            <span className="text-sm font-bold text-slate-950">₵{Number(exp.amount || 0).toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Badges and Actions Row */}
                        <div className="flex items-center justify-between border-t border-slate-50 pt-2 gap-2 flex-wrap">
                          {/* File indicators */}
                          <div className="flex gap-1.5">
                            {exp.attachment_url && (
                              <span className="text-[10px] font-semibold bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-[4px]">
                                📄 Invoice
                              </span>
                            )}
                            {exp.disbursement_proof_url && (
                              <span 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setPreviewImage(exp.disbursement_proof_url); 
                                }} 
                                className="text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-100 px-2 py-0.5 rounded-[4px] cursor-pointer"
                              >
                                🧾 Receipt
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Status badge */}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusBadgeClass(exp.status)}`}>
                              {getStatusLabel(exp.status)}
                            </span>

                            {/* Action triggers */}
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              {isHOD && exp.status === 'PENDING_HOD' && (
                                <>
                                  <button 
                                    onClick={() => handleApprove(exp.id)} 
                                    className="text-[10px] font-bold bg-teal-600 text-white px-2.5 py-1 rounded-[6px]"
                                  >
                                    Approve
                                  </button>
                                  <button 
                                    onClick={() => handleReject(exp.id)} 
                                    className="text-[10px] font-bold bg-red-600 text-white px-2.5 py-1 rounded-[6px]"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {isAccountant && exp.status === 'PENDING_FINANCE' && (
                                <button 
                                  onClick={() => handleOpenDisburseModal(exp.id)} 
                                  className="text-[10px] font-bold bg-slate-900 text-white px-2.5 py-1 rounded-[6px]"
                                >
                                  Disburse
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sticky submit button at bottom inside w-full frame */}
            {isCourseRep && (
              <div className="fixed lg:absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 z-10 w-full">
                <div className="w-full px-4 lg:px-8">
                  <button 
                    onClick={handleOpenModal}
                    className="w-full py-3 bg-[#1F3864] text-white rounded-[12px] font-semibold text-sm hover:bg-[#1a3055] transition text-center"
                  >
                    + Submit expense request
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
        )}

        {/* VIEW 3: Disbursement proof upload view */}
        {showDisburseModal && (
          <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-[2px] flex justify-center items-center p-4 z-50">
            <div className="w-full max-w-[360px] bg-white border border-slate-200 rounded-[12px] p-5 flex flex-col gap-4 font-sans">
              <div>
                <h3 className="text-base font-bold text-slate-950">Complete disbursement</h3>
                <p className="text-xs text-slate-500 mt-1">Upload the signed receipt voucher before releasing cash.</p>
              </div>
              <form onSubmit={handleConfirmDisbursement} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-800">Scanned receipt voucher *</label>
                  <div className="relative border border-dashed border-slate-200 hover:border-slate-400 transition rounded-[8px] p-4 text-center cursor-pointer bg-slate-50 flex flex-col items-center justify-center gap-1.5">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, true)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      required
                    />
                    <Upload size={16} className="text-slate-600" />
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Upload voucher image</p>
                      <span className="text-[10px] text-slate-400">Max size 2MB</span>
                    </div>
                  </div>

                  {disbursementProof && (
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-[8px] text-xs text-teal-800 font-semibold flex items-center gap-1 mt-2">
                      <CheckCircle size={14} className="text-teal-600" /> voucher_attached.jpg
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setShowDisburseModal(false)}
                    className="flex-1 py-2 text-xs font-semibold border border-slate-200 rounded-[8px] text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="flex-1 py-2 text-xs font-semibold bg-slate-950 text-white rounded-[8px] hover:bg-slate-900 disabled:opacity-60"
                  >
                    {submitting ? 'Confirming...' : 'Disburse cash'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* VIEW 4: Inline image view detail overlay */}
        {previewImage && (
          <div 
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-[2px] flex justify-center items-center p-4 z-50 cursor-pointer"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[380px] bg-white border border-slate-200 rounded-[12px] flex flex-col overflow-hidden"
            >
              <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-950 flex items-center gap-1.5">
                  <FileText size={14} /> Attachment preview
                </span>
                <button 
                  onClick={() => setPreviewImage(null)}
                  className="p-1 hover:bg-slate-100 rounded text-slate-500"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-4 bg-slate-50 flex items-center justify-center max-h-[70vh] overflow-y-auto">
                <img 
                  src={previewImage} 
                  alt="Attachment Preview" 
                  className="max-w-full h-auto object-contain rounded"
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ExpenseDashboard;