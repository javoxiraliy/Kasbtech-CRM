import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, LogOut, CalendarDays, Bell, User as UserIcon, Menu, X } from 'lucide-react';

export default function OperatorLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/operator', icon: LayoutDashboard, label: 'Ish stoli', end: true },
    { to: '/operator/calendar', icon: CalendarDays, label: 'Taqvim' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-dark-950">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-screen w-64 border-r border-dark-800 bg-dark-900 glass flex flex-col transition-transform duration-300 md:hidden
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center px-6 border-b border-dark-800 justify-between">
          <span className="font-bold text-white">CRM Operator</span>
          <button onClick={() => setIsMobileMenuOpen(false)}>
            <X className="w-6 h-6 text-dark-400" />
          </button>
        </div>
        <div className="flex-1 p-4 space-y-2">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive ? 'bg-primary-600/10 text-primary-400' : 'text-dark-400 hover:text-white hover:bg-dark-800/50'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </div>
        <div className="p-4 border-t border-dark-800">
           <button onClick={handleLogout} className="w-full flex items-center gap-2 text-red-400 p-2">
             <LogOut className="w-5 h-5" /> Chiqish
           </button>
        </div>
      </aside>

      {/* Header */}
      <header className="h-16 border-b border-dark-800 bg-dark-900/50 glass sticky top-0 z-40">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="md:hidden p-2 text-dark-400 mr-1" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <div className="w-8 h-8 rounded-lg bg-primary-600/20 text-primary-500 flex items-center justify-center font-bold">
              C
            </div>
            <span className="font-bold text-white hidden sm:block">CRM Operator</span>
          </div>

          <nav className="flex-1 px-8 hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    isActive ? 'bg-dark-800 text-white' : 'text-dark-400 hover:text-white hover:bg-dark-800/50'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <button className="relative p-2 text-dark-400 hover:text-white transition-colors rounded-lg hover:bg-dark-800">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-dark-900"></span>
            </button>
            
            <div className="h-8 w-px bg-dark-800 mx-2 hidden sm:block" />
            
            <div className="flex items-center gap-3">
              <div className="hidden lg:block text-right">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-dark-400">Operator</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-dark-800 border border-dark-700 flex items-center justify-center text-dark-300">
                <UserIcon className="w-5 h-5" />
              </div>
              <button
                onClick={handleLogout}
                className="hidden sm:flex p-2 text-dark-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10 ml-2"
                title="Tizimdan chiqish"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-dark-950 p-4">
        <Outlet />
      </main>
    </div>
  );
}
