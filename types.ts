export enum UserRole {
  ADMIN = 'ADMIN',
  STUDENT = 'STUDENT'
}

export interface Student {
  id: string;
  name: string;
  phone: string;
  room: string;
  status: 'active' | 'inactive';
  created_at: string;
  last_reminder_date?: string;
}

export interface MealPlan {
  id: string;
  name: string;
  meals: string[]; // e.g. ['Breakfast', 'Lunch', 'Dinner']
  monthly_price: number;
}

export interface Assignment {
  id: string;
  student_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  charge: number;
  status: 'active' | 'completed';
}

export interface Payment {
  id: string;
  student_id: string;
  amount: number;
  date: string;
  mode: 'online' | 'cash' | 'upi';
  transaction_id?: string;
  notes?: string;
}

export interface KPIStats {
  totalCollections: number;
  totalOverdue: number;
  activeResidents: number;
  outstandingBalance: number;
}

export interface CurrentUser {
  id: string; // 'admin' or student ID
  role: UserRole;
  name: string;
}

export interface ActivityLog {
  id: string;
  type: 'payment' | 'registration' | 'assignment';
  title: string;
  description: string;
  date: string;
  amount?: number;
}

// --- Razorpay Types ---

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id?: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => {
      open: () => void;
      on: (event: string, callback: (response: any) => void) => void;
    };
  }
}