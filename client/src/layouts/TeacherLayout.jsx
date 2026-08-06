import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ClipboardList, LogOut, Bell, User as UserIcon, Menu, X, CheckCheck, AlertCircle, FileText, BookOpen, Users, Award } from 'lucide-react';
import api from '../lib/api';
import ReportWarningBanner from '../components/ReportWarningBanner';
import MotivationalBanner from '../components/MotivationalBanner';
import ProfileModal from '../components/ProfileModal';



export default function TeacherLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  
  // Notification states
  const [unreadTasks, setUnreadTasks] = useState([]);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const bellRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const fetchUnreadTasks = async () => {
    try {
      const res = await api.get('/tasks/operator');
      const unread = res.data.tasks.filter(t => !t.isRead);
      setUnreadTasks(unread);
    } catch (error) {
      console.error('Fetch layout notifications error:', error);
    }
  };

  useEffect(() => {
    fetchUnreadTasks();
    
    // Background polling every 10 seconds for real-time notifications
    const pollInterval = setInterval(fetchUnreadTasks, 10000);

    const handleTasksUpdate = () => {
      fetchUnreadTasks();
    };
    window.addEventListener('tasks_updated', handleTasksUpdate);

    // Click outside handler to close dropdown
    const handleClickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setIsBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('tasks_updated', handleTasksUpdate);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNotificationClick = async (task) => {
    try {
      await api.patch(`/tasks/operator/${task.id}/read`);
      fetchUnreadTasks();
      setIsBellOpen(false);
      
      // Dispatch event to refresh tasks list immediately if the page is open
      window.dispatchEvent(new Event('tasks_updated'));
      
      // Redirect to tasks page
      navigate('/teacher');
    } catch (error) {
      console.error('Read task layout error:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadTasks.length === 0) return;
    try {
      await Promise.all(
        unreadTasks.map(t => api.patch(`/tasks/operator/${t.id}/read`))
      );
      fetchUnreadTasks();
      window.dispatchEvent(new Event('tasks_updated'));
    } catch (error) {
      console.error('Mark all read error:', error);
    }
  };

  const navItems = [
    { to: '/teacher', icon: ClipboardList, label: 'Topshiriqlar Markazi', end: true },
    { to: '/teacher/homeworks', icon: CheckCheck, label: 'Vazifalarni Tekshirish', end: false },
    { to: '/teacher/courses', icon: BookOpen, label: 'Kurslarni Boshqarish', end: false },
    { to: '/teacher/students', icon: Users, label: 'Talabalar Nazorati', end: false },
    { to: '/teacher/bot-knowledge', icon: Brain, label: 'Bot Bilimlar Bazasi', end: false },
    { to: '/teacher/leaderboard', icon: Award, label: 'Reyting', end: false },
    { to: '/teacher/reports', icon: FileText, label: 'Hisobotlar', end: false },
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

      {/* Sidebar (Desktop & Mobile) */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-50 h-screen w-64 border-r border-dark-800 bg-dark-900 glass flex flex-col transition-transform duration-300 md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center px-6 border-b border-dark-800 justify-between">
          <div className="flex items-center gap-2.5 text-emerald-400">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-500 flex items-center justify-center font-bold">
              K
            </div>
            <span className="font-bold text-white tracking-tight">CRM O'qituvchi</span>
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
              end={item.end}
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
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
              {user?.name?.charAt(0) || 'O\''}
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header containing Notification Bell */}
        <header className="h-16 border-b border-dark-800 bg-dark-900/50 glass flex items-center justify-between px-4 md:px-6 sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <button className="md:hidden p-2 text-dark-400 -ml-2" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-sm font-semibold text-white tracking-wider uppercase hidden md:block">
              O'qituvchi Kabineti
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Dynamic Notification Bell Container */}
            <div className="relative" ref={bellRef}>
              <button 
                onClick={() => setIsBellOpen(!isBellOpen)}
                className={`relative p-2 text-dark-400 hover:text-white transition-colors rounded-lg hover:bg-dark-800 ${
                  isBellOpen ? 'text-white bg-dark-800' : ''
                }`}
              >
                <Bell className="w-5 h-5" />
                {unreadTasks.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-dark-900 animate-ping"></span>
                )}
                {unreadTasks.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-dark-900"></span>
                )}
              </button>

              {/* Glassmorphic Dropdown */}
              {isBellOpen && (
                <div className="absolute right-[-16px] sm:right-0 mt-2 w-[calc(100vw-32px)] sm:w-80 bg-dark-900/95 border border-dark-800 rounded-xl glass shadow-2xl z-50 overflow-hidden animate-slide-in">
                  <div className="p-3 border-b border-dark-800 bg-dark-900/50 flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Bildirishnomalar</span>
                    {unreadTasks.length > 0 && (
                      <button 
                        onClick={handleMarkAllAsRead}
                        className="text-[10px] text-primary-400 hover:text-primary-300 font-bold flex items-center gap-1 hover:underline transition-all"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Barchasini o'qildi qilish
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-dark-800/40">
                    {unreadTasks.length === 0 ? (
                      <div className="p-6 text-center text-dark-500 flex flex-col items-center gap-2">
                        <AlertCircle className="w-7 h-7 text-dark-600" />
                        <p className="text-xs font-medium">Yangi bildirishnomalar mavjud emas</p>
                      </div>
                    ) : (
                      unreadTasks.map(task => (
                        <div 
                          key={task.id}
                          onClick={() => handleNotificationClick(task)}
                          className="p-3 hover:bg-dark-850 cursor-pointer transition-colors block text-left group"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-emerald-400 group-hover:text-emerald-300 truncate max-w-[170px]">
                              {task.title}
                            </span>
                            <span className="text-[9px] text-dark-500 shrink-0">
                              {new Date(task.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-dark-300 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="h-8 w-px bg-dark-800 mx-2 hidden sm:block" />

            <div 
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-3 cursor-pointer hover:opacity-85 transition-opacity"
              title="Profil sozlamalari"
            >
              <div className="hidden lg:block text-right">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-emerald-400">O'qituvchi</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-dark-800 border border-dark-700 flex items-center justify-center text-dark-300 overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} className="w-full h-full object-cover" alt="" />
                ) : (
                  <UserIcon className="w-5 h-5 text-emerald-400" />
                )}
              </div>
            </div>
          </div>

        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-dark-950 p-4 md:p-6 lg:p-8">
          <MotivationalBanner />
          <ReportWarningBanner />
          <Outlet />
        </main>
      </div>
      {isProfileOpen && <ProfileModal onClose={() => setIsProfileOpen(false)} />}
    </div>
  );
}
