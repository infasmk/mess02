import React, { useState } from 'react';
import { UserRole } from '../types.ts';
import { Button, Input, Card } from '../components/UI.tsx';
import { messStore } from '../store/messStore.ts';
import { useNavigate } from 'react-router-dom';

interface LoginProps {
  onLogin: (role: UserRole, id: string, name: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [role, setRole] = useState<UserRole>(UserRole.ADMIN);
  const [identifier, setIdentifier] = useState(''); // Email or Phone
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (role === UserRole.ADMIN) {
      if (identifier === 'admin@messpro.com' && password === 'admin') {
        onLogin(UserRole.ADMIN, 'admin', 'Mess Administrator');
        navigate('/');
      } else {
        setError('Invalid Admin Credentials (Try: admin@messpro.com / admin)');
      }
    } else {
      // Student Login - By Phone
      const student = messStore.students.find(s => s.phone === identifier);
      if (student) {
        onLogin(UserRole.STUDENT, student.id, student.name);
        navigate('/');
      } else {
        setError('Phone number not found in registry.');
      }
    }
  };

  const handleQuickAdminLogin = () => {
    onLogin(UserRole.ADMIN, 'admin', 'Mess Administrator');
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-3xl"></div>
         <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
           <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-xl shadow-indigo-300 transform rotate-3 hover:rotate-6 transition-transform">
            <span className="text-white text-4xl font-bold">M</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome Back</h1>
          <p className="text-slate-500 font-medium mt-2">Sign in to manage your mess.</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100">
          <div className="flex p-1 bg-slate-50 rounded-xl mb-8 border border-slate-100">
            <button
              onClick={() => setRole(UserRole.ADMIN)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                role === UserRole.ADMIN ? 'bg-white shadow-sm text-indigo-700 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => setRole(UserRole.STUDENT)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                role === UserRole.STUDENT ? 'bg-white shadow-sm text-indigo-700 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Student
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label={role === UserRole.ADMIN ? "Email Address" : "Registered Phone"}
              type={role === UserRole.ADMIN ? "email" : "tel"}
              placeholder={role === UserRole.ADMIN ? "admin@messpro.com" : "9876543210"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
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

            <Button type="submit" className="w-full text-base py-3">
              {role === UserRole.ADMIN ? 'Sign In' : 'Access Portal'}
            </Button>
          </form>

          {role === UserRole.ADMIN && (
            <div className="mt-8">
               <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-100"></div>
                  <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-semibold uppercase tracking-wider">Test Account</span>
                  <div className="flex-grow border-t border-slate-100"></div>
               </div>
               <Button 
                 type="button" 
                 variant="secondary" 
                 className="w-full text-xs py-2.5 mt-2 border-dashed" 
                 onClick={handleQuickAdminLogin}
               >
                 ⚡ Quick Demo Login
               </Button>
            </div>
          )}
          {role === UserRole.STUDENT && (
             <p className="text-xs text-center text-slate-400 mt-6 bg-slate-50 py-2 rounded-lg border border-slate-100">Demo Phone: <span className="font-mono font-semibold text-slate-600">9876543210</span></p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;