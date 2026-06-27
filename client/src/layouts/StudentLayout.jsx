import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  GraduationCap, 
  LogOut,
  Menu,
  X,
  Award,
  BookOpen
} from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../lib/api';
import MotivationalBanner from '../components/MotivationalBanner';
import ProfileModal from '../components/ProfileModal';



export default function StudentLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [coinBalance, setCoinBalance] = useState(0);
  const [isProfileOpen, setIsProfileOpen] = useState(false);


  useEffect(() => {
    fetchCoinBalance();
  }, []);

  const fetchCoinBalance = async () => {
    try {
      const res = await api.get('/lms/coins/balance');
      setCoinBalance(res.data.balance || 0);
    } catch (err) {
      console.error('Error fetching coins:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/student', icon: BookOpen, label: 'Mening Kurslarim' }
  ];

  return (
    <div className="min-h-screen flex bg-dark-950">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-50 h-screen w-64 border-r border-dark-800 bg-dark-900 glass flex flex-col transition-transform duration-300 md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center px-6 border-b border-dark-800 justify-between">
          <div className="flex items-center gap-2 text-primary-400">
            <GraduationCap className="w-6 h-6" />
            <span className="font-bold text-lg text-white tracking-tight">Kasbtech Akademiya</span>
          </div>
          <button className="md:hidden p-2 text-dark-400" onClick={() => setIsMobileMenuOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Gamification Coins Showcase */}
        <div className="p-4 mx-3 my-4 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center animate-bounce">
              <span className="text-yellow-400 text-sm font-bold">🪙</span>
            </div>
            <div>
              <p className="text-[10px] uppercase text-yellow-400/70 font-semibold tracking-wider">Mening Koinlarim</p>
              <p className="text-base font-bold text-white">{coinBalance} KasbCoin</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-primary-600/10 text-primary-400 font-medium' 
                    : 'text-dark-400 hover:text-white hover:bg-dark-800/50'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="p-4 border-t border-dark-800">
          <div 
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-3 mb-4 p-2 rounded-xl bg-dark-800/30 hover:bg-dark-800/80 border border-transparent hover:border-dark-700/60 cursor-pointer transition-all duration-200"
            title="Profil sozlamalari"
          >
            <div className="w-10 h-10 rounded-full bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-primary-400 font-bold shrink-0">
              {user?.name?.charAt(0) || 'S'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-dark-400 truncate">{user?.email}</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Tizimdan chiqish</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="h-16 border-b border-dark-800 bg-dark-900/50 glass flex items-center px-4 md:hidden sticky top-0 z-40">
           <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-dark-400 mr-2">
             <Menu className="w-6 h-6" />
           </button>
           <span className="font-bold text-white flex-1">Student Portal</span>
           
           {/* Mini coin balance on mobile */}
           <div className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full mr-2">
             <span className="text-xs">🪙</span>
             <span className="text-xs font-bold text-yellow-400">{coinBalance}</span>
           </div>

           <button onClick={handleLogout} className="p-2 text-dark-400 hover:text-red-400">
             <LogOut className="w-5 h-5" />
           </button>
        </header>

        <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 lg:p-8">
          <MotivationalBanner />
          <Outlet context={{ fetchCoinBalance }} />
        </div>
      </main>
      {isProfileOpen && <ProfileModal onClose={() => setIsProfileOpen(false)} />}
    </div>
  );
}
