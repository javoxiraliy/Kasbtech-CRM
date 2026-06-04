import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Key, Mail, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      } else {
        navigate('/operator');
      }
    } catch (error) {
      addNotification('error', error.response?.data?.error || "Login yoki parol noto'g'ri");
    } finally {
      setIsLoading(false);
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
                  type="password"
                  className="input pl-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
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
    </div>
  );
}
