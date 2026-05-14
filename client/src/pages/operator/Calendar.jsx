import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Phone, User, Clock, CheckCircle } from 'lucide-react';
import api from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';
import LeadModal from '../../components/LeadModal';

export default function Calendar() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const { addNotification } = useNotification();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await api.get('/leads/schedule/today');
      setTasks(res.data.leads);
    } catch (error) {
      addNotification('error', "Vazifalarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Vazifalar Taqvimi</h1>
        <p className="text-dark-400 text-sm">Bugun bog'lanish kerak bo'lgan mijozlar ro'yxati</p>
      </div>

      <div className="card glass flex-1 overflow-hidden flex flex-col p-0">
        <div className="p-4 border-b border-dark-800 bg-dark-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary-400 font-medium">
            <CalendarIcon className="w-5 h-5" />
            <span>Bugungi vazifalar</span>
          </div>
          <span className="bg-primary-500/20 text-primary-400 px-3 py-1 rounded-full text-sm font-semibold">
            {tasks.length} ta vazifa
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center text-dark-400 py-8">Yuklanmoqda...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-16 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-1">Barcha vazifalar bajarilgan</h3>
              <p className="text-dark-400 text-sm">Bugun uchun rejalashtirilgan mijozlar qolmadi.</p>
            </div>
          ) : (
            tasks.map(lead => (
              <div 
                key={lead.id} 
                onClick={() => setSelectedLeadId(lead.id)}
                className="bg-dark-800/80 border border-dark-700 hover:border-primary-500/50 p-4 rounded-xl cursor-pointer transition-all duration-200 group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center text-dark-300 group-hover:bg-primary-500/20 group-hover:text-primary-400 transition-colors">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">{lead.name}</h4>
                    <div className="flex items-center gap-3 text-xs text-dark-400">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {lead.phone}</span>
                      <span className="w-1 h-1 rounded-full bg-dark-600" />
                      <span className="flex items-center gap-1 text-primary-400">{lead.courseInterest}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                  <div className="bg-dark-900 px-3 py-1.5 rounded-lg border border-dark-700 flex flex-col sm:items-end flex-1 sm:flex-none">
                    <span className="text-[10px] text-dark-500 uppercase tracking-wider font-semibold mb-0.5">Vaqt</span>
                    <span className="text-sm font-medium text-yellow-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(lead.nextContactDate).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <button className="btn-primary sm:flex-none whitespace-nowrap">
                    Lidni ochish
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedLeadId && (
        <LeadModal 
          leadId={selectedLeadId} 
          onClose={() => setSelectedLeadId(null)} 
          onUpdate={fetchTasks} 
        />
      )}
    </div>
  );
}
