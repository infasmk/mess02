
import React, { useEffect, useState, useMemo } from 'react';
import { messStore } from '../store/messStore.ts';
import { KPIStats, Student, ActivityLog, Payment } from '../types.ts';
import { Card, Select } from '../components/UI.tsx';
import { formatCurrency, formatDate, getDerivedStatus } from '../utils/helpers.ts';
import { TrendingUp, Users, AlertCircle, Wallet, MessageCircle, Clock, UserPlus, CreditCard, ArrowRight, Check, X, RefreshCw, Calendar } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<KPIStats | null>(null);
  const [overdueStudents, setOverdueStudents] = useState<(Student & { balance: number })[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // Used to trigger re-renders

  // Month Filter State (Default to current month YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    const load = async () => {
      // Force init on refreshKey change > 0, otherwise standard lazy load
      if (messStore.isLoading || refreshKey > 0) {
        await messStore.init(refreshKey > 0);
      }
      setStats(messStore.getStats());
      setActivityLog(messStore.getRecentActivity());
      setPendingPayments(messStore.getPendingPayments());
      
      const allWithDues = messStore.getStudentsWithDues().filter(s => s.balance > 0);
      const criticalOverdue = allWithDues.filter(s => {
          const activeAssignment = messStore.getActiveAssignment(s.id);
          const status = getDerivedStatus(activeAssignment, s.balance);
          return status.isOverdue; 
      });

      setOverdueStudents(criticalOverdue);
      setLoading(false);
    };
    load();
  }, [refreshKey]);

  // --- FILTERING LOGIC ---
  const filteredStats = useMemo(() => {
      if (!selectedMonth) return { collections: 0, receivables: 0 };

      const isAllTime = selectedMonth === 'all';

      // 1. Calculate Collections for the period
      const periodPayments = messStore.payments.filter(p => {
          if (p.status !== 'verified') return false;
          if (isAllTime) return true;
          return p.date.startsWith(selectedMonth);
      });
      const periodCollections = periodPayments.reduce((sum, p) => sum + Number(p.amount), 0);

      // 2. Calculate Billings (Assignments) for the period
      const periodAssignments = messStore.assignments.filter(a => {
          if (isAllTime) return true;
          // We consider the billing to happen in the month the plan starts
          return a.start_date.startsWith(selectedMonth);
      });
      const periodBillings = periodAssignments.reduce((sum, a) => sum + Number(a.charge), 0);

      // 3. Net Receivables = Billings - Collections
      const periodReceivables = periodBillings - periodCollections;

      return {
          collections: periodCollections,
          receivables: periodReceivables
      };

  }, [selectedMonth, stats, refreshKey]); // Recalculate when month changes or data refreshes

  // Generate Month Options (Last 12 Months + All Time)
  const monthOptions = useMemo(() => {
      const options = [{ value: 'all', label: 'All Time Total' }];
      const today = new Date();
      for (let i = 0; i < 12; i++) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const value = d.toISOString().slice(0, 7); // YYYY-MM
          const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
          options.push({ value, label });
      }
      return options;
  }, []);

  const handleRefresh = async () => {
      setLoading(true);
      // Incrementing key triggers useEffect which calls init(true)
      setRefreshKey(k => k + 1);
  };

  const handleVerifyPayment = async (id: string) => {
      if (confirm("Confirm receipt of this payment?")) {
          await messStore.verifyPayment(id);
          handleRefresh();
      }
  };

  const handleRejectPayment = async (id: string) => {
      if (confirm("Reject this payment record? This cannot be undone.")) {
          await messStore.rejectPayment(id);
          handleRefresh();
      }
  };

  const handleWhatsAppReminder = async (student: Student & { balance: number }) => {
    const message = `Hello ${student.name}, this is a gentle reminder from the Mess Admin. Your meal plan has expired and you have a pending due of ${formatCurrency(student.balance)}. Please pay at the earliest to resume services.`;
    const url = `https://wa.me/91${student.phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    await messStore.updateLastReminder(student.id);
  };

  if (loading && !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>)}
      </div>
    );
  }

  // KPIs: Collections and Receivables depend on Filter; Overdue and Residents are GLOBAL.
  const kpiData = [
    { 
        label: selectedMonth === 'all' ? 'Total Collections' : 'Collections (This Month)', 
        value: formatCurrency(filteredStats.collections), 
        icon: Wallet, 
        color: 'text-indigo-600', 
        bg: 'bg-indigo-50', 
        ring: 'ring-indigo-500/10' 
    },
    { 
        label: selectedMonth === 'all' ? 'Net Receivables' : 'Receivables (This Month)', 
        value: formatCurrency(filteredStats.receivables), 
        icon: TrendingUp, 
        color: 'text-blue-600', 
        bg: 'bg-blue-50', 
        ring: 'ring-blue-500/10' 
    },
    { 
        label: 'Current Expired Dues', 
        value: formatCurrency(stats?.totalOverdue || 0), 
        icon: AlertCircle, 
        color: 'text-rose-600', 
        bg: 'bg-rose-50', 
        ring: 'ring-rose-500/10' 
    },
    { 
        label: 'Active Residents', 
        value: stats?.activeResidents || 0, 
        icon: Users, 
        color: 'text-emerald-600', 
        bg: 'bg-emerald-50', 
        ring: 'ring-emerald-500/10' 
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Overview</h2>
          <p className="text-slate-500 mt-1 font-medium">Here's what's happening in your mess.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Month Filter Dropdown */}
            <div className="relative w-full sm:w-48">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar size={16} className="text-slate-500" />
                </div>
                <select 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none cursor-pointer"
                >
                    {monthOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
                <button 
                    onClick={handleRefresh} 
                    className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm active:scale-95 flex-none"
                    title="Refresh Data"
                >
                    <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                </button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpiData.map((kpi, idx) => (
          <Card key={idx} className="p-5 flex items-start justify-between group hover:border-indigo-100/50">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{kpi.label}</p>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight group-hover:text-indigo-700 transition-colors">{kpi.value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color} ring-4 ${kpi.ring} transition-transform group-hover:scale-110`}>
              <kpi.icon size={22} />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          
          {/* PENDING APPROVALS SECTION */}
          {pendingPayments.length > 0 && (
             <Card className="border-amber-200/60 shadow-md shadow-amber-500/5 bg-amber-50/30">
                <div className="p-5 border-b border-amber-100 flex justify-between items-center bg-amber-50/50">
                    <h3 className="font-bold text-amber-800 flex items-center gap-2">
                        <Clock size={18} className="text-amber-600" />
                        Pending Approvals
                    </h3>
                    <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200">
                        {pendingPayments.length} Requests
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <tbody className="divide-y divide-amber-100">
                            {pendingPayments.map(payment => {
                                const student = messStore.students.find(s => s.id === payment.student_id);
                                return (
                                    <tr key={payment.id} className="bg-white hover:bg-amber-50/50 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="font-bold text-slate-900">{student?.name || 'Unknown'}</div>
                                            <div className="text-xs text-slate-500 font-mono mt-0.5">{payment.transaction_id}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="font-bold text-slate-900">{formatCurrency(payment.amount)}</div>
                                            <div className="text-xs text-slate-400 capitalize">{payment.mode}</div>
                                        </td>
                                        <td className="px-5 py-4 text-xs text-slate-500">
                                            {formatDate(payment.date)}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => handleRejectPayment(payment.id)}
                                                    className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all"
                                                    title="Reject"
                                                >
                                                    <X size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleVerifyPayment(payment.id)}
                                                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-200 transition-all active:scale-95"
                                                    title="Verify & Accept"
                                                >
                                                    <Check size={16} />
                                                    <span className="font-semibold text-xs">Verify</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
             </Card>
          )}

          <Card className="h-full border-slate-200/60 shadow-md shadow-slate-200/50">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <AlertCircle size={18} className="text-rose-500" />
                Current Overdue (Live Status)
              </h3>
              <span className="text-xs font-semibold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">{overdueStudents.length} Action Items</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider">Resident</th>
                    <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider">Room</th>
                    <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider text-right">Amount</th>
                    <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider text-right">Last Reminded</th>
                    <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overdueStudents.length === 0 ? (
                     <tr>
                      <td colSpan={5} className="px-5 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <div className="bg-emerald-50 p-4 rounded-full mb-3">
                            <Wallet size={24} className="text-emerald-500" />
                          </div>
                          <p className="font-medium text-slate-600">No overdue payments!</p>
                          <p className="text-sm mt-1">Residents with ongoing plans are not listed here.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    overdueStudents.map(student => (
                      <tr key={student.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">{student.name}</div>
                          <div className="text-xs text-slate-400 font-medium mt-0.5">{student.phone}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-medium">
                            {student.room}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-rose-600 tabular-nums">
                          {formatCurrency(student.balance)}
                        </td>
                        <td className="px-5 py-4 text-right text-slate-500 text-xs font-medium">
                          {student.last_reminder_date ? formatDate(student.last_reminder_date) : <span className="text-slate-300">Never</span>}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button
                            onClick={() => handleWhatsAppReminder(student)}
                            className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100 p-2 rounded-lg transition-all active:scale-95 border border-emerald-100"
                            title="Send WhatsApp Reminder"
                          >
                            <MessageCircle size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Recent Activity Section */}
        <div>
          <Card className="h-full border-slate-200/60 bg-white">
            <div className="p-5 border-b border-slate-100 flex items-center space-x-2 bg-slate-50/50">
              <Clock size={18} className="text-indigo-600" />
              <h3 className="font-bold text-slate-800">Recent Activity</h3>
            </div>
            
            <div className="p-0">
               {activityLog.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">No activity recorded yet.</div>
               ) : (
                   <ul className="divide-y divide-slate-100">
                       {activityLog.map((log) => (
                           <li key={log.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-3">
                               <div className={`p-2 rounded-full shrink-0 ${
                                   log.type === 'payment' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                               }`}>
                                   {log.type === 'payment' ? <CreditCard size={14} /> : <UserPlus size={14} />}
                               </div>
                               <div className="flex-1 min-w-0">
                                   <p className="text-sm font-semibold text-slate-800 truncate">{log.title}</p>
                                   <p className="text-xs text-slate-500 truncate">{log.description}</p>
                                   <div className="flex items-center gap-2 mt-1">
                                       <span className="text-[10px] text-slate-400">{formatDate(log.date)}</span>
                                       {log.amount && (
                                           <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 rounded">{formatCurrency(log.amount)}</span>
                                       )}
                                   </div>
                               </div>
                           </li>
                       ))}
                   </ul>
               )}
               <div className="p-3 border-t border-slate-100 text-center">
                   <a href="#/history" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1">
                       View All <ArrowRight size={12} />
                   </a>
               </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
