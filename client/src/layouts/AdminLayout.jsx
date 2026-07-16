import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  Database, 
  TrendingUp,
  LogOut,
  ShieldAlert,
  Menu,
  X,
  CheckSquare,
  FileText,
  FileSearch,
  BookOpen,
  Award
} from 'lucide-react';
import { useState } from 'react';
import ReportWarningBanner from '../components/ReportWarningBanner';
import MotivationalBanner from '../components/MotivationalBanner';
import ProfileModal from '../components/ProfileModal';



export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);


  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/users', icon: Users, label: 'Xodimlar' },
    { to: '/admin/tasks', icon: CheckSquare, label: 'Vazifalar' },
    { to: '/admin/courses', icon: BookOpen, label: 'Onlayn Kurslar' },
    { to: '/admin/students', icon: Users, label: 'Talabalar Nazorati' },
    { to: '/admin/leaderboard', icon: Award, label: 'Reyting' },
    { to: '/admin/kpi', icon: TrendingUp, label: 'KPI & Hisobot' },
    { to: '/admin/all-reports', icon: FileSearch, label: 'Barcha Hisobotlar' },
    { to: '/admin/reports', icon: FileText, label: 'Mening Hisobotim' },
    { to: '/admin/database', icon: Database, label: 'Lidlar Bazasi' },
    { to: '/admin/settings', icon: Settings, label: 'Sozlamalar' },
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

      {/* Sidebar / Mobile Menu */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-50 h-screen w-64 border-r border-dark-800 bg-dark-900 glass flex flex-col transition-transform duration-300 md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center px-6 border-b border-dark-800 justify-between">
          <div className="flex items-center gap-2 text-primary-400">
            <ShieldAlert className="w-6 h-6" />
            <span className="font-bold text-lg text-white tracking-tight">CRM Admin</span>
          </div>
          <button className="md:hidden p-2 text-dark-400" onClick={() => setIsMobileMenuOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
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
            <div className="w-10 h-10 rounded-full bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-primary-400 font-bold shrink-0 overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} className="w-full h-full object-cover" alt="" />
              ) : (
                user?.name?.charAt(0) || 'A'
              )}
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
           <span className="font-bold text-white flex-1">CRM Admin</span>
           <button onClick={handleLogout} className="p-2 text-dark-400 hover:text-red-400">
             <LogOut className="w-5 h-5" />
           </button>
        </header>

        <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 lg:p-8">
          <MotivationalBanner />
          <ReportWarningBanner />
          <Outlet />
        </div>
      </main>
      {isProfileOpen && <ProfileModal onClose={() => setIsProfileOpen(false)} />}
    </div>
  );
}
