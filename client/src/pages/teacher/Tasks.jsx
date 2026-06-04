import { useState, useEffect } from 'react';
import { ClipboardList, Clock, CheckCircle2, XCircle, AlertCircle, BookOpen, Send, Calendar } from 'lucide-react';
import api from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';

export default function TeacherTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('pending'); // 'pending', 'completed', 'all'
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  
  // Report form state
  const [reportTexts, setReportTexts] = useState({}); // taskId -> report text
  const [submittingId, setSubmittingId] = useState(null);

  const { addNotification } = useNotification();

  useEffect(() => {
    fetchTasks();

    // Event listener for updates (e.g. from notification bell)
    const handleTasksUpdate = () => {
      fetchTasks();
    };
    window.addEventListener('tasks_updated', handleTasksUpdate);

    return () => {
      window.removeEventListener('tasks_updated', handleTasksUpdate);
    };
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks/operator');
      setTasks(res.data.tasks);
    } catch (error) {
      addNotification('error', "Topshiriqlarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = async (task) => {
    setExpandedTaskId(expandedTaskId === task.id ? null : task.id);
    
    // Mark as read immediately if it's unread
    if (!task.isRead) {
      try {
        await api.patch(`/tasks/operator/${task.id}/read`);
        // Refresh local tasks
        fetchTasks();
        // Notify layout bell
        window.dispatchEvent(new Event('tasks_updated'));
      } catch (error) {
        console.error('Read task error:', error);
      }
    }
  };

  const handleCompleteWithReport = async (e, taskId) => {
    e.stopPropagation();
    const reportText = reportTexts[taskId] || '';
    if (!reportText.trim()) {
      addNotification('warning', "Hisobot matnini kiritishingiz shart");
      return;
    }

    setSubmittingId(taskId);
    try {
      const res = await api.patch(`/tasks/operator/${taskId}/complete`, {
        isCompleted: true,
        reportText: reportText
      });
      addNotification('success', "Hisobot yuborildi va topshiriq bajarildi deb belgilandi");
      
      // Clear report text field
      setReportTexts(prev => {
        const copy = { ...prev };
        delete copy[taskId];
        return copy;
      });

      fetchTasks();
      window.dispatchEvent(new Event('tasks_updated'));
    } catch (error) {
      addNotification('error', "Xatolik yuz berdi");
    } finally {
      setSubmittingId(null);
    }
  };

  const handleReopenTask = async (e, taskId) => {
    e.stopPropagation();
    if (!window.confirm("Haqiqatan ham ushbu topshiriqni qayta ochmoqchimisiz? Unda yuborilgan hisobot o'chiriladi.")) return;

    setSubmittingId(taskId);
    try {
      await api.patch(`/tasks/operator/${taskId}/complete`, {
        isCompleted: false
      });
      addNotification('success', "Topshiriq qayta ochildi");
      fetchTasks();
      window.dispatchEvent(new Event('tasks_updated'));
    } catch (error) {
      addNotification('error', "Xatolik yuz berdi");
    } finally {
      setSubmittingId(null);
    }
  };

  const handleReportTextChange = (taskId, val) => {
    setReportTexts(prev => ({
      ...prev,
      [taskId]: val
    }));
  };

  const filteredTasks = tasks.filter(task => {
    if (activeFilter === 'pending') return !task.isCompleted;
    if (activeFilter === 'completed') return task.isCompleted;
    return true;
  });

  const pendingCount = tasks.filter(t => !t.isCompleted).length;
  const completedCount = tasks.filter(t => t.isCompleted).length;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Topshiriqlar Markazi</h1>
          <p className="text-dark-400 text-sm">Bosh admin tomonidan yuborilgan vazifalar va ularning hisoboti</p>
        </div>

        {/* Filters */}
        <div className="flex bg-dark-900/60 border border-dark-800 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setActiveFilter('pending')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'pending'
                ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20'
                : 'text-dark-400 hover:text-white border border-transparent'
            }`}
          >
            Bajarilmoqda
            {pendingCount > 0 && (
              <span className="ml-1 bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveFilter('completed')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'completed'
                ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20'
                : 'text-dark-400 hover:text-white border border-transparent'
            }`}
          >
            Bajarilgan
            {completedCount > 0 && (
              <span className="ml-1 bg-dark-800 text-dark-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {completedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveFilter('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'all'
                ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20'
                : 'text-dark-400 hover:text-white border border-transparent'
            }`}
          >
            Barchasi
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {loading ? (
          <div className="card glass p-8 text-center text-dark-400">Yuklanmoqda...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="card glass p-16 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-dark-800 flex items-center justify-center mb-4 text-dark-400 border border-dark-750">
              <ClipboardList className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-1">Topshiriqlar topilmadi</h3>
            <p className="text-dark-400 text-sm">
              {activeFilter === 'pending' ? "Sizda bajarilishi kutilayotgan topshiriqlar mavjud emas!" : "Hali bajarilgan topshiriqlar yo'q."}
            </p>
          </div>
        ) : (
          filteredTasks.map(task => {
            const isExpanded = expandedTaskId === task.id;
            
            return (
              <div
                key={task.id}
                onClick={() => handleTaskClick(task)}
                className={`card glass border transition-all duration-200 p-0 overflow-hidden ${
                  !task.isRead 
                    ? 'border-emerald-500/40 bg-emerald-950/5 hover:border-emerald-500/60' 
                    : 'border-dark-800 hover:border-dark-700'
                }`}
              >
                {/* Header row */}
                <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`font-semibold text-base ${task.isCompleted ? 'text-dark-500 line-through' : 'text-white'}`}>
                        {task.title}
                      </h4>
                      {!task.isRead && (
                        <span className="bg-emerald-500 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                          Yangi
                        </span>
                      )}
                    </div>
                    <p className={`text-sm mt-1 leading-relaxed ${isExpanded ? 'text-dark-200' : 'text-dark-400 line-clamp-1'}`}>
                      {task.description}
                    </p>
                    <span className="text-[10px] text-dark-500 block pt-1">
                      Yuborilgan vaqt: {new Date(task.createdAt).toLocaleString('uz-UZ')}
                    </span>
                  </div>

                  {/* Metadata */}
                  <div className="flex sm:flex-col items-start sm:items-end gap-2 shrink-0 w-full sm:w-auto border-t border-dark-800/40 sm:border-none pt-3 sm:pt-0">
                    {task.dueDate && (
                      <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Muddat: {new Date(task.dueDate).toLocaleDateString('uz-UZ')}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
                      task.isCompleted 
                        ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                      {task.isCompleted ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {task.isCompleted ? "Bajarildi" : "Kutilmoqda"}
                    </span>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-dark-800 bg-dark-900/30 p-5 space-y-4">
                    {/* Instructions */}
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-dark-400 uppercase tracking-wider">Topshiriq tavsifi</p>
                      <p className="text-white text-sm bg-dark-950/40 p-3 rounded-lg border border-dark-800 leading-relaxed">
                        {task.description}
                      </p>
                    </div>

                    {/* Report Form */}
                    {!task.isCompleted ? (
                      <div className="space-y-3" onClick={e => e.stopPropagation()}>
                        <label className="label text-xs uppercase tracking-wider font-bold">Bajarilganlik haqida hisobot</label>
                        <textarea
                          rows="3"
                          required
                          value={reportTexts[task.id] || ''}
                          onChange={e => handleReportTextChange(task.id, e.target.value)}
                          placeholder="Topshiriq qanday bajarilgani haqida hisobot matnini yozing..."
                          className="input bg-dark-850 h-24 resize-none py-2 text-sm"
                        />
                        <div className="flex justify-end">
                          <button
                            onClick={(e) => handleCompleteWithReport(e, task.id)}
                            disabled={submittingId === task.id}
                            className="btn-primary py-2 px-4 text-xs font-semibold gap-1.5 shadow-[0_0_15px_-3px_rgba(16,185,129,0.25)]"
                          >
                            <span>{submittingId === task.id ? "Yuborilmoqda..." : "Hisobot yuborish va yakunlash"}</span>
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Submitted report viewer */
                      <div className="space-y-3">
                        <div className="bg-green-500/5 border border-green-500/10 p-4 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-green-400 uppercase tracking-wider flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" /> Bajarilganlik hisoboti yuborilgan
                            </span>
                            {task.completedAt && (
                              <span className="text-[10px] text-dark-500">
                                {new Date(task.completedAt).toLocaleString('uz-UZ')}
                              </span>
                            )}
                          </div>
                          <p className="text-dark-200 text-sm italic">
                            "{task.reportText || "Hisobot matni kiritilmagan"}"
                          </p>
                        </div>

                        <div className="flex justify-end" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleReopenTask(e, task.id)}
                            disabled={submittingId === task.id}
                            className="btn bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            {submittingId === task.id ? "Kutilmoqda..." : "Topshiriqni qayta ochish"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
