import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Key, Mail, Loader2, X, Eye, EyeOff } from 'lucide-react';
import api from '../lib/api';

import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deviceLimitError, setDeviceLimitError] = useState(false);
  const [activeSessions, setActiveSessions] = useState([]);
  const [terminatingSessionId, setTerminatingSessionId] = useState(null);
  const { login } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!email || !password) {
      addNotification('warning', "Barcha maydonlarni to'ldiring");
      return;
    }

    setIsLoading(true);
    try {
      const user = await login(email, password);
      addNotification('success', 'Tizimga muvaffaqiyatli kirdingiz');
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else if (user.role === 'TEACHER') {
        navigate('/teacher');
      } else if (user.role === 'SMM') {
        navigate('/smm');
      } else {
        navigate('/operator');
      }
    } catch (error) {
      if (error.response?.data?.error === 'DEVICE_LIMIT_EXCEEDED') {
        setDeviceLimitError(true);
        setActiveSessions(error.response.data.sessions || []);
        addNotification('warning', "Maksimal qurilmalar soniga yetdingiz");
      } else {
        addNotification('error', error.response?.data?.message || error.response?.data?.error || "Login yoki parol noto'g'ri");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId) => {
    setTerminatingSessionId(sessionId);
    try {
      await api.post('/auth/terminate-session', {
        email,
        password,
        sessionId
      });
      addNotification('success', "Qurilma o'chirildi. Tizimga qayta kirilmoqda...");
      setDeviceLimitError(false);
      setActiveSessions([]);
      
      // Attempt login again automatically
      const user = await login(email, password);
      addNotification('success', 'Tizimga muvaffaqiyatli kirdingiz');
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else if (user.role === 'TEACHER') {
        navigate('/teacher');
      } else if (user.role === 'SMM') {
        navigate('/smm');
      } else {
        navigate('/operator');
      }
    } catch (err) {
      addNotification('error', err.response?.data?.error || "Qurilmani o'chirishda xatolik yuz berdi");
    } finally {
      setTerminatingSessionId(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-dark-800 via-dark-950 to-dark-950 relative overflow-hidden">
      
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary-600/10 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-dark-800 border border-dark-700 shadow-xl mb-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-purple-500/20" />
            <Shield className="w-8 h-8 text-primary-400 relative z-10" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Kasbtech CRM</h1>
          <p className="text-dark-400">Tizimga kirish uchun ma'lumotlaringizni kiriting</p>
        </div>

        <form onSubmit={handleSubmit} className="card glass relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-purple-500 transform origin-left transition-transform duration-300 scale-x-0 group-hover:scale-x-100" />
          
          <div className="space-y-4 pt-2">
            <div>
              <label className="label">Email manzil</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-dark-500" />
                </div>
                <input
                  type="email"
                  className="input pl-10"
                  placeholder="admin@crm.uz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="label">Parol</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-5 w-5 text-dark-500" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-dark-500 hover:text-white transition-colors"
                  title={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary justify-center mt-6 py-2.5 text-base relative overflow-hidden group/btn"
            >
              <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-500" />
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Kutmoqda...
                </>
              ) : (
                'Tizimga kirish'
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center text-sm text-dark-500">
          <p>Tizimga kirishda muammo bormi?</p>
          <p>Adminstrator bilan bog'laning</p>
        </div>
      </div>

      {/* Device Limit Exceeded Modal */}
      {deviceLimitError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in">
          <div className="card glass w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="p-4 border-b border-dark-800 flex justify-between items-center bg-dark-900/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                Faol Qurilmalar (Max 3 ta)
              </h3>
              <button 
                onClick={() => {
                  setDeviceLimitError(false);
                  setActiveSessions([]);
                }} 
                className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-dark-850 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <p className="text-xs text-dark-300">
                Siz ruxsat etilgan maksimal qurilmalar soniga (3 ta) yetdingiz. Tizimga kirish uchun quyidagi faol qurilmalardan birini o'chirishingiz lozim:
              </p>
              
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {activeSessions.map((session) => (
                  <div key={session.id} className="p-3 rounded-xl bg-dark-800/80 border border-dark-700/60 flex items-center justify-between gap-3 text-left">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate" title={session.deviceInfo}>
                        {session.deviceInfo}
                      </p>
                      <p className="text-[10px] text-dark-400 mt-1">
                        IP: <span className="text-primary-400 font-mono">{session.ipAddress}</span>
                      </p>
                      <p className="text-[9px] text-dark-500 mt-0.5">
                        Oxirgi faollik: {new Date(session.lastActiveAt).toLocaleString('uz-UZ')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTerminateSession(session.id)}
                      disabled={terminatingSessionId !== null}
                      className="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 hover:border-transparent transition-all shrink-0 active:scale-95 flex items-center gap-1"
                    >
                      {terminatingSessionId === session.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : 'Chiqish'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
