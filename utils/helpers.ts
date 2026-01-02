import { Assignment } from '../types';

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const getDaysInMonth = (dateString: string) => {
  const d = new Date(dateString);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
};

export const calculateProratedCharge = (
  monthlyPrice: number,
  startDate: string,
  endDate: string
): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Calculate duration in days (inclusive)
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const activeDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const daysInStartMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const dailyRate = monthlyPrice / daysInStartMonth;
  
  return Math.round(dailyRate * activeDays);
};

export const generateId = () => {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
};

export const getDaysRemaining = (endDateStr: string): number => {
  const end = new Date(endDateStr);
  const today = new Date();
  end.setHours(23, 59, 59, 999); // End of the end date
  
  const diffTime = end.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const getDerivedStatus = (activeAssignment: Assignment | undefined, balance: number): { 
  label: string; 
  color: 'emerald' | 'amber' | 'rose' | 'slate';
  isOverdue: boolean 
} => {
  // If no active assignment
  if (!activeAssignment) {
    if (balance > 0) return { label: 'Overdue', color: 'rose', isOverdue: true };
    return { label: 'Inactive', color: 'slate', isOverdue: false };
  }

  const daysLeft = getDaysRemaining(activeAssignment.end_date);

  // Expired Logic
  if (daysLeft < 0) {
    if (balance > 10) { // Tolerance of 10rs
        return { label: 'Overdue', color: 'rose', isOverdue: true };
    }
    return { label: 'Expired', color: 'slate', isOverdue: false };
  }

  // Active Assignment Logic
  if (daysLeft <= 3) {
    return { label: 'Expiring Soon', color: 'amber', isOverdue: false };
  }

  return { label: 'Ongoing', color: 'emerald', isOverdue: false };
};