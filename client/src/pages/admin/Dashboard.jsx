import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Users, Target, Clock, TrendingUp, GraduationCap, BookOpen, Award } from 'lucide-react';
import api from '../../lib/api';
import OperatorActivityModal from '../../components/OperatorActivityModal';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#64748b'];

function StatCard({ title, value, icon: Icon, trend, colorClass }) {
  return (
    <div className="card glass relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon className={`w-16 h-16 ${colorClass}`} />
      </div>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${colorClass.replace('text-', 'bg-').replace('500', '500/20')} text-${colorClass.split('-')[1]}-400`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-dark-400 font-medium text-sm mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-white">{value}</h3>
          {trend && (
            <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {trend}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const COURSE_LABELS = {
  COMPUTER_LITERACY: 'Kompyuter Savodxonligi',
  GRAPHIC_DESIGN: 'Grafik Dizayn',
  SMM: 'SMM',
  TARGET_PRO: 'Target Pro',
  VIDEOGRAPHY: 'Videomontaj "videografiya"',
  WEB_DEVELOPMENT: 'Web Dasturlash',
  PYTHON: 'Python Dasturlash',
  AUTOCAD: 'AutoCAD',
  THREE_D_MAX: '3D MAX',
  CYBERSECURITY: 'Kiberxavfsizlik',
  OTHER: 'Boshqa',
  VIDEO_EDITING: 'Video montaj',
  COMPUTER_GRAPHICS: 'Kompyuter grafikasi'
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedOperatorId, setSelectedOperatorId] = useState(null);
  const [activeTab, setActiveTab] = useState('operators');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/admin/dashboard');
      setData(res.data);
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-dark-100 flex items-center justify-center h-full">Yuklanmoqda...</div>;
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-dark-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Kasbtech CRM & LMS Ekotizimi</h1>
          <p className="text-dark-400 text-sm">Sotuvlar, onlayn ta'lim, o'quvchilar progressi va moliyaviy natijalarning yagona boshqaruv markazi</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard 
          title="Umumiy Daromad" 
          value={new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', maximumFractionDigits: 0 }).format(data.metrics.totalRevenue || 0)} 
          icon={TrendingUp} 
          colorClass="text-amber-500" 
        />
        <StatCard 
          title="Jami Lidlar" 
          value={data.metrics.totalLeads} 
          icon={Users} 
          colorClass="text-blue-500" 
        />
        <StatCard 
          title="Sotuv Konversiyasi" 
          value={`${data.metrics.conversionRate}%`} 
          icon={Target} 
          colorClass="text-green-500" 
        />
        <StatCard 
          title="Jami Talabalar" 
          value={data.metrics.totalStudents} 
          icon={GraduationCap} 
          colorClass="text-emerald-500" 
        />
        <StatCard 
          title="Kurs A'zoliklari" 
          value={data.metrics.totalEnrollments} 
          icon={Award} 
          colorClass="text-indigo-500" 
        />
        <StatCard 
          title="Kutilayotgan Uy Vazifalari" 
          value={data.metrics.pendingHomeworks} 
          icon={Clock} 
          colorClass="text-orange-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Course Chart */}
        <div className="card glass">
          <h3 className="text-lg font-semibold text-white mb-4">Kurslar bo'yicha talab</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.leadsByCourse} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis 
                  dataKey="course" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => COURSE_LABELS[val] || val}
                  angle={-15}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                  formatter={(value, name, props) => [value, 'Lidlar']}
                  labelFormatter={(label) => COURSE_LABELS[label] || label}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Chart */}
        <div className="card glass">
          <h3 className="text-lg font-semibold text-white mb-4">Lidlar holati</h3>
          <div className="h-72 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie
                  data={data.leadsByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="status"
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {data.leadsByStatus.map((entry, index) => {
                    const statusColors = {
                      NEW: '#3b82f6',          // Kok (Blue)
                      IN_PROGRESS: '#ec4899',  // Pushti (Pink)
                      VOUCHER_CHECK: '#eab308',// Sariq (Yellow)
                      SUCCESS: '#10b981',      // Yashil (Green)
                      ARCHIVED: '#8b5cf6',     // Binafsha (Purple)
                      DELAYED: '#ef4444'       // Qizil (Red)
                    };
                    return (
                      <Cell key={`cell-${index}`} fill={statusColors[entry.status] || '#64748b'} />
                    );
                  })}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  formatter={(value, name) => {
                    const statusLabels = {
                      NEW: 'Yangi',
                      IN_PROGRESS: 'Jarayonda',
                      VOUCHER_CHECK: 'Vaucher tekshiruvi',
                      SUCCESS: 'Muvaffaqiyatli',
                      ARCHIVED: 'Rad etilgan',
                      DELAYED: 'Kechiktirilgan qo\'ng\'iroqlar'
                    };
                    return [value, statusLabels[name] || name];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Custom Status Legend */}
            <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-[11px] w-full px-4">
              {Object.entries({
                NEW: 'Yangi',
                IN_PROGRESS: 'Jarayonda',
                VOUCHER_CHECK: 'Vaucher tekshiruvi',
                SUCCESS: 'Muvaffaqiyatli',
                ARCHIVED: 'Rad etilgan',
                DELAYED: 'Kechiktirilgan'
              }).map(([key, label]) => {
                const count = data.leadsByStatus.find(s => s.status === key)?.count || 0;
                if (count === 0) return null;
                const statusColors = {
                  NEW: '#3b82f6',
                  IN_PROGRESS: '#ec4899',
                  VOUCHER_CHECK: '#eab308',
                  SUCCESS: '#10b981',
                  ARCHIVED: '#8b5cf6',
                  DELAYED: '#ef4444'
                };
                return (
                  <div key={key} className="flex items-center gap-1.5 px-2 py-0.5 bg-dark-800/40 rounded-lg border border-dark-700/50">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors[key] }} />
                    <span className="text-dark-300 font-medium">{label}:</span>
                    <span className="text-white font-bold">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Course Enrollments Breakdown */}
        <div className="card glass lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            Kurslar bo'yicha talabalar a'zoligi
          </h3>
          <div className="space-y-4 max-h-[320px] overflow-y-auto pr-2">
            {(data.lmsStats?.coursesEnrollments || []).map((c) => {
              const maxEnrollments = Math.max(...(data.lmsStats?.coursesEnrollments || []).map(x => x.enrollmentsCount), 1);
              const percentage = (c.enrollmentsCount / maxEnrollments) * 100;
              
              return (
                <div key={c.courseId} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-white font-medium">{c.title}</span>
                    <span className="text-dark-300 font-bold">{c.enrollmentsCount} talaba</span>
                  </div>
                  <div className="w-full bg-dark-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {(!data.lmsStats?.coursesEnrollments || data.lmsStats.coursesEnrollments.length === 0) && (
              <div className="py-8 text-center text-dark-500">Faol a'zoliklar mavjud emas</div>
            )}
          </div>
        </div>

        {/* LMS Quick Stats / Highlights */}
        <div className="card glass">
          <h3 className="text-lg font-semibold text-white mb-4">Platforma Qisqacha hisoboti</h3>
          <div className="space-y-4">
            <div className="p-3 bg-dark-800/40 border border-dark-700/50 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-sm text-dark-300">Har bir kursga o'rtacha</span>
              </div>
              <span className="text-sm font-bold text-white">
                {data.metrics.totalCourses > 0 ? (data.metrics.totalEnrollments / data.metrics.totalCourses).toFixed(1) : 0} talaba
              </span>
            </div>

            <div className="p-3 bg-dark-800/40 border border-dark-700/50 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span className="text-sm text-dark-300">Bir o'qituvchiga o'rtacha</span>
              </div>
              <span className="text-sm font-bold text-white">
                {data.metrics.totalTeachers > 0 ? (data.metrics.totalStudents / data.metrics.totalTeachers).toFixed(1) : 0} talaba
              </span>
            </div>
            
            <div className="p-3 bg-dark-800/40 border border-dark-700/50 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-sm text-dark-300">Sotuv konversiyasi</span>
              </div>
              <span className="text-sm font-bold text-white">
                {data.metrics.conversionRate}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Staff KPI Section */}
      <div className="card glass">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-dark-800 pb-4 mb-4 gap-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-400" />
            Ekotizim Xodimlari Ish Faoliyati
          </h3>
          <div className="flex bg-dark-900 p-1 rounded-lg border border-dark-800">
            <button
              onClick={() => setActiveTab('operators')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'operators' 
                  ? 'bg-primary-600 text-white shadow' 
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              Sotuv (Operatorlar)
            </button>
            <button
              onClick={() => setActiveTab('teachers')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'teachers' 
                  ? 'bg-primary-600 text-white shadow' 
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              Akademik (Mentorlar)
            </button>
          </div>
        </div>

        {activeTab === 'operators' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-dark-800 text-dark-400 text-sm">
                  <th className="pb-3 font-medium">Operator</th>
                  <th className="pb-3 font-medium text-center">Jami</th>
                  <th className="pb-3 font-medium text-center text-yellow-400">Jarayonda</th>
                  <th className="pb-3 font-medium text-center text-green-400">Muvaffaqiyatli</th>
                  <th className="pb-3 font-medium text-center text-red-400">Rad etilgan</th>
                  <th className="pb-3 font-medium text-center">SLA Buzilgan</th>
                  <th className="pb-3 font-medium text-right">Samaradorlik</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[...data.operators].sort((a, b) => {
                  const aConv = a.totalLeads > 0 ? (a.successLeads / a.totalLeads) : 0;
                  const bConv = b.totalLeads > 0 ? (b.successLeads / b.totalLeads) : 0;
                  return bConv - aConv;
                }).map((op) => {
                  const convRate = op.totalLeads > 0 ? (op.successLeads / op.totalLeads * 100) : 0;
                  let ratingColor = 'text-red-400';
                  if (convRate > 20) ratingColor = 'text-green-400';
                  else if (convRate > 10) ratingColor = 'text-yellow-400';

                  return (
                    <tr 
                      key={op.id} 
                      onClick={() => setSelectedOperatorId(op.id)}
                      className="border-b border-dark-800/50 hover:bg-dark-800/80 transition-colors cursor-pointer"
                    >
                      <td className="py-3 text-white font-medium pl-2">{op.name}</td>
                      <td className="py-3 text-center text-dark-300">{op.totalLeads}</td>
                      <td className="py-3 text-center text-yellow-500/80">{op.activeLeads || 0}</td>
                      <td className="py-3 text-center text-green-400">{op.successLeads}</td>
                      <td className="py-3 text-center text-red-400/70">{op.archivedLeads || 0}</td>
                      <td className={`py-3 text-center ${op.slaBreached > 0 ? 'text-red-500 font-bold' : 'text-dark-500'}`}>{op.slaBreached}</td>
                      <td className={`py-3 text-right font-bold pr-2 ${ratingColor}`}>
                        {convRate.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
                {data.operators.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-dark-500">
                      Ma'lumot topilmadi
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-dark-800 text-dark-400 text-sm">
                  <th className="pb-3 font-medium">Mentor / O'qituvchi</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium text-center">Roli</th>
                  <th className="pb-3 font-medium text-center">Biriktirilgan Kurslar</th>
                  <th className="pb-3 font-medium text-center">Tekshirilgan Vazifalar</th>
                  <th className="pb-3 font-medium text-right">O'rtacha Baho</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[...data.teachers].sort((a, b) => b.reviewedCount - a.reviewedCount).map((teacher) => {
                  return (
                    <tr 
                      key={teacher.id} 
                      className="border-b border-dark-800/50 hover:bg-dark-800/30 transition-colors"
                    >
                      <td className="py-3 text-white font-medium pl-2">{teacher.name}</td>
                      <td className="py-3 text-dark-300">{teacher.email}</td>
                      <td className="py-3 text-center">
                        <span className={`badge ${teacher.role === 'TEACHER' ? 'badge-success' : 'badge-progress'}`}>
                          {teacher.role === 'TEACHER' ? "O'qituvchi" : 'Mentor'}
                        </span>
                      </td>
                      <td className="py-3 text-center text-dark-300 font-semibold">{teacher.coursesCount} ta</td>
                      <td className="py-3 text-center text-emerald-400 font-bold">{teacher.reviewedCount} ta</td>
                      <td className="py-3 text-right font-bold pr-2 text-indigo-400">
                        {teacher.avgGrade} / 100
                      </td>
                    </tr>
                  );
                })}
                {(!data.teachers || data.teachers.length === 0) && (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-dark-500">
                      O'qituvchilar ma'lumoti topilmadi
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedOperatorId && (
        <OperatorActivityModal 
          operatorId={selectedOperatorId} 
          onClose={() => setSelectedOperatorId(null)} 
        />
      )}
    </div>
  );
}
