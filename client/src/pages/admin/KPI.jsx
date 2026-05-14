import { useState, useEffect } from 'react';
import { TrendingUp, Award, AlertCircle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';

export default function KPI() {
  const [kpiData, setKpiData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addNotification } = useNotification();

  useEffect(() => {
    fetchKPI();
  }, []);

  const fetchKPI = async () => {
    try {
      const res = await api.get('/admin/kpi');
      setKpiData(res.data.kpi);
    } catch (error) {
      addNotification('error', "KPI ma'lumotlarini yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const chartData = kpiData.map(d => ({
    name: d.name.split(' ')[0],
    'Muvaffaqiyatli': d.successCount,
    'SLA Buzilgan': d.slaBreachedCount,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">KPI va Samaradorlik</h1>
        <p className="text-dark-400 text-sm">Operatorlar ish unumdorligi tahlili va reytingi</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top Performer */}
        <div className="lg:col-span-1 card glass bg-gradient-to-br from-dark-900 to-primary-900/20 border-primary-500/30">
          <div className="flex items-center gap-2 text-primary-400 mb-6">
            <Award className="w-5 h-5" />
            <h3 className="font-semibold text-white">Eng yaxshi operator</h3>
          </div>
          
          {loading ? (
            <div className="animate-pulse flex space-x-4">
              <div className="rounded-full bg-dark-700 h-16 w-16"></div>
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-dark-700 rounded w-3/4"></div>
                <div className="h-4 bg-dark-700 rounded w-1/2"></div>
              </div>
            </div>
          ) : kpiData.length > 0 ? (
            (() => {
              const best = [...kpiData].sort((a, b) => parseFloat(b.conversionRate) - parseFloat(a.conversionRate))[0];
              return (
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-primary-500/20 border-2 border-primary-500 mx-auto flex items-center justify-center text-2xl font-bold text-primary-400 mb-4 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                    {best.name.charAt(0)}
                  </div>
                  <h4 className="text-xl font-bold text-white">{best.name}</h4>
                  <p className="text-primary-400 font-medium mb-4">{best.conversionRate}% Konversiya</p>
                  
                  <div className="grid grid-cols-2 gap-4 border-t border-dark-700 pt-4">
                    <div>
                      <p className="text-dark-400 text-xs mb-1">Muvaffaqiyatli</p>
                      <p className="text-white font-semibold">{best.successCount}</p>
                    </div>
                    <div>
                      <p className="text-dark-400 text-xs mb-1">SLA Buzilgan</p>
                      <p className="text-white font-semibold">{best.slaBreachedCount}</p>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="text-center text-dark-500">Ma'lumot yo'q</div>
          )}
        </div>

        {/* Chart */}
        <div className="lg:col-span-2 card glass">
          <h3 className="text-lg font-semibold text-white mb-6">Sotuvlar vs SLA (Joriy oy)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Bar dataKey="Muvaffaqiyatli" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="SLA Buzilgan" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Detail Table */}
      <div className="card glass p-0 overflow-hidden">
        <div className="p-4 border-b border-dark-800 bg-dark-900/50 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-white">To'liq reyting</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-dark-900 border-b border-dark-800 text-dark-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Operator</th>
                <th className="px-6 py-4 font-medium text-center">Biriktirilgan Lidlar</th>
                <th className="px-6 py-4 font-medium text-center">Muvaffaqiyatli (Sotuv)</th>
                <th className="px-6 py-4 font-medium text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3 text-red-400" /> SLA Qoidabuzarlik
                  </div>
                </th>
                <th className="px-6 py-4 font-medium text-right">Konversiya</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-dark-800/50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-dark-400">Yuklanmoqda...</td>
                </tr>
              ) : kpiData.map((d, i) => (
                <tr key={d.id} className="hover:bg-dark-800/30 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      i === 0 ? 'bg-yellow-500/20 text-yellow-500' : 
                      i === 1 ? 'bg-gray-400/20 text-gray-400' : 
                      i === 2 ? 'bg-orange-600/20 text-orange-600' : 'bg-dark-800 text-dark-400'
                    }`}>
                      #{i + 1}
                    </div>
                    <div>
                      <p className="text-white font-medium">{d.name}</p>
                      <p className="text-xs text-dark-400">{d.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-dark-300 font-medium">{d.totalAssigned}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                      {d.successCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {d.slaBreachedCount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                        <AlertCircle className="w-3 h-3" /> {d.slaBreachedCount} marta
                      </span>
                    ) : (
                      <span className="text-dark-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-dark-800 rounded-full overflow-hidden hidden sm:block">
                        <div 
                          className="h-full bg-primary-500" 
                          style={{ width: `${Math.min(100, d.conversionRate)}%` }}
                        />
                      </div>
                      <span className="font-bold text-white">{d.conversionRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
