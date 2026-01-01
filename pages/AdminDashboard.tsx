import React, { useEffect, useState } from 'react';
import { messStore } from '../store/messStore.ts';
import { KPIStats, Student } from '../types.ts';
import { Card } from '../components/UI.tsx';
import { formatCurrency, formatDate } from '../utils/helpers.ts';
import { TrendingUp, Users, AlertCircle, Wallet, MessageCircle, Send, ArrowUpRight } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<KPIStats | null>(null);
  const [overdueStudents, setOverdueStudents] = useState<(Student & { balance: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate async data load
    const load = () => {
      setStats(messStore.getStats());
      setOverdueStudents(messStore.getStudentsWithDues().filter(s => s.balance > 0));
      setLoading(false);
    };
    load();
  }, []);

  const handleWhatsAppReminder = (student: Student & { balance: number }) => {
    const message = `Hello ${student.name}, this is a gentle reminder from the Mess Admin. You have a pending due of ${formatCurrency(student.balance)}. Please pay at the earliest to avoid service interruption.`;
    const url = `https://wa.me/91${student.phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    messStore.updateLastReminder(student.id);
    setOverdueStudents([...messStore.getStudentsWithDues().filter(s => s.balance > 0)]);
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
    { label: 'Outstanding Dues', value: formatCurrency(stats.totalOverdue), icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50', ring: 'ring-rose-500/10' },
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
                Overdue Watchlist
              </h3>
              <span className="text-xs font-semibold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">{overdueStudents.length} Pending</span>
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
                          <p className="font-medium text-slate-600">All payments are up to date!</p>
                          <p className="text-sm mt-1">Great job managing collections.</p>
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

        <div>
          <Card className="h-full bg-gradient-to-br from-indigo-600 to-indigo-800 text-white relative overflow-hidden border-0 shadow-xl shadow-indigo-500/20">
             {/* Decorative Background */}
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-40 h-40 bg-indigo-500/40 rounded-full blur-2xl"></div>
            
            <div className="relative p-6 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <TrendingUp size={20} className="text-white" />
                  </div>
                  <h3 className="text-lg font-bold">Quick Actions</h3>
                </div>
                <p className="text-indigo-100 text-sm mb-8 leading-relaxed">Streamline your daily tasks. Send reminders or generate reports instantly.</p>
                
                <div className="space-y-3">
                  <button className="w-full bg-white/10 hover:bg-white/20 text-left px-4 py-3.5 rounded-xl flex items-center justify-between transition-all backdrop-blur-md border border-white/10 group">
                    <div className="flex items-center space-x-3">
                      <div className="bg-white text-indigo-600 p-1.5 rounded-lg">
                        <Send size={16} />
                      </div>
                      <span className="font-semibold text-sm">Bulk Reminders</span>
                    </div>
                    <ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-indigo-400/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                    <span className="text-xs font-semibold text-indigo-100 tracking-wide">SYSTEM OPERATIONAL</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;