
import { Student, MealPlan, Assignment, Payment, KPIStats, ActivityLog } from '../types.ts';
import { generateId, calculateProratedCharge, getDerivedStatus } from '../utils/helpers.ts';
import { supabase } from '../services/supabaseClient.ts';

class MessStore {
  students: Student[] = [];
  plans: MealPlan[] = [];
  assignments: Assignment[] = [];
  payments: Payment[] = [];
  isSupabaseConfigured = true;
  isLoading = true;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.init();
  }

  async init(force = false) {
    // Return existing promise if already loading to prevent race conditions, unless forced
    if (!force && this.isLoading && this.initPromise) return this.initPromise;

    this.isLoading = true;
    
    this.initPromise = (async () => {
        try {
            await this.loadFromSupabase();
        } catch (error) {
            console.warn("Supabase connection failed/offline. Switching to Demo/Local mode.", error);
            this.isSupabaseConfigured = false;
            this.loadFromLocal();
        } finally {
            this.isLoading = false;
        }
    })();

    return this.initPromise;
  }

  async loadFromSupabase() {
    const [studentsRes, plansRes, assignmentsRes, paymentsRes] = await Promise.all([
      supabase.from('students').select('*').order('created_at', { ascending: false }),
      supabase.from('plans').select('*'),
      supabase.from('assignments').select('*'),
      supabase.from('payments').select('*').order('date', { ascending: false })
    ]);

    if (studentsRes.error) throw studentsRes.error;
    if (plansRes.error) throw plansRes.error;
    if (assignmentsRes.error) throw assignmentsRes.error;
    if (paymentsRes.error) throw paymentsRes.error;

    // Convert phone to string to ensure type safety across app
    this.students = (studentsRes.data || []).map(s => ({...s, phone: String(s.phone)}));
    this.plans = plansRes.data || [];
    this.assignments = assignmentsRes.data || [];
    // Ensure status exists (backward compatibility)
    this.payments = (paymentsRes.data || []).map(p => ({
        ...p,
        status: p.status || 'verified'
    }));
  }

  private loadFromLocal() {
    const storedData = localStorage.getItem('messProData');
    if (storedData) {
      const parsed = JSON.parse(storedData);
      this.students = parsed.students || [];
      this.plans = parsed.plans || [];
      this.assignments = parsed.assignments || [];
      this.payments = (parsed.payments || []).map((p: any) => ({
          ...p,
          status: p.status || 'verified'
      }));
    }
    
    // If no data exists (first run without Supabase), seed with Demo Data
    if (this.students.length === 0) {
        this.seedDemoData();
    }
  }

  private seedDemoData() {
      console.log("Seeding Demo Data...");
      this.students = [
          { id: 'demo_1', name: 'Rahul Sharma', phone: '9876543210', room: '101-A', status: 'active', created_at: new Date().toISOString() },
          { id: 'demo_2', name: 'Priya Verma', phone: '9876543211', room: '102-B', status: 'active', created_at: new Date().toISOString() },
          { id: 'demo_3', name: 'Amit Kumar', phone: '9000000000', room: '205-C', status: 'active', created_at: new Date().toISOString() }
      ];
      
      this.plans = [
          { id: 'plan_1', name: 'Full Mess (3 Meals)', monthly_price: 4500, meals: ['Breakfast', 'Lunch', 'Dinner'] },
          { id: 'plan_2', name: 'Dinner Only', monthly_price: 2000, meals: ['Dinner'] }
      ];

      this.assignments = [
          { id: 'asg_1', student_id: 'demo_1', plan_id: 'plan_1', start_date: '2023-11-01', end_date: '2023-11-30', charge: 4500, status: 'active' }
      ];
      
      // Persist this demo data so it survives refresh in local mode
      this.persistLocal();
  }

  private persistLocal() {
    if (!this.isSupabaseConfigured) {
      localStorage.setItem('messProData', JSON.stringify({
        students: this.students,
        plans: this.plans,
        assignments: this.assignments,
        payments: this.payments
      }));
    }
  }

  // --- GETTERS ---

  getStats(): KPIStats {
    const totalAssignedCharges = this.assignments.reduce((sum, a) => sum + Number(a.charge), 0);
    // Only count VERIFIED payments in collections
    const totalCollected = this.payments
        .filter(p => p.status === 'verified')
        .reduce((sum, p) => sum + Number(p.amount), 0);
    
    // Filter for actual overdue (Expired plan with balance)
    const overdueList = this.getStudentsWithDues().filter(s => {
       const activeAssignment = this.assignments.find(a => a.student_id === s.id && a.status === 'active');
       const status = getDerivedStatus(activeAssignment, s.balance);
       return status.isOverdue;
    });

    const totalOverdueAmount = overdueList.reduce((sum, s) => sum + s.balance, 0);
    
    return {
      totalCollections: totalCollected,
      totalOverdue: totalOverdueAmount,
      outstandingBalance: totalAssignedCharges - totalCollected,
      activeResidents: this.students.filter(s => s.status === 'active').length
    };
  }

  getStudentBalance(studentId: string): number {
    const totalCharges = this.assignments
      .filter(a => a.student_id === studentId)
      .reduce((sum, a) => sum + Number(a.charge), 0);
      
    // Only Verified payments count towards reducing balance
    const totalPaid = this.payments
      .filter(p => p.student_id === studentId && p.status === 'verified')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return totalCharges - totalPaid;
  }

  getStudentAssignments(studentId: string) {
    return this.assignments.filter(a => a.student_id === studentId);
  }

  getStudentPayments(studentId: string) {
    return this.payments.filter(p => p.student_id === studentId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  getPendingPayments() {
      return this.payments
        .filter(p => p.status === 'pending')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  getStudentsWithDues() {
    return this.students.map(student => {
      const balance = this.getStudentBalance(student.id);
      return { ...student, balance };
    }).sort((a, b) => b.balance - a.balance);
  }

  getActiveAssignment(studentId: string) {
    return this.assignments.find(a => a.student_id === studentId && a.status === 'active');
  }

  getRecentActivity(): ActivityLog[] {
    const activities: ActivityLog[] = [];

    // Add Payments
    this.payments.forEach(p => {
        const student = this.students.find(s => s.id === p.student_id);
        if (p.status === 'verified') {
            activities.push({
                id: p.id,
                type: 'payment',
                title: `Payment Received`,
                description: `${student?.name || 'Unknown'} paid via ${p.mode}`,
                amount: p.amount,
                date: p.date
            });
        }
    });

    // Add Registrations
    this.students.forEach(s => {
        activities.push({
            id: `reg_${s.id}`,
            type: 'registration',
            title: 'New Resident',
            description: `${s.name} added to Room ${s.room}`,
            date: s.created_at
        });
    });

    // Sort by Date Descending
    return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
  }

  checkOverlap(studentId: string, startDate: string, endDate: string): boolean {
    const newStart = new Date(startDate).getTime();
    const newEnd = new Date(endDate).getTime();

    return this.assignments.some(a => {
      if (a.student_id !== studentId) return false;
      if (a.status === 'completed') return false; 
      
      const aStart = new Date(a.start_date).getTime();
      const aEnd = new Date(a.end_date).getTime();

      return (newStart <= aEnd && newEnd >= aStart);
    });
  }

  // --- ASYNC ACTIONS ---

  async addStudent(student: Omit<Student, 'id' | 'created_at' | 'status'>) {
    // Ensure phone is stored as string
    const phoneStr = String(student.phone);
    if (this.isSupabaseConfigured) {
      const { data, error } = await supabase.from('students').insert([{
        name: student.name,
        phone: phoneStr,
        room: student.room,
        status: 'active',
        created_at: new Date().toISOString()
      }]).select().single();

      if (error) throw error;
      this.students.unshift(data);
    } else {
      const newStudent: Student = {
        ...student,
        phone: phoneStr,
        id: `stu_${generateId()}`,
        status: 'active',
        created_at: new Date().toISOString()
      };
      this.students.unshift(newStudent);
      this.persistLocal();
    }
  }

  async deleteStudent(studentId: string) {
    const balance = this.getStudentBalance(studentId);
    if (balance > 0) {
      throw new Error(`Cannot delete resident. They have pending dues of ₹${balance}. Please clear the dues first.`);
    }

    if (this.isSupabaseConfigured) {
      const { error } = await supabase.from('students').delete().eq('id', studentId);
      if (error) throw error;
      
      // Update local cache
      this.students = this.students.filter(s => s.id !== studentId);
      this.assignments = this.assignments.filter(a => a.student_id !== studentId);
    } else {
      this.students = this.students.filter(s => s.id !== studentId);
      this.assignments = this.assignments.filter(a => a.student_id !== studentId);
      this.persistLocal();
    }
  }

  async addPlan(plan: Omit<MealPlan, 'id'>) {
    if (this.isSupabaseConfigured) {
      const { data, error } = await supabase.from('plans').insert([{
        name: plan.name,
        monthly_price: plan.monthly_price,
        meals: plan.meals
      }]).select().single();
      
      if (error) throw error;
      this.plans.push(data);
    } else {
      const newPlan: MealPlan = { ...plan, id: `plan_${generateId()}` };
      this.plans.push(newPlan);
      this.persistLocal();
    }
  }

  async updatePlan(updatedPlan: MealPlan) {
    if (this.isSupabaseConfigured) {
      const { error } = await supabase.from('plans').update({
        name: updatedPlan.name,
        monthly_price: updatedPlan.monthly_price,
        meals: updatedPlan.meals
      }).eq('id', updatedPlan.id);

      if (error) throw error;
      
      const idx = this.plans.findIndex(p => p.id === updatedPlan.id);
      if (idx !== -1) this.plans[idx] = updatedPlan;
    } else {
      const idx = this.plans.findIndex(p => p.id === updatedPlan.id);
      if (idx !== -1) {
        this.plans[idx] = updatedPlan;
        this.persistLocal();
      }
    }
  }

  async assignPlan(studentId: string, planId: string, startDate: string, endDate: string) {
    const plan = this.plans.find(p => p.id === planId);
    if (!plan) throw new Error("Plan not found");

    if (this.checkOverlap(studentId, startDate, endDate)) {
      throw new Error("Date overlap detected! This resident already has an active plan during this period.");
    }

    const charge = calculateProratedCharge(plan.monthly_price, startDate, endDate);

    if (this.isSupabaseConfigured) {
      const { data, error } = await supabase.from('assignments').insert([{
        student_id: studentId,
        plan_id: planId,
        start_date: startDate,
        end_date: endDate,
        charge,
        status: 'active'
      }]).select().single();

      if (error) throw error;
      this.assignments.push(data);
    } else {
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
      this.persistLocal();
    }
  }

  async recordPayment(payment: Omit<Payment, 'id'>) {
    // Default to verified if not specified (for admin actions), but respect provided status (for student actions)
    const paymentStatus = payment.status || 'verified';
    
    // Check for duplicate transaction ID locally first (faster feedback)
    if (payment.transaction_id) {
        const isDuplicate = this.payments.some(p => p.transaction_id === payment.transaction_id);
        if (isDuplicate) {
            throw new Error(`Transaction ID '${payment.transaction_id}' has already been submitted.`);
        }
    }

    if (this.isSupabaseConfigured) {
      // Secondary check against Database for duplicates to avoid constraint error crashing the UI
      if (payment.transaction_id) {
          const { data: existing } = await supabase
              .from('payments')
              .select('id')
              .eq('transaction_id', payment.transaction_id)
              .maybeSingle();
          
          if (existing) {
              throw new Error(`Transaction ID '${payment.transaction_id}' already exists in the system.`);
          }
      }

      const { data, error } = await supabase.from('payments').insert([{
        student_id: payment.student_id,
        amount: payment.amount,
        date: payment.date,
        mode: payment.mode,
        transaction_id: payment.transaction_id,
        status: paymentStatus
      }]).select().single();

      if (error) {
        // Explicitly check for column missing error which happens when schema is outdated
        if (error.message && (error.message.includes('status') || error.message.includes('column'))) {
            throw new Error("Database Error: The 'status' column is missing in 'payments' table. Please ask Admin to run the update SQL.");
        }
        // Check for unique constraint violation (code 23505 in Postgres)
        if (error.code === '23505') {
            throw new Error("This Transaction ID has already been used.");
        }
        throw error;
      }
      this.payments.unshift(data);
    } else {
      const newPayment: Payment = { ...payment, status: paymentStatus, id: `pay_${generateId()}` };
      this.payments.unshift(newPayment);
      this.persistLocal();
    }
  }

  async verifyPayment(paymentId: string) {
      if (this.isSupabaseConfigured) {
          const { error } = await supabase.from('payments').update({ status: 'verified' }).eq('id', paymentId);
          if (error) throw error;
      }
      
      const idx = this.payments.findIndex(p => p.id === paymentId);
      if (idx !== -1) {
          this.payments[idx].status = 'verified';
          if (!this.isSupabaseConfigured) this.persistLocal();
      }
  }

  async rejectPayment(paymentId: string) {
      if (this.isSupabaseConfigured) {
          const { error } = await supabase.from('payments').delete().eq('id', paymentId);
          if (error) throw error;
      }
      this.payments = this.payments.filter(p => p.id !== paymentId);
      if (!this.isSupabaseConfigured) this.persistLocal();
  }

  async updateLastReminder(studentId: string) {
    const now = new Date().toISOString();
    if (this.isSupabaseConfigured) {
      await supabase.from('students').update({ last_reminder_date: now }).eq('id', studentId);
      const idx = this.students.findIndex(s => s.id === studentId);
      if (idx !== -1) this.students[idx].last_reminder_date = now;
    } else {
      const idx = this.students.findIndex(s => s.id === studentId);
      if (idx !== -1) {
        this.students[idx].last_reminder_date = now;
        this.persistLocal();
      }
    }
  }
}

export const messStore = new MessStore();
