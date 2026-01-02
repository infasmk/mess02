import React, { useState, useEffect } from 'react';
import { UserRole } from '../types.ts';
import { Button, Input } from '../components/UI.tsx';
import { messStore } from '../store/messStore.ts';
import { supabase } from '../services/supabaseClient.ts';
import { Loader2, Wifi, WifiOff, Database, Lock, UserCircle } from 'lucide-react';

interface LoginProps {
  onLogin: (role: UserRole, id: string, name: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  // CHANGED: Default to ADMIN
  const [role, setRole] = useState<UserRole>(UserRole.ADMIN);
  const [identifier, setIdentifier] = useState(''); // Email or Phone
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'offline'>('checking');

  // Pre-load data on mount to minimize waiting time and check connection
  useEffect(() => {
    const checkDb = async () => {
      try {
        await messStore.init();
      } catch (e) {
        // Init errors are handled internally in store, but we catch here just in case
        console.warn("Store init check failed", e);
      }
      setDbStatus(messStore.isSupabaseConfigured ? 'connected' : 'offline');
    };
    checkDb();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
        // CRITICAL: Wait for initialization to complete to know if we are online/offline
        // This prevents "Failed to fetch" errors if user clicks login before connection check finishes
        if (messStore.isLoading) {
            await messStore.init();
        }

        // Update status in case it changed during init
        setDbStatus(messStore.isSupabaseConfigured ? 'connected' : 'offline');

        if (role === UserRole.ADMIN) {
            // 1. Check Hardcoded Demo Credentials
            if (identifier === 'admin@messpro.com' && password === 'admin') {
                onLogin(UserRole.ADMIN, 'admin', 'Mess Administrator');
                window.location.hash = '/';
                return;
            }

            // 2. Check Supabase (if connected)
            if (messStore.isSupabaseConfigured) {
                // A. Try Standard Supabase Auth (Users)
                try {
                    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                        email: identifier,
                        password: password
                    });

                    if (!authError && authData.user) {
                        onLogin(UserRole.ADMIN, authData.user.id, authData.user.email || 'Admin');
                        window.location.hash = '/';
                        return;
                    }
                } catch (authErr) {
                    console.warn("Supabase Auth Error:", authErr);
                    // Don't throw here, try the custom table fallback
                }

                // B. Try custom 'admins' table (Fallback for manually inserted rows)
                try {
                    const { data: tableData, error: tableError } = await supabase
                        .from('admins')
                        .select('*')
                        .eq('email', identifier)
                        .maybeSingle();

                    // Note: This checks strictly if you added a column 'password' with plain text.
                    if (!tableError && tableData && tableData.password === password) {
                         onLogin(UserRole.ADMIN, tableData.id.toString(), tableData.name || 'Admin');
                         window.location.hash = '/';
                         return;
                    }
                } catch (err) {
                    console.warn("Custom Admin Table Error:", err);
                    // Ignore errors if table doesn't exist or fetch failed
                }
            }

            setError('Invalid Email or Password.');
        } else {
            // Student Login Logic
            if (messStore.isLoading) await messStore.init();

            // Sanitize input (remove spaces, match string types)
            const cleanPhone = identifier.trim();
            const student = messStore.students.find(s => String(s.phone).trim() === cleanPhone);

            if (student) {
                onLogin(UserRole.STUDENT, student.id, student.name);
                window.location.hash = '/';
            } else {
                if (messStore.students.length === 0 && messStore.isSupabaseConfigured) {
                     setError('Registry is empty. Please ask Admin to add students via dashboard.');
                } else if (messStore.students.length === 0) {
                     setError('Demo mode active but no data seeded. Try reloading.');
                } else {
                     setError(`Phone number "${cleanPhone}" not found.`);
                }
            }
        }
    } catch (err) {
        console.error(err);
        setError("An unexpected error occurred. Please try again.");
    } finally {
        setIsLoading(false);
    }
  };

  const toggleRole = () => {
      setRole(prev => prev === UserRole.ADMIN ? UserRole.STUDENT : UserRole.ADMIN);
      setError('');
      setIdentifier('');
      setPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-3xl"></div>
         <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Connection Status Indicator */}
      <div className={`absolute top-6 right-6 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm transition-all z-20 ${
           dbStatus === 'checking' ? 'bg-white text-slate-500 border-slate-200' :
           dbStatus === 'connected' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
           'bg-amber-50 text-amber-700 border-amber-200'
       }`}>
           {dbStatus === 'checking' && <Loader2 size={12} className="animate-spin" />}
           {dbStatus === 'connected' && <Wifi size={14} />}
           {dbStatus === 'offline' && <WifiOff size={14} />}
           <span>
               {dbStatus === 'checking' ? 'Connecting...' :
                dbStatus === 'connected' ? 'System Online' :
                'Demo Mode'}
           </span>
       </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
           <div className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-xl transform rotate-3 hover:rotate-6 transition-all duration-500 ${
               role === UserRole.ADMIN ? 'bg-gradient-to-br from-slate-700 to-slate-900 shadow-slate-300' : 'bg-gradient-to-br from-indigo-600 to-indigo-700 shadow-indigo-300'
           }`}>
            {role === UserRole.ADMIN ? <Lock className="text-white" size={32} /> : <span className="text-white text-4xl font-bold">M</span>}
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              {role === UserRole.ADMIN ? 'Admin Console' : 'Welcome Back'}
          </h1>
          <p className="text-slate-500 font-medium mt-2">
              {role === UserRole.ADMIN ? 'Secure access for management.' : 'Sign in to manage your meals.'}
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100">
          
          {/* Offline Warning Banner inside card */}
          {dbStatus === 'offline' && (
             <div className="mb-6 bg-amber-50 border border-amber-100 p-3 rounded-xl flex items-start gap-3 animate-fade-in">
                 <div className="bg-amber-100 p-1.5 rounded-lg text-amber-600 shrink-0">
                    <Database size={16} />
                 </div>
                 <div className="text-xs text-amber-800 leading-relaxed">
                     <span className="font-bold block text-amber-900 mb-0.5">Database Unreachable</span>
                     Running in local demo mode. Changes are saved to browser storage only.
                 </div>
             </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label={role === UserRole.ADMIN ? "Admin Email" : "Registered Phone Number"}
              type={role === UserRole.ADMIN ? "email" : "tel"}
              placeholder={role === UserRole.ADMIN ? "admin@messpro.com" : "10-digit mobile number"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoFocus
            />
            
            {role === UserRole.ADMIN && (
              <Input
                label="Password"
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            )}

            {error && (
              <div className="text-rose-600 text-sm bg-rose-50 p-3 rounded-xl border border-rose-100 flex items-center font-medium">
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full mr-2"></span>
                {error}
              </div>
            )}

            <Button type="submit" className={`w-full text-base py-3 ${role === UserRole.ADMIN ? 'bg-slate-800 hover:bg-slate-900 shadow-slate-200' : ''}`} disabled={isLoading}>
              {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                      <Loader2 size={20} className="animate-spin" />
                      <span>Verifying...</span>
                  </div>
              ) : (
                  role === UserRole.ADMIN ? 'Authenticate' : 'Access Portal'
              )}
            </Button>
          </form>

          {/* Discreet Role Switcher */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
             {role === UserRole.ADMIN ? (
                 <button 
                    onClick={toggleRole}
                    className="text-xs font-medium text-slate-300 hover:text-indigo-600 transition-colors"
                 >
                    User Access
                 </button>
             ) : (
                 <button 
                    onClick={toggleRole}
                    className="flex items-center justify-center gap-2 mx-auto text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                 >
                    <Lock size={16} />
                    Back to Admin Login
                 </button>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;