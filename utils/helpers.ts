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

  // Simple Proration: (Monthly Price / 30) * Active Days
  // Using 30 as a standard denominator for mess calculations often simplifies logic, 
  // but strictly correct is days in specific month. Let's use 30 for stability or specific month days.
  // Requirement: (Monthly Price / Days in Month) × Active Days
  
  const daysInStartMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const dailyRate = monthlyPrice / daysInStartMonth;
  
  return Math.round(dailyRate * activeDays);
};

export const generateId = () => {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
};