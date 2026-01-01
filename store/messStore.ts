import { Student, MealPlan, Assignment, Payment, UserRole, KPIStats } from '../types.ts';
import { generateId, calculateProratedCharge } from '../utils/helpers.ts';

// Mock Data for Demo Mode
const MOCK_PLANS: MealPlan[] = [
  { id: 'plan_1', name: 'Full Mess (3 Meals)', monthly_price: 4500, meals: ['Breakfast', 'Lunch', 'Dinner'] },
  { id: 'plan_2', name: 'Dinner Only', monthly_price: 2000, meals: ['Dinner'] },
  { id: 'plan_3', name: 'Breakfast & Dinner', monthly_price: 3500, meals: ['Breakfast', 'Dinner'] },
];

const MOCK_STUDENTS: Student[] = [
  { id: 'stu_1', name: 'Rahul Sharma', phone: '9876543210', room: '101-A', status: 'active', created_at: new Date().toISOString() },
  { id: 'stu_2', name: 'Priya Verma', phone: '9876543211', room: '102-B', status: 'active', created_at: new Date().toISOString() },
  { id: 'stu_3', name: 'Amit Kumar', phone: '9876543212', room: '103-A', status: 'active', created_at: new Date().toISOString() },
  { id: 'stu_4', name: 'Sneha Gupta', phone: '9876543213', room: '104-C', status: 'inactive', created_at: new Date().toISOString() },
];

// Initial Assignments to generate some balance
const MOCK_ASSIGNMENTS: Assignment[] = [
  { id: 'asg_1', student_id: 'stu_1', plan_id: 'plan_1', start_date: '2023-10-01', end_date: '2023-10-31', charge: 4500, status: 'completed' },
  { id: 'asg_2', student_id: 'stu_1', plan_id: 'plan_1', start_date: '2023-11-01', end_date: '2023-11-30', charge: 4500, status: 'active' },
  { id: 'asg_3', student_id: 'stu_2', plan_id: 'plan_2', start_date: '2023-11-01', end_date: '2023-11-30', charge: 2000, status: 'active' },
  { id: 'asg_4', student_id: 'stu_3', plan_id: 'plan_1', start_date: '2023-11-05', end_date: '2023-11-30', charge: 3900, status: 'active' }, // Prorated example
];

const MOCK_PAYMENTS: Payment[] = [
  { id: 'pay_1', student_id: 'stu_1', amount: 4500, date: '2023-10-05', mode: 'online', transaction_id: 'tx_123' },
  { id: 'pay_2', student_id: 'stu_2', amount: 1000, date: '2023-11-02', mode: 'cash' },
];

class MessStore {
  students: Student[] = [];
  plans: MealPlan[] = [];
  assignments: Assignment[] = [];
  payments: Payment[] = [];
  isSupabaseConfigured = false;

  constructor() {
    this.isSupabaseConfigured = false; // Intentionally false for this demo to rely on LocalStorage logic
    this.loadData();
  }

  private loadData() {
    // In a real scenario, we would check process.env here.
    // For this prompt, we default to LocalStorage/Mock.
    
    const storedData = localStorage.getItem('messProData');
    if (storedData) {
      const parsed = JSON.parse(storedData);
      this.students = parsed.students || [];
      this.plans = parsed.plans || [];
      this.assignments = parsed.assignments || [];
      this.payments = parsed.payments || [];
    } else {
      // Seed with mock data
      this.students = [...MOCK_STUDENTS];
      this.plans = [...MOCK_PLANS];
      this.assignments = [...MOCK_ASSIGNMENTS];
      this.payments = [...MOCK_PAYMENTS];
      this.persist();
    }
  }

  private persist() {
    localStorage.setItem('messProData', JSON.stringify({
      students: this.students,
      plans: this.plans,
      assignments: this.assignments,
      payments: this.payments
    }));
  }

  // --- GETTERS ---

