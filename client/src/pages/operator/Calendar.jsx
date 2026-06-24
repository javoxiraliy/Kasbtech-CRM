import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Phone, User, Clock, CheckCircle, ListTodo, ShieldAlert, BookOpen, AlertCircle, Sparkles, Image, File, ExternalLink, FileText, FileSpreadsheet } from 'lucide-react';
import api from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';
import LeadModal from '../../components/LeadModal';

export default function Calendar() {
  // Tabs: 'calls' (scheduled calls) or 'tasks' (admin tasks)
  const [activeTab, setActiveTab] = useState('calls');
  
  const [calls, setCalls] = useState([]);
  const [adminTasks, setAdminTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const { addNotification } = useNotification();

  const getAttachmentUrl = (path) => {
    if (!path) return '';
    const base = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace('/api', '') 
      : (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);
    return `${base}${path}`;
  };

  const getFileName = (url) => {
    return url.split('/').pop().substring(14); // Remove unique prefix timestamp
  };

  const getFileIcon = (url) => {
    const ext = url.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return <Image className="w-4 h-4 text-pink-400 shrink-0" />;
    }
    if (ext === 'pdf') {
      return <File className="w-4 h-4 text-red-400 shrink-0" />;
    }
    if (['doc', 'docx'].includes(ext)) {
      return <FileText className="w-4 h-4 text-blue-400 shrink-0" />;
    }
    if (['xls', 'xlsx'].includes(ext)) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
    return <File className="w-4 h-4 text-dark-300 shrink-0" />;
  };

  useEffect(() => {
    fetchScheduledCalls();
    fetchAdminTasks();
  }, []);

  const fetchScheduledCalls = async () => {
    try {
      const res = await api.get('/leads/schedule/today');
      setCalls(res.data.leads);
    } catch (error) {
      addNotification('error', "Bugungi vazifalarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminTasks = async () => {
    try {
      const res = await api.get('/tasks/operator');
      setAdminTasks(res.data.tasks);
    } catch (error) {
      console.error('Fetch admin tasks error:', error);
    }
  };

  const handleTaskClick = async (task) => {
    // Expand task details
    setExpandedTaskId(expandedTaskId === task.id ? null : task.id);
    
    // Mark as read immediately in the DB if unread
    if (!task.isRead) {
      try {
        await api.patch(`/tasks/operator/${task.id}/read`);
        // Refresh local task list
        fetchAdminTasks();
        
        // Dispatch an event to let the layout know notifications might have changed
        window.dispatchEvent(new Event('tasks_updated'));
      } catch (error) {
        console.error('Read task error:', error);
      }
    }
  };

  const handleToggleComplete = async (e, taskId) => {
    e.stopPropagation(); // prevent expanding/collapsing when checking/unchecking
    try {
      const res = await api.patch(`/tasks/operator/${taskId}/complete`);
      addNotification('success', res.data.task.isCompleted ? "Topshiriq bajarildi deb belgilandi" : "Topshiriq qayta ochildi");
      fetchAdminTasks();
    } catch (error) {
      addNotification('error', "Xatolik yuz berdi");
    }
  };

  const unreadTasksCount = adminTasks.filter(t => !t.isRead).length;

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Vazifalar Taqvimi</h1>
          <p className="text-dark-400 text-sm">
            {activeTab === 'calls' ? "Bugun bog'lanish kerak bo'lgan mijozlar ro'yxati" : "Admin tomonidan yuborilgan yozma topshiriqlar ro'yxati"}
          </p>
        </div>

        {/* Tab switch control */}
        <div className="flex bg-dark-900/60 border border-dark-800 p-1.5 rounded-xl shrink-0">
          <button
            onClick={() => setActiveTab('calls')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'calls'
                ? 'bg-primary-600/10 text-primary-400 border border-primary-500/20'
                : 'text-dark-400 hover:text-white border border-transparent'
            }`}
          >
            <Phone className="w-4 h-4" />
            Mijozlar bilan bog'lanish
            {calls.length > 0 && (
              <span className="ml-1 bg-primary-500/20 text-primary-400 text-xs px-2 py-0.5 rounded-full font-bold">
                {calls.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all relative ${
              activeTab === 'tasks'
                ? 'bg-primary-600/10 text-primary-400 border border-primary-500/20'
                : 'text-dark-400 hover:text-white border border-transparent'
            }`}
          >
            <ListTodo className="w-4 h-4" />
            Admin Vazifalari
            {unreadTasksCount > 0 && (
              <span className="animate-pulse bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-extrabold flex items-center justify-center shrink-0">
                {unreadTasksCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="card glass flex-1 overflow-hidden flex flex-col p-0">
        <div className="p-4 border-b border-dark-800 bg-dark-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary-400 font-medium">
            {activeTab === 'calls' ? <CalendarIcon className="w-5 h-5" /> : <ListTodo className="w-5 h-5" />}
            <span>{activeTab === 'calls' ? "Bugungi mijozlar qo'ng'iroqlari" : "Admin vazifalar ro'yxati"}</span>
          </div>
          <span className="bg-primary-500/20 text-primary-400 px-3 py-1 rounded-full text-sm font-semibold">
            {activeTab === 'calls' ? `${calls.length} ta aloqa` : `${adminTasks.length} ta topshiriq`}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center text-dark-400 py-8">Yuklanmoqda...</div>
          ) : activeTab === 'calls' ? (
            /* Calls Checklist view */
            calls.length === 0 ? (
              <div className="text-center py-16 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4 border border-green-500/25">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-lg font-medium text-white mb-1">Barcha qo'ng'iroqlar bajarilgan</h3>
                <p className="text-dark-400 text-sm">Bugun uchun rejalashtirilgan mijozlar qolmadi.</p>
              </div>
            ) : (
              calls.map(lead => (
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
                        <a 
                          href={`tel:${lead.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-primary-400 hover:text-primary-300 hover:underline transition-colors font-medium"
                        >
                          <Phone className="w-3 h-3" /> {lead.phone}
                        </a>
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
            )
          ) : (
            /* Admin Tasks view */
            adminTasks.length === 0 ? (
              <div className="text-center py-16 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-dark-800 flex items-center justify-center mb-4 border border-dark-750">
                  <Sparkles className="w-8 h-8 text-dark-400" />
                </div>
                <h3 className="text-lg font-medium text-white mb-1">Hech qanday topshiriq yo'q</h3>
                <p className="text-dark-400 text-sm">Admin sizga hali topshiriq yubormagan.</p>
              </div>
            ) : (
              adminTasks.map(task => {
                const isExpanded = expandedTaskId === task.id;
                
                return (
                  <div
                    key={task.id}
                    onClick={() => handleTaskClick(task)}
                    className={`bg-dark-800/80 border transition-all duration-200 rounded-xl cursor-pointer p-4 space-y-3 ${
                      !task.isRead 
                        ? 'border-blue-500/40 bg-blue-900/5 hover:border-blue-500/60' 
                        : 'border-dark-700 hover:border-primary-500/50'
                    }`}
                  >
                    <div className="flex items-start gap-4 justify-between">
                      <div className="flex items-start gap-3.5 min-w-0">
                        {/* Custom visual checkbox */}
                        <button
                          onClick={(e) => handleToggleComplete(e, task.id)}
                          className={`mt-1 w-5.5 h-5.5 rounded-md border flex items-center justify-center shrink-0 transition-all duration-200 ${
                            task.isCompleted
                              ? 'bg-green-500 border-green-500 text-white shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                              : 'border-dark-600 hover:border-primary-500'
                          }`}
                        >
                          {task.isCompleted && <CheckCircle className="w-4.5 h-4.5" />}
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className={`font-semibold text-sm ${task.isCompleted ? 'text-dark-500 line-through' : 'text-white'}`}>
                              {task.title}
                            </h4>
                            {!task.isRead && (
                              <span className="bg-blue-500 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                Yangi
                              </span>
                            )}
                          </div>
                          <p className={`text-xs mt-1 leading-relaxed ${isExpanded ? 'text-dark-200' : 'text-dark-400 line-clamp-1'}`}>
                            {task.description}
                          </p>
                        </div>
                      </div>

                      {/* Right metadata badge */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-[10px] text-dark-500 font-semibold">
                          {new Date(task.createdAt).toLocaleDateString('uz-UZ')}
                        </span>
                        {task.dueDate && (
                          <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded text-[9px] font-medium flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(task.dueDate).toLocaleDateString('uz-UZ')} gacha
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expandable details details drawer */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-dark-700/50 space-y-3">
                        {/* Render attachments for this task */}
                        {task.attachmentUrls && task.attachmentUrls.length > 0 && (
                          <div className="space-y-1.5 border-b border-dark-700/50 pb-3">
                            <p className="text-[10px] text-dark-400 uppercase font-bold tracking-wider">Topshiriq fayllari:</p>
                            <div className="flex flex-wrap gap-2">
                              {task.attachmentUrls.map((url, uidx) => {
                                const fileName = getFileName(url);
                                return (
                                  <div key={uidx} className="flex items-center justify-between gap-3 p-1.5 bg-dark-900/35 rounded-xl border border-dark-800 text-[11px] min-w-[150px] max-w-[240px]">
                                    <span className="text-dark-200 truncate flex items-center gap-1.5" title={fileName}>
                                      {getFileIcon(url)}
                                      {fileName || `Fayl_${uidx + 1}`}
                                    </span>
                                    <a 
                                      href={getAttachmentUrl(url)} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-primary-400 hover:text-white p-1 shrink-0"
                                      title="Ko'rish"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <span className="text-dark-500 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5" />
                          Topshiriq ko'rildi va o'qilgan deb belgilandi
                        </span>
                        <button
                          onClick={(e) => handleToggleComplete(e, task.id)}
                          className={`btn text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1.5 self-end sm:self-auto ${
                            task.isCompleted
                              ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20'
                              : 'bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20'
                          }`}
                        >
                          {task.isCompleted ? "Bajarilmagan deb belgilash" : "Bajarildi deb belgilash"}
                        </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )
          )}
        </div>
      </div>

      {selectedLeadId && (
        <LeadModal 
          leadId={selectedLeadId} 
          onClose={() => setSelectedLeadId(null)} 
          onUpdate={fetchScheduledCalls} 
        />
      )}
    </div>
  );
}

