import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { 
  BookOpen, 
  Award, 
  History, 
  Gift, 
  ChevronRight,
  Lock,
  Sparkles,
  CheckCircle
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { fetchCoinBalance } = useOutletContext();
  
  const getFileUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) return path;
    const base = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace('/api', '') 
      : (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);
    return `${base}${path}`;
  };
  
  const [courses, setCourses] = useState([]);
  const [coinsData, setCoinsData] = useState({ balance: 0, transactions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'free', 'paid', 'enrolled'

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch courses
      const coursesRes = await api.get('/lms/courses');
      setCourses(coursesRes.data.courses || []);

      // Fetch coin balance and logs
      const coinsRes = await api.get('/lms/coins/balance');
      setCoinsData(coinsRes.data || { balance: 0, transactions: [] });
      
      // Update global context coin count
      if (fetchCoinBalance) fetchCoinBalance();
      setError('');
    } catch (err) {
      console.error(err);
      setError('Ma\'lumotlarni yuklashda xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter(c => {
    if (activeTab === 'free') return c.isFree;
    if (activeTab === 'paid') return !c.isFree;
    if (activeTab === 'enrolled') return c.hasAccess;
    return true;
  });

  const freeCount = courses.filter(c => c.isFree).length;
  const paidCount = courses.filter(c => !c.isFree).length;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 via-indigo-900 to-dark-950 p-6 md:p-8 border border-primary-500/20 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-40 h-40 bg-primary-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-8 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <span className="text-primary-300 font-bold uppercase tracking-wider text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Kasbtech Akademiya Talabasi
            </span>
            <h1 className="text-3xl font-extrabold text-white mt-1">Xush kelibsiz, {user?.name}!</h1>
            <p className="text-dark-200 mt-2 text-sm max-w-xl leading-relaxed">
              Platformada bepul kurslarni to'g'ridan-to'g'ri tomosha qiling! Pullik kurslarga dostup ustoz, mentor yoki adminlar tomonidan beriladi.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-5 py-3 rounded-xl border border-white/15 shadow-lg">
            <span className="text-2xl">🪙</span>
            <div>
              <p className="text-[10px] text-primary-300 font-bold uppercase tracking-wider">Joriy Balans</p>
              <p className="text-lg font-black text-white">{coinsData.balance} KasbCoin</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-dark-400">Yuklanmoqda...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Courses Area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary-500" />
                Kurslar Katalogi
              </h2>

              {/* Filter Tabs */}
              <div className="flex gap-1.5 bg-dark-900 p-1 rounded-xl border border-dark-800 flex-wrap">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'all' ? 'bg-primary-600 text-white shadow' : 'text-dark-400 hover:text-white'
                  }`}
                >
                  Barchasi ({courses.length})
                </button>
                <button
                  onClick={() => setActiveTab('free')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    activeTab === 'free' ? 'bg-green-600 text-white shadow' : 'text-dark-400 hover:text-green-400'
                  }`}
                >
                  <Gift className="w-3.5 h-3.5" />
                  Bepul ({freeCount})
                </button>
                <button
                  onClick={() => setActiveTab('paid')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    activeTab === 'paid' ? 'bg-indigo-600 text-white shadow' : 'text-dark-400 hover:text-indigo-400'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  Pullik ({paidCount})
                </button>
                <button
                  onClick={() => setActiveTab('enrolled')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    activeTab === 'enrolled' ? 'bg-emerald-600 text-white shadow' : 'text-dark-400 hover:text-emerald-400'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Mening Kurslarim
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredCourses.map(course => (
                <div key={course.id} className="card-hover flex flex-col justify-between h-full bg-dark-900 border border-dark-800 rounded-xl overflow-hidden p-4 relative group">
                  <div>
                    <div className="aspect-video bg-dark-800 rounded-lg overflow-hidden relative mb-4 border border-dark-700">
                      {course.thumbnail ? (
                        <img src={getFileUrl(course.thumbnail)} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-dark-500 bg-dark-900/50">
                          <BookOpen className="w-10 h-10" />
                        </div>
                      )}

                      {/* Course Type Badge */}
                      <div className="absolute top-2 left-2 flex gap-1.5">
                        {course.isFree ? (
                          <span className="badge bg-green-500/90 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-md shadow-md backdrop-blur-sm flex items-center gap-1">
                            <Gift className="w-3 h-3" />
                            BEPUL KURS
                          </span>
                        ) : (
                          <span className="badge bg-indigo-600/90 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-md shadow-md backdrop-blur-sm flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            PULLIK KURS
                          </span>
                        )}
                      </div>

                      {/* Access Status Badge */}
                      <div className="absolute top-2 right-2">
                        {course.hasAccess ? (
                          <span className="bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-sm flex items-center gap-1 shadow">
                            <CheckCircle className="w-3 h-3" />
                            Ruxsat bor
                          </span>
                        ) : (
                          <span className="bg-red-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-sm flex items-center gap-1 shadow">
                            <Lock className="w-3 h-3" />
                            Dostup yo'q
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="font-bold text-white text-base mb-1.5 line-clamp-1">{course.title}</h3>
                    <p className="text-xs text-dark-400 line-clamp-2 mb-3">{course.description}</p>
                    
                    {!course.isFree && (
                      <p className="text-xs font-semibold text-primary-400 mb-3">
                        Narxi: {parseFloat(course.price).toLocaleString('uz-UZ')} so'm
                      </p>
                    )}
                  </div>

                  <div className="space-y-4 pt-3 border-t border-dark-800">
                    {/* Progress Bar (If has access or enrolled) */}
                    {course.hasAccess && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-dark-400">O'zlashtirish</span>
                          <span className="text-primary-400">{course.progress || 0}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-dark-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary-500 to-indigo-500 transition-all duration-300"
                            style={{ width: `${course.progress || 0}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {course.hasAccess ? (
                      <button 
                        onClick={() => navigate(`/student/courses/${course.id}`)}
                        className={`w-full ${course.isFree ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500' : 'btn-primary'} text-xs font-bold justify-center py-2.5 flex items-center gap-1.5 rounded-xl shadow-lg transition-all`}
                      >
                        {course.isFree ? "Bepul Ko'rish" : "Darslarni Boshlash"}
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="space-y-1.5 text-center">
                        <button 
                          disabled
                          className="w-full bg-dark-800 text-dark-400 border border-dark-700 text-xs font-semibold justify-center py-2 flex items-center gap-1.5 rounded-xl cursor-not-allowed"
                        >
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          Dostup Kutilmoqda
                        </button>
                        <p className="text-[10px] text-amber-400/90 font-medium">
                          Ushbu pullik kursga ustoz, mentor yoki admin tomonidan dostup beriladi.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {filteredCourses.length === 0 && (
                <div className="col-span-full text-center py-12 text-dark-400 border border-dashed border-dark-700 rounded-xl bg-dark-900/20">
                  Ushbu bo'limda kurslar mavjud emas.
                </div>
              )}
            </div>
          </div>

          {/* Gamification Sidebar */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Tizim Gamifikatsiyasi
            </h2>

            {/* Explainer card */}
            <div className="card bg-gradient-to-br from-dark-900 to-dark-950 border-dark-800 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <Gift className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white text-sm">Koinlarni qanday ishlatish mumkin?</h4>
                  <p className="text-xs text-dark-400 mt-1 leading-relaxed">
                    Darslar va testlardan to'plagan koinlaringizni Kasbtech do'konida bepul sovg'alar, qo'shimcha maslahat darslari yoki rasmiy sertifikatlarga almashtirishingiz mumkin!
                  </p>
                </div>
              </div>

              <div className="bg-dark-850 p-3 rounded-lg border border-dark-700/50 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-dark-300">Uy vazifasi uchun</span>
                  <span className="font-semibold text-green-400">Maks. +10 koin</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-dark-300">Testdan o'tish</span>
                  <span className="font-semibold text-green-400">Maks. +10 koin</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-dark-300">100% natija (Vazifa + Test)</span>
                  <span className="font-semibold text-yellow-400">Bonus +2 koin</span>
                </div>
              </div>
            </div>

            {/* Transactions Log */}
            <div className="card bg-dark-900 border-dark-800 p-5 space-y-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-dark-800 pb-2">
                <History className="w-4 h-4 text-dark-400" />
                Koinlar Tarixi
              </h3>

              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {coinsData.transactions?.map((tx) => (
                  <div key={tx.id} className="flex justify-between items-start text-xs border-b border-dark-800/50 pb-2">
                    <div className="space-y-0.5">
                      <p className="font-medium text-white">{tx.description}</p>
                      <p className="text-[10px] text-dark-500">{new Date(tx.createdAt).toLocaleDateString('uz-UZ')}</p>
                    </div>
                    <span className="font-extrabold text-green-400 flex-shrink-0">
                      +{tx.amount} 🪙
                    </span>
                  </div>
                ))}

                {coinsData.transactions?.length === 0 && (
                  <p className="text-center text-xs text-dark-500 py-4">Koinlar tarixi hozircha bo'sh.</p>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
