import { RazorpayOptions, RazorpayResponse } from '../types.ts';

// Helper to load script if it's not in index.html (Safety fallback)
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

interface PaymentParams {
  amount: number; // in Rupees
  studentName: string;
  studentPhone: string;
  description: string;
  onSuccess: (response: RazorpayResponse) => void;
  onFailure: (error: any) => void;
}

export const initiatePayment = async ({
  amount,
  studentName,
  studentPhone,
  description,
  onSuccess,
  onFailure
}: PaymentParams) => {
  const isLoaded = await loadRazorpayScript();

  if (!isLoaded) {
    onFailure({ message: 'Razorpay SDK failed to load. Please check your internet connection.' });
    return;
  }

  // SAFETY: Use Environment Variable for the key
  // Casting import.meta to any to prevent TS errors in some Vite setups without explicit env types
  const RAZORPAY_KEY = (import.meta as any).env.VITE_RAZORPAY_KEY_ID || "rzp_test_1234567890";

  const options: RazorpayOptions = {
    key: RAZORPAY_KEY,
    amount: Math.round(amount * 100), // Convert INR to Paise. Math.round handles floating point errors.
    currency: "INR",
    name: "MessPro Hostel",
    description: description,
    image: "https://ui-avatars.com/api/?name=Mess+Pro&background=4f46e5&color=fff",
    
    // In a REAL production app with a Backend:
    // 1. You would call an API endpoint to create an Order (orders api)
    // 2. Pass 'order_id' here in options.
    // 3. The handler would send the payment_id and signature to your backend for verification.
    
    handler: function (response: RazorpayResponse) {
      // SAFETY CHECK: In a real app, verify signature here via backend API
      // const isValid = await verifySignature(response);
      console.log("Payment ID:", response.razorpay_payment_id);
      onSuccess(response);
    },
    prefill: {
      name: studentName,
      contact: studentPhone
    },
    theme: {
      color: "#4f46e5"
    },
    modal: {
      ondismiss: function() {
        onFailure({ message: "Payment cancelled by user." });
      }
    }
  };

  try {
    const RazorpayConstructor = (window as any).Razorpay;
    const paymentObject = new RazorpayConstructor(options);
    paymentObject.on('payment.failed', function (response: any) {
        onFailure(response.error);
    });
    paymentObject.open();
  } catch (err) {
    onFailure({ message: "Failed to initialize payment gateway." });
  }
};