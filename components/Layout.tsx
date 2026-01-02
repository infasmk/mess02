import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Users, CreditCard, LogOut, UserCircle, Utensils, ChevronRight, Download } from 'lucide-react';
import { CurrentUser, UserRole } from '../types.ts';

interface LayoutProps {
  children: React.ReactNode;
  user: CurrentUser | null;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  // Derive current path from window location hash for active state
  const currentPath = window.location.hash.replace(/^#/, '') || '/';
  
  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  if (!user) {
    return <>{children}</>;
  }

  const isAdmin = user.role === UserRole.ADMIN;

  const adminLinks = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Residents', path: '/residents', icon: Users },
    { name: 'Meal Plans', path: '/plans', icon: Utensils },
  ];

  const studentLinks = [
    { name: 'My Portal', path: '/', icon: UserCircle },
    { name: 'History', path: '/history', icon: CreditCard },
  ];

  const links = isAdmin ? adminLinks : studentLinks;

  const isActive = (path: string) => currentPath === path;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50/50 font-sans text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 flex-col bg-white border-r border-slate-200/60 fixed h-full z-10 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
        <div className="p-6 flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <span className="text-white font-bold text-lg">F</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">Fresh Bites</h1>
            <span className="text-xs font-medium text-slate-400">Hostel Management</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1.5 py-4">
          <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Menu</p>
          {links.map((link) => (
            <a
              key={link.path}
              href={`#${link.path}`}
              className={`group flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive(link.path)
                  ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center space-x-3">
                <link.icon size={20} className={isActive(link.path) ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} />
                <span>{link.name}</span>
              </div>
              {isActive(link.path) && <ChevronRight size={16} className="text-indigo-400" />}
            </a>
          ))}
          
          {/* Install Button Desktop */}
          {showInstallBtn && (
             <button
              onClick={handleInstallClick}
              className="w-full mt-4 flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all"
            >
              <div className="flex items-center space-x-3">
                <Download size={20} className="text-emerald-400" />
                <span className="font-semibold">Install App</span>
              </div>
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-4 mb-3 border border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-sm font-bold text-indigo-600 shadow-sm">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate font-medium">{user.role}</p>
              </div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 w-full text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-sm font-semibold"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 sticky top-0 z-20 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-2">
           <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-200">
            <span className="text-white font-bold">F</span>
          </div>
          <span className="text-lg font-bold text-slate-900">Fresh Bites</span>
        </div>
        
        <div className="flex items-center gap-2">
            {/* Install Button Mobile */}
            {showInstallBtn && (
                <button 
                    onClick={handleInstallClick}
                    className="p-2 text-indigo-600 bg-indigo-50 rounded-full animate-pulse"
                    title="Install App"
                >
                    <Download size={20} />
                </button>
            )}
            <button onClick={onLogout} className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-full">
              <LogOut size={20} />
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 md:ml-72 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto min-h-screen flex flex-col">
        <div className="max-w-6xl mx-auto animate-fade-in space-y-8 flex-1 w-full">
          {children}
        </div>
        
        {/* FOOTER */}
        <div className="mt-8 pt-6 border-t border-slate-200 text-center">
            <p className="text-xs font-medium text-slate-400">
                Created by <span className="text-indigo-600 font-bold">infas.mk</span> <span className="mx-1 opacity-50">||</span> <a href="#" className="hover:text-indigo-600 transition-colors font-semibold">Web ⚡ Bits</a>
            </p>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-2 z-20 safe-area-pb shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {links.map((link) => (
          <a
            key={link.path}
            href={`#${link.path}`}
            className={`flex flex-col items-center p-2 rounded-xl w-16 ${
              isActive(link.path) ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'
            }`}
          >
            <link.icon size={22} />
            <span className="text-[10px] mt-1 font-semibold">{link.name}</span>
          </a>
        ))}
      </nav>
    </div>
  );
};

export default Layout;