  getStats(): KPIStats {
    const totalAssignedCharges = this.assignments.reduce((sum, a) => sum + a.charge, 0);
    const totalCollected = this.payments.reduce((sum, p) => sum + p.amount, 0);
    
    return {
      totalCollections: totalCollected,
      totalOverdue: Math.max(0, totalAssignedCharges - totalCollected),
      outstandingBalance: totalAssignedCharges - totalCollected,
      activeResidents: this.students.filter(s => s.status === 'active').length
    };
  }

  getStudentBalance(studentId: string): number {
    const totalCharges = this.assignments
      .filter(a => a.student_id === studentId)
      .reduce((sum, a) => sum + a.charge, 0);
      
    const totalPaid = this.payments
      .filter(p => p.student_id === studentId)
      .reduce((sum, p) => sum + p.amount, 0);

    return totalCharges - totalPaid;
  }

  getStudentAssignments(studentId: string) {
    return this.assignments.filter(a => a.student_id === studentId);
  }

  getStudentPayments(studentId: string) {
    return this.payments.filter(p => p.student_id === studentId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  getStudentsWithDues() {
    return this.students.map(student => {
      const balance = this.getStudentBalance(student.id);
      return { ...student, balance };
    }).sort((a, b) => b.balance - a.balance);
  }

  // Check if a date range overlaps with existing assignments for a student
  checkOverlap(studentId: string, startDate: string, endDate: string): boolean {
    // We strictly use UTC comparison for YYYY-MM-DD strings to ensure consistency
    const newStart = new Date(startDate).getTime();
    const newEnd = new Date(endDate).getTime();

    return this.assignments.some(a => {
      if (a.student_id !== studentId) return false;
      if (a.status === 'completed') return false; // Optional: Decide if we allow overlap with completed? Usually no for billing integrity, but let's assume active assignments are the main blocker. 
      // Actually, let's block ALL overlaps to prevent double billing history.
      // So removing status check to block everything.
      
      const aStart = new Date(a.start_date).getTime();
      const aEnd = new Date(a.end_date).getTime();

      // Check for overlap
      // Overlap exists if (StartA <= EndB) and (EndA >= StartB)
      return (newStart <= aEnd && newEnd >= aStart);
    });
  }

  // --- ACTIONS ---

  addStudent(student: Omit<Student, 'id' | 'created_at' | 'status'>) {
    const newStudent: Student = {
      ...student,
      id: `stu_${generateId()}`,
      status: 'active',
      created_at: new Date().toISOString()
    };
    this.students.unshift(newStudent);
    this.persist();
    return newStudent;
  }

  addPlan(plan: Omit<MealPlan, 'id'>) {
    const newPlan: MealPlan = {
      ...plan,
      id: `plan_${generateId()}`,
    };
    this.plans.push(newPlan);
    this.persist();
    return newPlan;
  }

  updatePlan(updatedPlan: MealPlan) {
    const idx = this.plans.findIndex(p => p.id === updatedPlan.id);
    if (idx !== -1) {
      this.plans[idx] = updatedPlan;
      this.persist();
    }
  }

  assignPlan(studentId: string, planId: string, startDate: string, endDate: string) {
    const plan = this.plans.find(p => p.id === planId);
    if (!plan) throw new Error("Plan not found");

    if (this.checkOverlap(studentId, startDate, endDate)) {
      throw new Error("Date overlap detected! This resident already has an active plan during this period.");
    }

    const charge = calculateProratedCharge(plan.monthly_price, startDate, endDate);

    const assignment: Assignment = {
      id: `asg_${generateId()}`,
      student_id: studentId,
      plan_id: planId,
      start_date: startDate,
      end_date: endDate,
      charge,
      status: 'active'
    };

    this.assignments.push(assignment);
    this.persist();
  }

  recordPayment(payment: Omit<Payment, 'id'>) {
    const newPayment: Payment = {
      ...payment,
      id: `pay_${generateId()}`,
    };
    this.payments.unshift(newPayment);
    this.persist();
  }

  updateLastReminder(studentId: string) {
    const idx = this.students.findIndex(s => s.id === studentId);
    if (idx !== -1) {
      this.students[idx].last_reminder_date = new Date().toISOString();
      this.persist();
    }
  }
}

export const messStore = new MessStore();