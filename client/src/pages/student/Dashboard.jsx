import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { 
  BookOpen, 
  Award, 
  Clock, 
  History, 
  Gift, 
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { fetchCoinBalance } = useOutletContext();
  
  const [courses, setCourses] = useState([]);
  const [coinsData, setCoinsData] = useState({ balance: 0, transactions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 to-indigo-950 p-6 md:p-8 border border-primary-500/20 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-40 h-40 bg-primary-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-8 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <span className="text-primary-300 font-bold uppercase tracking-wider text-xs">Akademiya Talabasi</span>
            <h1 className="text-3xl font-extrabold text-white mt-1">Xush kelibsiz, {user?.name}!</h1>
            <p className="text-dark-200 mt-2 text-sm max-w-xl">
              Kasbtech platformasida onlayn ta'limingiz muvaffaqiyatli bo'lsin. Darslarni ko'ring, vazifalarni bajaring va mukofot koinlarini qo'lga kiriting!
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md px-5 py-3 rounded-xl border border-white/10 shadow-lg">
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
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary-500" />
                Mening Kurslarim
              </h2>
              <span className="text-xs text-dark-400 font-medium">Jami {courses.length} ta kurs</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {courses.map(course => (
                <div key={course.id} className="card-hover flex flex-col justify-between h-full bg-dark-900 border border-dark-800 rounded-xl overflow-hidden p-4">
                  <div>
                    <div className="aspect-video bg-dark-800 rounded-lg overflow-hidden relative mb-4 border border-dark-700">
                      {course.thumbnail ? (
                        <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-dark-500 bg-dark-900/50">
                          <BookOpen className="w-10 h-10" />
                        </div>
                      )}
                    </div>

                    <h3 className="font-bold text-white text-base mb-1.5 line-clamp-1">{course.title}</h3>
                    <p className="text-xs text-dark-400 line-clamp-2 mb-4">{course.description}</p>
                  </div>

                  <div className="space-y-4 pt-3 border-t border-dark-800">
                    {/* Progress Bar */}
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

                    <button 
                      onClick={() => navigate(`/student/courses/${course.id}`)}
                      className="w-full btn-primary text-xs justify-center py-2 flex items-center gap-1"
                    >
                      Darslarni Boshlash
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {courses.length === 0 && (
                <div className="col-span-full text-center py-12 text-dark-400 border border-dashed border-dark-700 rounded-xl bg-dark-900/20">
                  Siz hali birorta ham kursga yozilmagansiz. Kurs olish uchun ma'muriyat bilan bog'laning.
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
