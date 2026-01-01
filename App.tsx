import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.tsx';
import Login from './pages/Login.tsx';
import AdminDashboard from './pages/AdminDashboard.tsx';
import Residents from './pages/Residents.tsx';
import Plans from './pages/Plans.tsx';
import StudentPortal from './pages/StudentPortal.tsx';
import { CurrentUser, UserRole } from './types.ts';

const App: React.FC = () => {
  const [user, setUser] = useState<CurrentUser | null>(null);

  // Persistence check for session
  useEffect(() => {
    const session = localStorage.getItem('messProSession');
    if (session) {
      setUser(JSON.parse(session));
    }
  }, []);

  const handleLogin = (role: UserRole, id: string, name: string) => {
    const newUser = { role, id, name };
    setUser(newUser);
    localStorage.setItem('messProSession', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('messProSession');
  };

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={
          !user ? <Login onLogin={handleLogin} /> : <Navigate to="/" replace />
        } />
        
        <Route path="/*" element={
          user ? (
            <Layout user={user} onLogout={handleLogout}>
              <Routes>
                {/* Admin Routes */}
                {user.role === UserRole.ADMIN && (
                  <>
                    <Route path="/" element={<AdminDashboard />} />
                    <Route path="/residents" element={<Residents />} />
                    <Route path="/plans" element={<Plans />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </>
                )}
                
                {/* Student Routes */}
                {user.role === UserRole.STUDENT && (
                  <>
                    <Route path="/" element={<StudentPortal user={user} />} />
                    <Route path="/history" element={<StudentPortal user={user} />} /> {/* Reuse for now */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </>
                )}
              </Routes>
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        } />
      </Routes>
    </HashRouter>
  );
};

export default App;