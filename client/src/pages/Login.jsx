import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Key, Mail, Loader2, X, Eye, EyeOff, UserCheck } from 'lucide-react';
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
  
  // Google Auth Fallback Modal state
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleForm, setGoogleForm] = useState({ name: '', email: '' });

  const { login, loginWithGoogle } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    // Load Google Identity Services SDK dynamically
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleGoogleAuth = async (googlePayload) => {
    setIsLoading(true);
    try {
      const user = await loginWithGoogle(googlePayload);
      addNotification('success', `Google orqali kirdingiz: ${user.name}`);
      if (user.role === 'ADMIN') navigate('/admin');
      else if (user.role === 'TEACHER') navigate('/teacher');
      else if (user.role === 'SMM') navigate('/smm');
      else if (user.role === 'STUDENT') navigate('/student');
      else navigate('/operator');
    } catch (error) {
      if (error.response?.data?.error === 'DEVICE_LIMIT_EXCEEDED') {
        setDeviceLimitError(true);
        setActiveSessions(error.response.data.sessions || []);
        addNotification('warning', "Maksimal qurilmalar soniga yetdingiz");
      } else {
        addNotification('error', error.response?.data?.error || error.response?.data?.message || "Google orqali ro'yxatdan o'tishda xatolik");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const triggerGoogleSignIn = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "1029384756-example.apps.googleusercontent.com",
        callback: (response) => {
          if (response.credential) {
            handleGoogleAuth({ credential: response.credential });
          }
        }
      });
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          setShowGoogleModal(true);
        }
      });
    } else {
      setShowGoogleModal(true);
    }
  };

  const handleGoogleModalSubmit = (e) => {
    e.preventDefault();
    if (!googleForm.email || !googleForm.name) {
      addNotification('warning', "Email va ismingizni kiriting");
      return;
    }
    setShowGoogleModal(false);
    handleGoogleAuth({
      email: googleForm.email,
      name: googleForm.name
    });
  };

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
      } else if (user.role === 'STUDENT') {
        navigate('/student');
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
      
      const user = await login(email, password);
      addNotification('success', 'Tizimga muvaffaqiyatli kirdingiz');
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else if (user.role === 'TEACHER') {
        navigate('/teacher');
      } else if (user.role === 'SMM') {
        navigate('/smm');
      } else if (user.role === 'STUDENT') {
        navigate('/student');
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
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Kasbtech Platformasi</h1>
          <p className="text-dark-400">Tizimga kirish va talabalar ro'yxatdan o'tishi</p>
        </div>

        <div className="card glass relative overflow-hidden group space-y-5">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-purple-500 transform origin-left transition-transform duration-300 scale-x-0 group-hover:scale-x-100" />
          
          {/* Google Auth Button */}
          <div>
            <button
              type="button"
              onClick={triggerGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-gray-100 text-gray-800 font-bold text-sm transition-all duration-200 shadow-lg hover:shadow-xl active:scale-98 border border-gray-200"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Google orqali ro'yxatdan o'tish / Kirish</span>
            </button>
            <p className="text-[11px] text-center text-primary-300 mt-2 font-medium">
              Talabalar Google orqali bepul ro'yxatdan o'tib, bepul kurslarni tomosha qilishlari mumkin!
            </p>
          </div>

          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-dark-700 w-full" />
            <span className="bg-dark-900 px-3 text-[11px] text-dark-400 uppercase font-extrabold relative z-10 tracking-widest">yoki email orqali</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email manzil</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-dark-500" />
                </div>
                <input
                  type="email"
                  className="input pl-10"
                  placeholder="student@kasbtech.uz"
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
          </form>
        </div>

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

      {/* Google Auth Quick Sign-Up Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in">
          <div className="card glass w-full max-w-md overflow-hidden shadow-2xl relative p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Google orqali ro'yxatdan o'tish
              </h3>
              <button onClick={() => setShowGoogleModal(false)} className="text-dark-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGoogleModalSubmit} className="space-y-4">
              <div>
                <label className="label">F.I.SH. (Ism va Familiya)</label>
                <input
                  type="text"
                  required
                  className="input bg-dark-800"
                  placeholder="Jasur Rahimov"
                  value={googleForm.name}
                  onChange={(e) => setGoogleForm({ ...googleForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Google Email Manzilingiz</label>
                <input
                  type="email"
                  required
                  className="input bg-dark-800"
                  placeholder="jasur@gmail.com"
                  value={googleForm.email}
                  onChange={(e) => setGoogleForm({ ...googleForm, email: e.target.value })}
                />
              </div>

              <p className="text-xs text-dark-400">
                Siz Student (Talaba) sifatida tizimdan ro'yxatdan o'tasiz va bepul kurslarni to'g'ridan to'g'ri bepul ko'ra olasiz.
              </p>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowGoogleModal(false)} className="flex-1 btn-secondary justify-center">
                  Bekor qilish
                </button>
                <button type="submit" disabled={isLoading} className="flex-1 btn-primary justify-center">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ro'yxatdan o'tish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
