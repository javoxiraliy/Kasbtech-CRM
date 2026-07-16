import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from 'recharts';
import { 
  Award, Trophy, TrendingUp, Activity, BookOpen, Search, Star, Crown, Coins, BookOpenCheck, User as UserIcon
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

export default function Leaderboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('overall');
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedCourse]);

  const fetchCourses = async () => {
    try {
      const res = await api.get('/lms/courses');
      setCourses(res.data.courses || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/lms/leaderboard?courseId=${selectedCourse}`);
      setLeaderboardData(res.data);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !leaderboardData) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-dark-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium">Reyting yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  const studentsList = leaderboardData?.leaderboard || [];
  
  // Find current student rank if logged-in user is a student
  const studentRank = user?.role === 'STUDENT'
    ? studentsList.findIndex(s => s.id === user.id) + 1
    : 0;

  // Filter list by search query
  const filteredStudents = studentsList.filter(student => 
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Top 3 for Podium
  const top3 = studentsList.slice(0, 3);
  // Reorder for podium visual: [2nd, 1st, 3rd]
  const podiumStudents = [];
  if (top3[1]) podiumStudents.push({ ...top3[1], rank: 2 });
  if (top3[0]) podiumStudents.push({ ...top3[0], rank: 1 });
  if (top3[2]) podiumStudents.push({ ...top3[2], rank: 3 });

  return (
    <div className="space-y-6">
      {/* Header and Filter */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-dark-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-7 h-7 text-yellow-500 animate-pulse" />
            Talabalar Reytingi & Ilg'orlar Grafigi
          </h1>
          <p className="text-dark-400 text-sm mt-1">
            Akademiyadagi eng yaxshi o'zlashtirayotgan va eng faol talabalarning reytingi
          </p>
        </div>
        
        {/* Course Filter Dropdown */}
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary-400 shrink-0" />
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="input bg-dark-900 border-dark-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 w-64 cursor-pointer"
          >
            <option value="overall">Barcha Kurslar (Umumiy)</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>{course.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Student Rank Banner for Students */}
      {user?.role === 'STUDENT' && studentRank > 0 && (
        <div className="p-4 bg-gradient-to-r from-primary-600/10 via-primary-500/5 to-transparent border border-primary-500/20 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold border border-primary-500/30">
              #{studentRank}
            </div>
            <div>
              <p className="text-xs text-primary-400 uppercase font-bold tracking-wider">Sizning o'rningiz</p>
              <h4 className="text-lg font-bold text-white">Siz hozirda reytingda {studentRank}-o'rindasiz</h4>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-dark-400">Jami koinlaringiz</p>
            <p className="text-lg font-extrabold text-yellow-400 flex items-center gap-1 justify-end">
              🪙 {studentsList.find(s => s.id === user.id)?.coins || 0}
            </p>
          </div>
        </div>
      )}

      {/* Podium Visual for Top 3 */}
      {top3.length > 0 && (
        <div className="card glass bg-gradient-to-b from-dark-900/50 to-dark-950/20 p-6">
          <h3 className="text-center font-bold text-lg text-white mb-6 uppercase tracking-wider text-primary-400">
            🏆 Peshqadamlar Podiumı
          </h3>
          <div className="flex flex-col sm:flex-row items-end justify-center gap-6 sm:gap-4 md:gap-8 max-w-4xl mx-auto pt-6">
            {podiumStudents.map((student) => {
              const colors = {
                1: { border: 'border-yellow-500/60 shadow-[0_0_20px_rgba(234,179,8,0.2)]', bg: 'from-yellow-600/25 to-yellow-950/20 shadow-yellow-500/10', text: 'text-yellow-400', podiumBg: 'bg-gradient-to-t from-yellow-500/20 to-yellow-500/5 border-yellow-500/30', height: 'h-40 sm:h-48', icon: Crown },
                2: { border: 'border-slate-400/50 shadow-[0_0_15px_rgba(148,163,184,0.15)]', bg: 'from-slate-600/25 to-slate-950/20 shadow-slate-400/10', text: 'text-slate-300', podiumBg: 'bg-gradient-to-t from-slate-400/15 to-slate-400/5 border-slate-400/25', height: 'h-32 sm:h-38', icon: Star },
                3: { border: 'border-amber-600/40 shadow-[0_0_15px_rgba(217,119,6,0.15)]', bg: 'from-amber-700/25 to-amber-950/20 shadow-amber-600/10', text: 'text-amber-500', podiumBg: 'bg-gradient-to-t from-amber-600/15 to-amber-600/5 border-amber-600/20', height: 'h-24 sm:h-28', icon: Star }
              };
              const style = colors[student.rank];
              const IconComponent = style.icon;

              return (
                <div key={student.id} className="flex flex-col items-center w-full sm:w-48 group transition-all duration-300 hover:-translate-y-1">
                  {/* Avatar and Info */}
                  <div className="relative mb-3 flex flex-col items-center">
                    {/* Rank Badge Indicator */}
                    <div className={`absolute -top-6 w-10 h-10 rounded-full flex items-center justify-center border bg-dark-900 z-10 ${style.border}`}>
                      <IconComponent className={`w-5 h-5 ${style.text}`} />
                    </div>
                    {/* Student Avatar */}
                    <div className={`w-20 h-20 rounded-full overflow-hidden border-2 flex items-center justify-center bg-dark-850 ${style.border}`}>
                      {student.avatar ? (
                        <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-8 h-8 text-dark-400" />
                      )}
                    </div>
                  </div>
                  
                  {/* Name and Details */}
                  <div className="text-center mb-3">
                    <h4 className="text-sm font-bold text-white truncate max-w-[150px]">{student.name}</h4>
                    <p className="text-[10px] text-dark-400 truncate max-w-[150px]">{student.email}</p>
                    <div className="mt-1.5 flex items-center justify-center gap-1.5">
                      <span className="text-xs bg-dark-800 px-2 py-0.5 rounded-full border border-dark-700 text-dark-200">
                        {student.progress}% progress
                      </span>
                      <span className="text-xs text-yellow-400 font-bold flex items-center gap-0.5">
                        🪙 {student.coins}
                      </span>
                    </div>
                  </div>

                  {/* Podium Stand */}
                  <div className={`w-full ${style.height} ${style.podiumBg} border-t-2 rounded-t-xl flex flex-col items-center justify-center gap-1`}>
                    <span className={`text-4xl font-extrabold ${style.text}`}>#{student.rank}</span>
                    <span className="text-[10px] uppercase font-bold text-dark-400 tracking-widest">O'rin</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid of charts (Ascending order) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Performance Chart */}
        <div className="card glass flex flex-col">
          <div className="flex items-center gap-2 text-primary-400 mb-4">
            <TrendingUp className="w-5 h-5" />
            <h3 className="font-semibold text-white">Eng yaxshi o'zlashtirayotganlar (Top 10)</h3>
          </div>
          <p className="text-xs text-dark-400 mb-4">
            Foydalanuvchilar o'zlashtirish foizi bo'yicha (eng pastdan eng yuqoriga o'sib borish tartibida)
          </p>
          <div className="h-64 mt-auto">
            {leaderboardData?.byPerformance?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leaderboardData.byPerformance} margin={{ top: 10, right: 10, left: -25, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748b" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => val.split(' ')[0]} 
                  />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                    formatter={(value) => [`${value}%`, "O'zlashtirish"]}
                  />
                  <Bar dataKey="progress" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {leaderboardData.byPerformance.map((entry, idx) => (
                      <Cell 
                        key={`cell-${idx}`} 
                        fill={user && entry.id === user.id ? '#eab308' : '#3b82f6'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-dark-500 text-sm">Ma'lumot mavjud emas</div>
            )}
          </div>
        </div>

        {/* Activity Chart */}
        <div className="card glass flex flex-col">
          <div className="flex items-center gap-2 text-emerald-400 mb-4">
            <Activity className="w-5 h-5" />
            <h3 className="font-semibold text-white">Eng faol talabalar (Top 10)</h3>
          </div>
          <p className="text-xs text-dark-400 mb-4">
            To'plangan KasbCoin koinlari bo'yicha (eng pastdan eng yuqoriga o'sib borish tartibida)
          </p>
          <div className="h-64 mt-auto">
            {leaderboardData?.byActivity?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leaderboardData.byActivity} margin={{ top: 10, right: 10, left: -25, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748b" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => val.split(' ')[0]} 
                  />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                    formatter={(value) => [value, "Koinlar"]}
                  />
                  <Bar dataKey="coins" fill="#10b981" radius={[4, 4, 0, 0]}>
                    {leaderboardData.byActivity.map((entry, idx) => (
                      <Cell 
                        key={`cell-${idx}`} 
                        fill={user && entry.id === user.id ? '#eab308' : '#10b981'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-dark-500 text-sm">Ma'lumot mavjud emas</div>
            )}
          </div>
        </div>

      </div>

      {/* Search and Table Grid */}
      <div className="card glass p-0 overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-4 border-b border-dark-800 bg-dark-900/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h3 className="font-semibold text-white">To'liq reyting jadvali</h3>
            <span className="text-xs bg-dark-800 px-2.5 py-1 rounded-full border border-dark-700 text-dark-300">
              {filteredStudents.length} talaba
            </span>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-dark-500" />
            </span>
            <input
              type="text"
              placeholder="Qidirish (ism yoki email)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-9 bg-dark-950 border-dark-750 text-xs w-full py-1.5 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-dark-900/60 border-b border-dark-800 text-dark-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold text-center w-20">O'rin</th>
                <th className="px-6 py-4 font-semibold">Talaba</th>
                <th className="px-6 py-4 font-semibold text-center">Kurs Progressi</th>
                <th className="px-6 py-4 font-semibold text-center">O'rtacha Baho</th>
                <th className="px-6 py-4 font-semibold text-center">Uy Vazifalari</th>
                <th className="px-6 py-4 font-semibold text-right w-36">KasbCoin</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-dark-850/60">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-dark-500">
                    Talabalar topilmadi.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, index) => {
                  const isCurrentUser = user && student.id === user.id;
                  const rank = studentsList.findIndex(s => s.id === student.id) + 1;

                  return (
                    <tr 
                      key={student.id} 
                      className={`transition-all duration-150 hover:bg-dark-800/20 ${
                        isCurrentUser 
                          ? 'bg-primary-500/5 border-l-4 border-l-primary-500 font-medium' 
                          : ''
                      }`}
                    >
                      {/* Rank Column */}
                      <td className="px-6 py-4 text-center">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold mx-auto text-xs ${
                          rank === 1 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' : 
                          rank === 2 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30' : 
                          rank === 3 ? 'bg-amber-600/20 text-amber-500 border border-amber-600/30' : 
                          'bg-dark-800 text-dark-400'
                        }`}>
                          #{rank}
                        </div>
                      </td>

                      {/* Student Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-dark-800 border border-dark-700 flex items-center justify-center overflow-hidden shrink-0">
                            {student.avatar ? (
                              <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                            ) : (
                              <UserIcon className="w-4 h-4 text-dark-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-white font-medium truncate block">{student.name}</span>
                              {isCurrentUser && (
                                <span className="text-[9px] bg-primary-600/25 text-primary-400 border border-primary-500/20 px-1.5 py-0.2 rounded font-bold uppercase shrink-0">
                                  Siz
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-dark-500 truncate block">{student.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Progress bar */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-center justify-center gap-1 max-w-[120px] mx-auto">
                          <span className="text-xs font-semibold text-white">{student.progress}%</span>
                          <div className="w-full bg-dark-800 h-1.5 rounded-full overflow-hidden border border-dark-750">
                            <div 
                              className={`h-full rounded-full ${
                                student.progress >= 90 ? 'bg-green-500' :
                                student.progress >= 50 ? 'bg-primary-500' :
                                'bg-yellow-600'
                              }`}
                              style={{ width: `${student.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Avg Grade */}
                      <td className="px-6 py-4 text-center font-semibold text-dark-200">
                        {student.avgGrade > 0 ? (
                          <div className="flex items-center justify-center gap-1">
                            <BookOpenCheck className="w-4 h-4 text-primary-400" />
                            <span>{student.avgGrade} ball</span>
                          </div>
                        ) : (
                          <span className="text-dark-500 text-xs">-</span>
                        )}
                      </td>

                      {/* Submissions count */}
                      <td className="px-6 py-4 text-center text-dark-300">
                        {student.submissionsCount > 0 ? (
                          <span className="bg-dark-800 border border-dark-700 px-2.5 py-1 rounded text-xs">
                            {student.submissionsCount} ta vazifa
                          </span>
                        ) : (
                          <span className="text-dark-500 text-xs">0 ta vazifa</span>
                        )}
                      </td>

                      {/* Coins */}
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-yellow-400 inline-flex items-center gap-1 bg-yellow-500/5 px-2.5 py-1 rounded-full border border-yellow-500/10">
                          <Coins className="w-3.5 h-3.5" />
                          {student.coins}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
