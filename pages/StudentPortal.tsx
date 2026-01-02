import React, { useState, useReducer, useEffect } from 'react';
import { CurrentUser } from '../types.ts';
import { messStore } from '../store/messStore.ts';
import { Card, Button, Badge, Modal, Input } from '../components/UI.tsx';
import { formatCurrency, formatDate } from '../utils/helpers.ts';
import { History, Calendar, CheckCircle, AlertTriangle, ShieldCheck, QrCode, Copy, Smartphone, Check, Clock } from 'lucide-react';

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

  // Local state
  const [payAmount, setPayAmount] = useState(balance > 0 ? balance.toString() : '500');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Update input amount when balance changes
  useEffect(() => {
    if (balance > 0) {
      setPayAmount(balance.toString());
    } else {
      setPayAmount(''); 
    }
  }, [balance, refreshKey]);

  // --- UPI CONFIGURATION ---
  const ADMIN_UPI_ID = "ifu.infas-1@okicici"; 
  const ADMIN_NAME = "MessPro Hostel Admin";
  
  // Construct UPI Link: upi://pay?pa=...&pn=...&am=...&cu=INR
  const upiLink = `upi://pay?pa=${ADMIN_UPI_ID}&pn=${encodeURIComponent(ADMIN_NAME)}&am=${payAmount}&cu=INR&tn=MessFee-${user.name}`;
  
  // Generate QR Code URL (Using free API for demo purposes)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(ADMIN_UPI_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionId.trim()) return;

    setIsSubmitting(true);
    const amount = parseFloat(payAmount);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
        // Record payment in store as PENDING
        await messStore.recordPayment({
            student_id: user.id,
            amount: amount,
            date: new Date().toISOString(),
            mode: 'upi', 
            transaction_id: transactionId.trim(),
            notes: 'Manual User Submission',
            status: 'pending' // Important: Mark as pending for Admin approval
        });

        setIsPaymentModalOpen(false);
        setTransactionId('');
        forceUpdate(); // Update UI
        alert("Payment Recorded! Admin will verify the Transaction ID shortly.");

    } catch (error: any) {
        alert("Error recording payment: " + error.message);
    } finally {
        setIsSubmitting(false);
    }
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
                      min="1"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-bold"
                     />
                   </div>
                   <div className="flex items-end">
                     <Button 
                      variant="primary" 
                      onClick={() => setIsPaymentModalOpen(true)}
                      disabled={!payAmount || parseFloat(payAmount) <= 0}
                      className="h-[42px] px-6 shadow-none"
                     >
                        <span>Pay Now</span>
                     </Button>
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-1.5 text-[10px] text-slate-500 justify-center opacity-70">
                    <ShieldCheck size={12} className="text-emerald-500" />
                    <span>Secure UPI Payment</span>
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
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Transaction ID</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length === 0 ? (
                 <tr><td colSpan={5} className="p-4 text-center text-slate-500">No payments found.</td></tr>
              ) : (
                payments.map(p => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 text-slate-700">{formatDate(p.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`capitalize px-2 py-0.5 rounded text-xs border ${
                        p.mode === 'online' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 
                        p.mode === 'upi' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                        'bg-slate-50 border-slate-200 text-slate-600'
                      }`}>
                        {p.mode === 'upi' ? 'UPI' : p.mode}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                        {p.status === 'verified' ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                <CheckCircle size={12} /> Verified
                            </span>
                        ) : p.status === 'rejected' ? (
                            <span className="flex items-center gap-1 text-xs text-rose-600 font-medium">
                                <AlertTriangle size={12} /> Rejected
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                                <Clock size={12} /> Pending
                            </span>
                        )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.transaction_id || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(p.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* UPI Payment Modal */}
      <Modal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)} 
        title="Pay via UPI"
      >
        <div className="space-y-6">
            {/* Step 1: Scan or Click */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 mb-4">
                    <img 
                        src={qrCodeUrl} 
                        alt="UPI QR Code" 
                        className="w-40 h-40 object-contain" 
                    />
                </div>
                
                <p className="text-sm font-medium text-slate-600 mb-3">Scan with GPay, PhonePe, or Paytm</p>
                
                <div className="flex flex-col w-full gap-2">
                    {/* Mobile Deep Link Button */}
                    <a 
                        href={upiLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-200 transition-all active:scale-95"
                    >
                        <Smartphone size={16} />
                        Tap to Open UPI App
                    </a>

                    {/* Copy UPI ID */}
                    <button 
                        onClick={handleCopyUpi}
                        className="flex items-center justify-center gap-2 w-full py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-medium transition-colors"
                    >
                        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        {copied ? 'Copied!' : `Copy ID: ${ADMIN_UPI_ID}`}
                    </button>
                </div>
            </div>

            {/* Step 2: Verify */}
            <form onSubmit={handleManualPaymentSubmit} className="space-y-4 pt-4 border-t border-slate-100">
                <div>
                    <h4 className="text-sm font-bold text-slate-900 mb-1">Verify Payment</h4>
                    <p className="text-xs text-slate-500 mb-3">After paying, paste the Transaction ID / UTR Number below.</p>
                    <Input 
                        placeholder="e.g. 334512345678" 
                        value={transactionId} 
                        onChange={(e) => setTransactionId(e.target.value)}
                        required
                        label="Transaction ID / Ref No."
                    />
                </div>

                <div className="bg-blue-50 p-3 rounded-lg flex gap-2 items-start">
                    <CheckCircle className="text-blue-600 shrink-0 mt-0.5" size={16} />
                    <p className="text-xs text-blue-700">
                        Paying <span className="font-bold">{formatCurrency(parseFloat(payAmount))}</span>. Admin will verify this transaction ID against the bank statement.
                    </p>
                </div>

                <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isSubmitting || !transactionId.trim()}
                >
                    {isSubmitting ? 'Verifying...' : 'Submit Payment Details'}
                </Button>
            </form>
        </div>
      </Modal>
    </div>
  );
};

export default StudentPortal;