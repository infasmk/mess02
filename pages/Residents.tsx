
import React, { useState, useEffect } from 'react';
import { messStore } from '../store/messStore.ts';
import { Student } from '../types.ts';
import { Card, Button, Input, Modal, Select, DateRangePicker } from '../components/UI.tsx';
import { formatCurrency, calculateProratedCharge, getDerivedStatus, formatDate, getDaysRemaining } from '../utils/helpers.ts';
import { Search, UserPlus, CreditCard, Calendar, Phone, AlertCircle, Clock, Trash2, AlertTriangle, Loader2, Info, X } from 'lucide-react';

const Residents: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isAssignPlanOpen, setIsAssignPlanOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Form States
  const [newStudent, setNewStudent] = useState({ name: '', phone: '', room: '' });
  const [planForm, setPlanForm] = useState({ planId: '', startDate: '', endDate: '' });
  const [paymentForm, setPaymentForm] = useState({ amount: '', mode: 'cash' });
  const [assignmentError, setAssignmentError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Ensure store is ready
    if (messStore.isLoading) {
       await messStore.init(); 
    }
    setStudents(messStore.getStudentsWithDues());
    setLoading(false);
  };

  const refreshData = () => {
    setStudents(messStore.getStudentsWithDues());
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.room.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone.includes(searchTerm)
  );

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsActionLoading(true);
    try {
      await messStore.addStudent(newStudent);
      setIsAddStudentOpen(false);
      setNewStudent({ name: '', phone: '', room: '' });
      refreshData();
    } catch (err: any) {
      alert("Failed to add resident: " + err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAssignPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignmentError('');

    if (new Date(planForm.startDate) > new Date(planForm.endDate)) {
        setAssignmentError("End date must be after start date.");
        return;
    }

    if (!planForm.startDate || !planForm.endDate) {
        setAssignmentError("Please select a valid date range.");
        return;
    }

    if (selectedStudent && planForm.planId) {
      setIsActionLoading(true);
      try {
        await messStore.assignPlan(selectedStudent.id, planForm.planId, planForm.startDate, planForm.endDate);
        setIsAssignPlanOpen(false);
        refreshData();
      } catch (err: any) {
        setAssignmentError(err.message || "Failed to assign plan.");
      } finally {
        setIsActionLoading(false);
      }
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudent && paymentForm.amount) {
      setIsActionLoading(true);
      try {
        await messStore.recordPayment({
          student_id: selectedStudent.id,
          amount: parseFloat(paymentForm.amount),
          date: new Date().toISOString(),
          mode: paymentForm.mode as any,
          status: 'verified' // Admin Recorded payments are auto-verified
        });
        setIsPaymentOpen(false);
        setPaymentForm({ amount: '', mode: 'cash' });
        refreshData();
      } catch (err: any) {
        alert("Failed to record payment: " + err.message);
      } finally {
        setIsActionLoading(false);
      }
    }
  };

  const handleDeleteClick = (student: Student & { balance: number }) => {
    if (student.balance > 0) {
      alert(`Cannot delete ${student.name}. They have pending dues of ${formatCurrency(student.balance)}. Please clear dues first.`);
      return;
    }
    setSelectedStudent(student);
    setDeleteError('');
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedStudent) {
      setIsActionLoading(true);
      try {
        await messStore.deleteStudent(selectedStudent.id);
        setIsDeleteConfirmOpen(false);
        setSelectedStudent(null);
        refreshData();
      } catch (err: any) {
        setDeleteError(err.message);
      } finally {
        setIsActionLoading(false);
      }
    }
  };

  const setPlanDates = (offsetMonth: number) => {
    const now = new Date();
    // Calculate 1st day of the target month
    const start = new Date(now.getFullYear(), now.getMonth() + offsetMonth, 1);
    // Calculate last day of the target month
    const end = new Date(now.getFullYear(), now.getMonth() + offsetMonth + 1, 0);

    const formatDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    setPlanForm(prev => ({ ...prev, startDate: formatDate(start), endDate: formatDate(end) }));
    setAssignmentError('');
  };

  const openAssignPlan = (student: Student) => {
    setSelectedStudent(student);
    setAssignmentError('');
    // Default to "This Month"
    setPlanDates(0); 
    setPlanForm(prev => ({ ...prev, planId: messStore.plans[0]?.id || '' }));
    setIsAssignPlanOpen(true);
  };

  const openPayment = (student: Student) => {
    setSelectedStudent(student);
    const due = messStore.getStudentBalance(student.id);
    setPaymentForm({ amount: due > 0 ? due.toString() : '', mode: 'cash' });
    setIsPaymentOpen(true);
  };

  const openDetails = (student: Student) => {
      setSelectedStudent(student);
      setIsDetailsOpen(true);
  };

  const estimatedCharge = planForm.planId && planForm.startDate && planForm.endDate
    ? calculateProratedCharge(
        (messStore.plans.find(p => p.id === planForm.planId) || {monthly_price: 0}).monthly_price,
        planForm.startDate,
        planForm.endDate
      )
    : 0;

  // Render Logic Helpers
  const renderStatusBadge = (student: Student & { balance: number }) => {
      const activeAssignment = messStore.getActiveAssignment(student.id);
      const status = getDerivedStatus(activeAssignment, student.balance);

      const colorStyles = {
          emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
          amber: 'bg-amber-50 text-amber-700 border-amber-100',
          rose: 'bg-rose-50 text-rose-700 border-rose-100',
          slate: 'bg-slate-50 text-slate-600 border-slate-200'
      };

      return (
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colorStyles[status.color]}`}>
              {status.label}
          </span>
      );
  };

  if (loading) {
    return (
       <div className="flex items-center justify-center h-64">
         <Loader2 className="animate-spin text-indigo-600" size={32} />
       </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Residents</h2>
          <p className="text-slate-500 font-medium">Manage students, plans, and offline payments.</p>
        </div>
        <Button onClick={() => setIsAddStudentOpen(true)} className="shadow-indigo-200 shadow-md">
          <UserPlus size={18} />
          <span>Add Resident</span>
        </Button>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
        <input
          type="text"
          placeholder="Search by name, room, or phone..."
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredStudents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 border-dashed">
           <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
             <UserPlus size={24} />
           </div>
           <h3 className="text-lg font-bold text-slate-700">No Residents Found</h3>
           <p className="text-slate-500 text-sm mt-1">Add a new resident to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStudents.map(student => (
            <Card key={student.id} className="p-0 flex flex-col h-full hover:-translate-y-1 transition-transform duration-300">
              <div className="p-5 flex justify-between items-start">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg border border-slate-200">
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg leading-tight">{student.name}</h3>
                    <div className="flex items-center text-xs font-medium text-slate-500 mt-1 space-x-2">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">Room {student.room}</span>
                      <span className="flex items-center text-slate-400"><Phone size={10} className="mr-0.5" />{student.phone}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  {renderStatusBadge(student)}
                  <div className="flex gap-1 mt-1">
                      <button 
                        onClick={() => openDetails(student)}
                        className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Info size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(student)}
                        className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                        title="Delete Resident"
                      >
                        <Trash2 size={16} />
                      </button>
                  </div>
                </div>
              </div>
              
              <div className="mt-auto">
                <div className="px-5 py-3 bg-slate-50/50 border-y border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Balance</span>
                  <span className={`text-lg font-bold ${student.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatCurrency(student.balance)}
                  </span>
                </div>

                <div className="p-3 flex gap-3 bg-white">
                  <Button variant="secondary" className="flex-1 text-sm py-2" onClick={() => openAssignPlan(student)}>
                    <Calendar size={16} />
                    <span>Plan</span>
                  </Button>
                  <Button variant="outline" className="flex-1 text-sm py-2" onClick={() => openPayment(student)}>
                    <CreditCard size={16} />
                    <span>Pay</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* --- MODALS --- */}
      <Modal isOpen={isAddStudentOpen} onClose={() => setIsAddStudentOpen(false)} title="Register New Resident">
        <form onSubmit={handleAddStudent} className="space-y-5">
          <Input label="Full Name" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} required placeholder="e.g. John Doe" />
          <Input label="Phone Number" type="tel" value={newStudent.phone} onChange={e => setNewStudent({...newStudent, phone: e.target.value})} required placeholder="10-digit mobile number" />
          <Input label="Room Number" value={newStudent.room} onChange={e => setNewStudent({...newStudent, room: e.target.value})} required placeholder="e.g. A-101" />
          <Button type="submit" className="w-full mt-2" disabled={isActionLoading}>
            {isActionLoading ? 'Saving...' : 'Register Resident'}
          </Button>
        </form>
      </Modal>

      <Modal isOpen={isAssignPlanOpen} onClose={() => setIsAssignPlanOpen(false)} title={`Assign Plan to ${selectedStudent?.name}`}>
        <form onSubmit={handleAssignPlan} className="space-y-5">
          {assignmentError && (
             <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start space-x-2 animate-fade-in">
                <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-rose-700 font-medium">{assignmentError}</p>
             </div>
          )}
          <Select label="Select Meal Plan" value={planForm.planId} onChange={e => setPlanForm({...planForm, planId: e.target.value})} required>
            <option value="" disabled>Choose a plan...</option>
            {messStore.plans.map(p => (
              <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.monthly_price)}/mo</option>
            ))}
          </Select>

          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
                <label className="block text-sm font-semibold text-slate-700">Plan Duration</label>
                <div className="flex gap-2">
                    <button type="button" onClick={() => setPlanDates(0)} className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 transition-colors">This Month</button>
                    <button type="button" onClick={() => setPlanDates(1)} className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 transition-colors">Next Month</button>
                </div>
            </div>
            
            <DateRangePicker 
              startDate={planForm.startDate} 
              endDate={planForm.endDate} 
              onChange={(start, end) => {
                setPlanForm(prev => ({...prev, startDate: start, endDate: end}));
                if (start && end) setAssignmentError('');
              }} 
            />

            <div className="flex justify-between text-xs text-slate-500 px-1">
               <span>Start: <span className="font-semibold text-slate-700">{planForm.startDate || '-'}</span></span>
               <span>End: <span className="font-semibold text-slate-700">{planForm.endDate || '-'}</span></span>
            </div>
          </div>

          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-center justify-between">
             <div>
                <span className="text-sm font-medium text-indigo-700 block">Calculated Charge</span>
                {planForm.startDate && planForm.endDate && (
                    <span className="text-[10px] text-indigo-400 font-medium flex items-center mt-1">
                        <Clock size={10} className="mr-1"/>
                        {Math.ceil((new Date(planForm.endDate).getTime() - new Date(planForm.startDate).getTime()) / (1000 * 3600 * 24)) + 1} Days
                    </span>
                )}
             </div>
             <div className="text-right">
                <span className="block text-2xl font-bold text-indigo-700 leading-none">{formatCurrency(estimatedCharge)}</span>
                <span className="text-[10px] text-indigo-400 font-medium">PRO-RATED</span>
             </div>
          </div>

          <Button type="submit" className="w-full" disabled={!planForm.startDate || !planForm.endDate || isActionLoading}>
            {isActionLoading ? 'Processing...' : 'Confirm Assignment'}
          </Button>
        </form>
      </Modal>

      <Modal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} title="Record Offline Payment">
        <form onSubmit={handleRecordPayment} className="space-y-6">
          <div className="bg-slate-50 p-6 rounded-xl text-center border border-slate-100">
             <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Total Outstanding</p>
             <p className="text-3xl font-bold text-slate-900">{selectedStudent ? formatCurrency(messStore.getStudentBalance(selectedStudent.id)) : 0}</p>
          </div>
          
          <Input 
            label="Amount Received (₹)" 
            type="number" 
            value={paymentForm.amount} 
            onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} 
            required 
            min="1"
            className="text-lg font-bold"
          />
          
          <Select label="Payment Mode" value={paymentForm.mode} onChange={e => setPaymentForm({...paymentForm, mode: e.target.value})}>
            <option value="cash">Cash</option>
            <option value="upi">UPI / QR</option>
            <option value="bank_transfer">Bank Transfer</option>
          </Select>

          <Button type="submit" className="w-full" variant="success" disabled={isActionLoading}>
            {isActionLoading ? 'Recording...' : 'Record Payment'}
          </Button>
        </form>
      </Modal>

      <Modal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} title="Confirm Deletion">
        <div className="space-y-4">
          <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 flex gap-3 items-start">
             <div className="p-2 bg-white rounded-full text-rose-600 shadow-sm shrink-0">
               <AlertTriangle size={20} />
             </div>
             <div>
               <h4 className="font-bold text-rose-800">Delete Resident?</h4>
               <p className="text-sm text-rose-700 mt-1">
                 Are you sure you want to delete <span className="font-bold">{selectedStudent?.name}</span>? 
               </p>
               <p className="text-xs text-rose-600 mt-2 font-medium">
                 This will remove them from the residents directory. <br/>
                 <span className="underline decoration-rose-400">Payment history will be preserved</span>, but future access will be revoked.
               </p>
             </div>
          </div>
          
          {deleteError && (
             <p className="text-rose-600 text-sm font-medium text-center">{deleteError}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="danger" className="flex-1" onClick={confirmDelete} disabled={isActionLoading}>
              {isActionLoading ? 'Deleting...' : 'Yes, Delete Resident'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Details Modal */}
      <Modal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} title="Resident Details">
         {selectedStudent && (() => {
             const activePlan = messStore.getActiveAssignment(selectedStudent.id);
             const planDetails = activePlan ? messStore.plans.find(p => p.id === activePlan.plan_id) : null;
             const daysLeft = activePlan ? getDaysRemaining(activePlan.end_date) : 0;
             const isExpired = daysLeft < 0;

             return (
                 <div className="space-y-6">
                     <div className="flex items-center space-x-4 pb-4 border-b border-slate-100">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-2xl border border-indigo-100">
                            {selectedStudent.name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">{selectedStudent.name}</h3>
                            <p className="text-slate-500 font-medium">Room {selectedStudent.room}</p>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Active Subscription</h4>
                            {activePlan && planDetails ? (
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="font-bold text-slate-800 text-lg">{planDetails.name}</span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                            isExpired ? 'bg-slate-200 text-slate-600' : 
                                            daysLeft <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                        }`}>
                                            {isExpired ? 'EXPIRED' : daysLeft <= 3 ? 'EXPIRING SOON' : 'ACTIVE'}
                                        </span>
                                    </div>
                                    <div className="space-y-2 text-sm text-slate-600">
                                        <div className="flex justify-between">
                                            <span>Start Date</span>
                                            <span className="font-medium text-slate-900">{formatDate(activePlan.start_date)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>End Date</span>
                                            <span className="font-medium text-slate-900">{formatDate(activePlan.end_date)}</span>
                                        </div>
                                        <div className="pt-2 border-t border-slate-200 flex justify-between items-center mt-2">
                                            <span className="font-medium">Days Remaining</span>
                                            <span className={`font-bold ${daysLeft <= 3 ? 'text-amber-600' : 'text-indigo-600'}`}>
                                                {isExpired ? '0' : daysLeft} Days
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center p-6 bg-slate-50 rounded-xl border border-slate-200 border-dashed text-slate-400">
                                    No active meal plan.
                                </div>
                            )}
                        </div>
                     </div>
                 </div>
             );
         })()}
      </Modal>
    </div>
  );
};

export default Residents;
