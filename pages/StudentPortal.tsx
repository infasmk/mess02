import React, { useState, useReducer, useEffect } from 'react';
import { CurrentUser } from '../types.ts';
import { messStore } from '../store/messStore.ts';
import { initiatePayment } from '../services/payment.ts';
import { Card, Button, Badge } from '../components/UI.tsx';
import { formatCurrency, formatDate } from '../utils/helpers.ts';
import { ArrowUpRight, History, Calendar, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

interface StudentPortalProps {
  user: CurrentUser;
}

const StudentPortal: React.FC<StudentPortalProps> = ({ user }) => {
  // Use a reducer to force update since the store isn't reactive by default
  const [refreshKey, forceUpdate] = useReducer((x) => x + 1, 0);

  // Data fetching (runs on every render/refreshKey change)
  const balance = messStore.getStudentBalance(user.id);
  const assignments = messStore.getStudentAssignments(user.id);
  const payments = messStore.getStudentPayments(user.id);
  const activeAssignment = assignments.find(a => a.status === 'active');
  const studentProfile = messStore.students.find(s => s.id === user.id);

  // Local state
  const [payAmount, setPayAmount] = useState(balance > 0 ? balance.toString() : '500');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Update input amount when balance changes (e.g. after a payment)
  useEffect(() => {
    if (balance > 0) {
      setPayAmount(balance.toString());
    } else {
      setPayAmount(''); 
    }
  }, [balance, refreshKey]);

  const handlePayment = async () => {
    // Payment Logic temporarily disabled
    return;

    /* 
    setErrorMessage('');
    const amount = parseFloat(payAmount);

    if (isNaN(amount) || amount <= 0) {
      setErrorMessage("Please enter a valid amount greater than 0.");
      return;
    }

    setIsProcessing(true);

    await initiatePayment({
      amount: amount,
      studentName: user.name,
      studentPhone: studentProfile?.phone || '',
      description: `Mess Bill Payment - ${user.name}`,
      onSuccess: (response) => {
        // 1. Record in Store (Client-side Demo Logic)
        // In Prod: Store is updated via Webhook or Backend confirmation
        messStore.recordPayment({
          student_id: user.id,
          amount: amount,
          date: new Date().toISOString(),
          mode: 'online',
          transaction_id: response.razorpay_payment_id
        });

        setIsProcessing(false);
        
        // 2. Force re-render to update balance and history immediately
        forceUpdate();

        // 3. Show success message
        alert(`Payment Successful! \nRef: ${response.razorpay_payment_id}`);
      },
      onFailure: (error) => {
        setIsProcessing(false);
        if (error.message !== "Payment cancelled by user.") {
           setErrorMessage(error.message || "Payment failed. Please try again.");
        }
      }
    });
    */
  };

  // Helper to calculate days remaining safely
  const getDaysRemaining = (endDateStr: string) => {
    const end = new Date(endDateStr);
    const today = new Date();
    // Normalize to midnight to compare just dates
    end.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = activeAssignment ? getDaysRemaining(activeAssignment.end_date) : -999;
  // Show warning if 2 days or less remain AND strictly not expired (days >= 0)
  const showExpiryWarning = activeAssignment && daysRemaining <= 2 && daysRemaining >= 0;

  return (
    <div className="space-y-6">
      {/* Expiry Warning Banner */}
      {showExpiryWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-4 shadow-sm animate-fade-in relative overflow-hidden">
           <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-amber-100 rounded-full blur-xl opacity-50"></div>
           <div className="p-2.5 bg-white rounded-xl text-amber-600 shadow-sm border border-amber-100 shrink-0 z-10">
             <AlertTriangle size={24} />
           </div>
           <div className="z-10">
             <h4 className="font-bold text-amber-900 text-lg">
               {daysRemaining === 0 ? 'Plan Expires Today!' : 'Plan Expiring Soon!'}
             </h4>
             <p className="text-sm text-amber-800 mt-1 font-medium">
               Your current meal plan expires 
               {daysRemaining === 0 
                  ? <span className="font-bold"> today</span> 
                  : daysRemaining === 1 
                    ? <span className="font-bold"> tomorrow</span>
                    : <span> in <span className="font-bold underline decoration-amber-500/50">{daysRemaining} days</span></span>
               }. 
               Please ensure your wallet is topped up to continue enjoying your meals.
             </p>
           </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Balance Card - High Contrast */}
        <div className="flex-1">
          <Card className="h-full bg-slate-900 text-white border-slate-800 p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            
            <div>
              <p className="text-slate-400 font-medium mb-1">Total Payable Due</p>
              <h1 className="text-4xl font-bold tracking-tight mb-4">{formatCurrency(balance)}</h1>
              {balance <= 0 && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium border border-emerald-500/30">
                  <CheckCircle size={14} className="mr-1.5" /> No Dues
                </span>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800">
               <div className="flex flex-col gap-3">
                 <div className="flex gap-2">
                   <div className="flex-1">
                     <label className="text-xs text-slate-500 mb-1 block">Enter Amount (₹)</label>
                     <input 
                      type="number" 
                      value={payAmount} 
                      onChange={e => setPayAmount(e.target.value)} 
                      disabled={true}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white/50 cursor-not-allowed focus:ring-0 focus:border-slate-700 font-bold"
                     />
                   </div>
                   <div className="flex items-end">
                     <Button 
                      variant="secondary" 
                      onClick={handlePayment} 
                      disabled={true}
                      className="h-[42px] px-6 bg-slate-700 border-slate-600 text-slate-400 cursor-not-allowed shadow-none"
                     >
                        <span>Payments Disabled</span>
                     </Button>
                   </div>
                 </div>
                 
                 {errorMessage && (
                    <p className="text-rose-400 text-xs font-medium bg-rose-500/10 p-2 rounded border border-rose-500/20">
                      {errorMessage}
                    </p>
                 )}
                 
                 <div className="flex items-center gap-1.5 text-[10px] text-slate-500 justify-center opacity-70">
                    <ShieldCheck size={12} className="text-emerald-500" />
                    <span>Secured by Razorpay</span>
                 </div>
               </div>
            </div>
          </Card>
        </div>

        {/* Current Plan Status */}
        <div className="flex-1">
          <Card className="h-full p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Calendar size={20} className="text-indigo-600" />
                  Current Plan
                </h3>
                <Badge status={activeAssignment ? 'active' : 'inactive'} />
              </div>
              
              {activeAssignment ? (
                <>
                  <p className="text-2xl font-bold text-slate-900 mb-1">
                    {messStore.plans.find(p => p.id === activeAssignment.plan_id)?.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    Valid until {formatDate(activeAssignment.end_date)}
                  </p>
                  
                  {daysRemaining >= 0 && (
                     <div className="mt-6">
                        <div className="flex justify-between text-xs font-medium text-slate-500 mb-1">
                          <span>Progress</span>
                          <span className={daysRemaining <= 2 ? 'text-amber-600 font-bold' : ''}>
                             {daysRemaining === 0 ? 'Last Day' : `${daysRemaining} days left`}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-1000 ${daysRemaining <= 2 ? 'bg-amber-500' : 'bg-indigo-600'}`}
                            style={{ width: `${Math.max(5, Math.min(100, (daysRemaining / 30) * 100))}%` }}
                          ></div>
                        </div>
                     </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <p>No active meal plan found.</p>
                  <p className="text-xs mt-1">Contact admin to subscribe.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Ledger History */}
      <Card>
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <History size={18} className="text-slate-400" />
          <h3 className="font-bold text-slate-800">Payment History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Mode</th>
                <th className="px-4 py-3 font-medium">Transaction ID</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length === 0 ? (
                 <tr><td colSpan={4} className="p-4 text-center text-slate-500">No payments found.</td></tr>
              ) : (
                payments.map(p => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 text-slate-700">{formatDate(p.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`capitalize px-2 py-0.5 rounded text-xs border ${
                        p.mode === 'online' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}>
                        {p.mode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.transaction_id || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600">+{formatCurrency(p.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default StudentPortal;