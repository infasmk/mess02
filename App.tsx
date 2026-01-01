import React, { useState, useEffect } from 'react';
import Layout from './components/Layout.tsx';
import Login from './pages/Login.tsx';
import AdminDashboard from './pages/AdminDashboard.tsx';
import Residents from './pages/Residents.tsx';
import Plans from './pages/Plans.tsx';
import StudentPortal from './pages/StudentPortal.tsx';
import { CurrentUser, UserRole } from './types.ts';

const App: React.FC = () => {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [currentPath, setCurrentPath] = useState(window.location.hash.replace(/^#/, '') || '/');

  // Handle Hash Navigation
  useEffect(() => {
    const handleHashChange = () => {
      let path = window.location.hash.replace(/^#/, '');
      if (path === '') path = '/';
      setCurrentPath(path);
    };

    window.addEventListener('hashchange', handleHashChange);
    // Initial check
    if (window.location.hash === '') {
      // Ensure we have a hash if none exists, but respecting current path if it was empty
    }
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Persistence check for session
  useEffect(() => {
    const session = localStorage.getItem('messProSession');
    if (session) {
      setUser(JSON.parse(session));
    }
  }, []);

  // Auth Redirect Logic
  useEffect(() => {
    if (!user) {
      if (currentPath !== '/login') {
        window.location.hash = '/login';
      }
    } else {
      if (currentPath === '/login') {
        window.location.hash = '/';
      }
    }
  }, [user, currentPath]);

  const handleLogin = (role: UserRole, id: string, name: string) => {
    const newUser = { role, id, name };
    setUser(newUser);
    localStorage.setItem('messProSession', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('messProSession');
    window.location.hash = '/login';
  };

  const renderPage = () => {
    if (user?.role === UserRole.ADMIN) {
      switch (currentPath) {
        case '/': return <AdminDashboard />;
        case '/residents': return <Residents />;
        case '/plans': return <Plans />;
        default: return <AdminDashboard />;
      }
    } else if (user?.role === UserRole.STUDENT) {
      switch (currentPath) {
        case '/': return <StudentPortal user={user} />;
        case '/history': return <StudentPortal user={user} />;
        default: return <StudentPortal user={user} />;
      }
    }
    return null;
  };

  if (!user) {
    // Only render login if path matches to avoid flicker during redirect
    return currentPath === '/login' ? <Login onLogin={handleLogin} /> : null;
  }

  return (
    <Layout user={user} onLogout={handleLogout}>
      {renderPage()}
    </Layout>
  );
};

export default App;