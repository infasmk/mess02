import React, { useEffect, useState } from 'react';
import { messStore } from '../store/messStore.ts';
import { KPIStats, Student, ActivityLog } from '../types.ts';
import { Card } from '../components/UI.tsx';
import { formatCurrency, formatDate, getDerivedStatus } from '../utils/helpers.ts';
import { TrendingUp, Users, AlertCircle, Wallet, MessageCircle, Clock, UserPlus, CreditCard, ArrowRight } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<KPIStats | null>(null);
  const [overdueStudents, setOverdueStudents] = useState<(Student & { balance: number })[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Ensure Supabase data is loaded if refreshed directly on dashboard
      if (messStore.isLoading) {
        await messStore.init();
      }
      setStats(messStore.getStats());
      setActivityLog(messStore.getRecentActivity());
      
      // Filter Logic: Show in Overdue list ONLY if:
      // 1. Has Balance > 0
      // 2. AND (Has No Active Plan OR Active Plan is Expired)
      const allWithDues = messStore.getStudentsWithDues().filter(s => s.balance > 0);
      const criticalOverdue = allWithDues.filter(s => {
          const activeAssignment = messStore.getActiveAssignment(s.id);
          const status = getDerivedStatus(activeAssignment, s.balance);
          return status.isOverdue; // This helper returns true if balance > 0 and (no plan or expired plan)
      });

      setOverdueStudents(criticalOverdue);
      setLoading(false);
    };
    load();
  }, []);

  const handleWhatsAppReminder = async (student: Student & { balance: number }) => {
    const message = `Hello ${student.name}, this is a gentle reminder from the Mess Admin. Your meal plan has expired and you have a pending due of ${formatCurrency(student.balance)}. Please pay at the earliest to resume services.`;
    const url = `https://wa.me/91${student.phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    await messStore.updateLastReminder(student.id);
  };

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>)}
      </div>
    );
  }

  const kpiData = [
    { label: 'Total Collections', value: formatCurrency(stats.totalCollections), icon: Wallet, color: 'text-indigo-600', bg: 'bg-indigo-50', ring: 'ring-indigo-500/10' },
    { label: 'Expired Dues', value: formatCurrency(stats.totalOverdue), icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50', ring: 'ring-rose-500/10' },
    { label: 'Active Residents', value: stats.activeResidents, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-500/10' },
    { label: 'Net Receivables', value: formatCurrency(stats.outstandingBalance), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-500/10' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Overview</h2>
          <p className="text-slate-500 mt-1 font-medium">Here's what's happening in your mess today.</p>
        </div>
        <span className="text-sm font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
          {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpiData.map((kpi, idx) => (
          <Card key={idx} className="p-5 flex items-start justify-between group hover:border-indigo-100/50">
            <div>
              <p className="text-sm font-semibold text-slate-500 mb-1">{kpi.label}</p>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight group-hover:text-indigo-700 transition-colors">{kpi.value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color} ring-4 ${kpi.ring} transition-transform group-hover:scale-110`}>
              <kpi.icon size={22} />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="h-full border-slate-200/60 shadow-md shadow-slate-200/50">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <AlertCircle size={18} className="text-rose-500" />
                Expired & Overdue
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

        {/* Recent Activity Section (Replaced Quick Actions) */}
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