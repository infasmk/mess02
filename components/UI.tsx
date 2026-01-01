import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow duration-300 ${className}`}>
    {children}
  </div>
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'success' }> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}) => {
  const baseStyle = "px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2";
  
  const variants = {
    primary: "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-lg shadow-indigo-200 border border-transparent",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm",
    danger: "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 hover:border-rose-300",
    success: "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-200 hover:from-emerald-600 hover:to-emerald-700",
    outline: "bg-transparent border border-indigo-200 text-indigo-600 hover:bg-indigo-50",
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">{label}</label>}
    <input 
      className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all ${className}`}
      {...props}
    />
  </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }> = ({ label, children, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">{label}</label>}
    <div className="relative">
      <select 
        className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none ${className}`}
        {...props}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
        <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
      </div>
    </div>
  </div>
);

export const DateRangePicker: React.FC<{
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}> = ({ startDate, endDate, onChange }) => {
  const [viewDate, setViewDate] = React.useState(() => startDate ? new Date(startDate) : new Date());

  useEffect(() => {
    if (startDate) {
      const date = new Date(startDate);
      if (!isNaN(date.getTime()) && date.getMonth() !== viewDate.getMonth()) {
         setViewDate(date);
      }
    }
  }, [startDate]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const getDaysArray = () => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const days = [];
    
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const formatDate = (d: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  const isInRange = (d: number) => {
    if (!startDate || !endDate) return false;
    const current = formatDate(d);
    return current > startDate && current < endDate;
  };

  const handleDateClick = (d: number) => {
    const clicked = formatDate(d);
    if (!startDate || (startDate && endDate)) {
      onChange(clicked, '');
    } else {
      if (clicked < startDate) {
        onChange(clicked, '');
      } else {
        onChange(startDate, clicked);
      }
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 select-none">
      <div className="flex justify-between items-center mb-4 px-1">
        <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <span className="font-bold text-slate-800">
          {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </span>
        <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="text-center text-xs font-bold text-slate-400 py-1">{day}</div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-y-1">
        {getDaysArray().map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} />;
          
          const dateStr = formatDate(day);
          const isStart = dateStr === startDate;
          const isEnd = dateStr === endDate;
          const inRange = isInRange(day);
          
          return (
            <div 
              key={day} 
              onClick={() => handleDateClick(day)}
              className="relative p-0.5 cursor-pointer"
            >
                {/* Visual connectors for range continuity */}
                 {isStart && endDate && (
                    <div className="absolute top-0 bottom-0 right-0 w-1/2 bg-indigo-50 z-0"></div>
                 )}
                 {isEnd && startDate && (
                    <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-indigo-50 z-0"></div>
                 )}
                 {inRange && (
                    <div className="absolute inset-0 bg-indigo-50 z-0"></div>
                 )}

                <button
                    type="button"
                    className={`
                        h-8 w-8 mx-auto flex items-center justify-center rounded-lg text-sm transition-all relative z-10
                        ${(isStart || isEnd) ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200' : ''}
                        ${(!isStart && !isEnd && inRange) ? 'text-indigo-700 font-semibold' : ''}
                        ${(!isStart && !isEnd && !inRange) ? 'text-slate-700 hover:bg-slate-100 font-medium' : ''}
                    `}
                >
                    {day}
                </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl transform transition-all scale-100 border border-slate-100">
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export const Badge: React.FC<{ status: 'active' | 'inactive' | 'completed' | 'pending' }> = ({ status }) => {
  const styles = {
    active: 'bg-emerald-50 text-emerald-700 border border-emerald-100 ring-1 ring-emerald-500/10',
    completed: 'bg-slate-50 text-slate-600 border border-slate-200',
    inactive: 'bg-rose-50 text-rose-700 border border-rose-100 ring-1 ring-rose-500/10',
    pending: 'bg-amber-50 text-amber-700 border border-amber-100 ring-1 ring-amber-500/10'
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${styles[status] || styles.completed}`}>
      {status}
    </span>
  );
};