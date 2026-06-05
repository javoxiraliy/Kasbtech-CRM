import { useState, useEffect } from 'react';
import { Plus, CheckCircle, XCircle, Users, Clock, Send, Eye, BookOpen, AlertCircle, X, ChevronDown, ChevronUp, Smartphone, Paperclip, Image, File, ExternalLink, Loader2, FileText, FileSpreadsheet } from 'lucide-react';
import api from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedTask, setExpandedTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    sendToAll: true,
    selectedOperatorIds: []
  });

  const { addNotification } = useNotification();

  // Attachment states
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);

  const getAttachmentUrl = (path) => {
    if (!path) return '';
    const base = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';
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

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await api.post('/reports/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        setAttachments(prev => [...prev, { url: res.data.url, name: res.data.name }]);
        addNotification('success', `"${file.name}" muvaffaqiyatli yuklandi`);
      } catch (error) {
        addNotification('error', `"${file.name}" yuklashda xatolik: ` + (error.response?.data?.error || error.message));
      }
    }
    setUploading(false);
    e.target.value = ''; // clear input
  };

  const handleRemoveAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    fetchTasksAndOperators();
  }, []);

  const fetchTasksAndOperators = async () => {
    setLoading(true);
    try {
      const [tasksRes, usersRes] = await Promise.all([
        api.get('/tasks/admin'),
        api.get('/admin/users')
      ]);
      setTasks(tasksRes.data.tasks);
      // Filter out admins, we only want operators, teachers and SMM
      const ops = usersRes.data.users.filter(u => ['OPERATOR', 'TEACHER', 'SMM'].includes(u.role) && u.isActive);
      setOperators(ops);
    } catch (error) {
      addNotification('error', "Ma'lumotlarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOperator = (opId) => {
    setFormData(prev => {
      const isSelected = prev.selectedOperatorIds.includes(opId);
      const newIds = isSelected 
        ? prev.selectedOperatorIds.filter(id => id !== opId)
        : [...prev.selectedOperatorIds, opId];
      return {
        ...prev,
        selectedOperatorIds: newIds,
        sendToAll: newIds.length === 0 ? true : prev.sendToAll
      };
    });
  };

  const handleSendToAllChange = (val) => {
    setFormData(prev => ({
      ...prev,
      sendToAll: val,
      selectedOperatorIds: val ? [] : prev.selectedOperatorIds
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      addNotification('error', "Sarlavha va batafsil ma'lumot majburiy");
      return;
    }

    if (!formData.sendToAll && formData.selectedOperatorIds.length === 0) {
      addNotification('error', "Kamida bitta operatorni tanlashingiz kerak");
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/tasks/admin', {
        title: formData.title,
        description: formData.description,
        dueDate: formData.dueDate || null,
        operatorIds: formData.sendToAll ? 'all' : formData.selectedOperatorIds,
        attachmentUrls: attachments.map(a => a.url)
      });

      addNotification('success', "Yozma vazifa muvaffaqiyatli yuborildi");
      setIsModalOpen(false);
      setFormData({
        title: '',
        description: '',
        dueDate: '',
        sendToAll: true,
        selectedOperatorIds: []
      });
      setAttachments([]);
      fetchTasksAndOperators();
    } catch (error) {
      addNotification('error', error.response?.data?.error || "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleExpand = (taskIndex) => {
    setExpandedTask(expandedTask === taskIndex ? null : taskIndex);
  };

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Vazifalar Boshqaruvi</h1>
          <p className="text-dark-400 text-sm">Operatorlarga yozma topshiriqlar yuborish va ularning bajarilishini kuzatish</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-5 h-5" />
          Yangi vazifa
        </button>
      </div>

      {/* Main List */}
      <div className="space-y-4">
        {loading ? (
          <div className="card glass p-8 text-center text-dark-400">Yuklanmoqda...</div>
        ) : tasks.length === 0 ? (
          <div className="card glass p-16 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-dark-800 flex items-center justify-center mb-4 text-dark-400 border border-dark-750">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-white mb-1">Hozircha vazifalar mavjud emas</h3>
            <p className="text-dark-400 text-sm max-w-md">Operatorlarga hali hech qanday yozma topshiriq yuborilmagan. Topshiriq yuborish uchun "Yangi vazifa" tugmasini bosing.</p>
          </div>
        ) : (
          tasks.map((task, index) => {
            const isExpanded = expandedTask === index;
            const compPercent = Math.round((task.completed / task.total) * 100);
            const readPercent = Math.round((task.read / task.total) * 100);

            return (
              <div key={index} className="card glass border-dark-800 hover:border-dark-700 transition-all p-0 overflow-hidden">
                {/* Header row */}
                <div 
                  onClick={() => toggleExpand(index)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-dark-900/10 transition-colors"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-white text-lg font-semibold tracking-tight">{task.title}</h4>
                      {task.dueDate && (
                        <span className="bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Muddati: {new Date(task.dueDate).toLocaleDateString('uz-UZ')}
                        </span>
                      )}
                      <span className="bg-dark-800 border border-dark-700 text-dark-300 px-2 py-0.5 rounded text-[11px] font-semibold">
                        {task.total} xodim
                      </span>
                    </div>
                    <p className="text-dark-300 text-sm line-clamp-2 md:max-w-2xl">{task.description}</p>
                    <span className="text-[10px] text-dark-500 block pt-1">Yuborilgan vaqt: {new Date(task.createdAt).toLocaleString('uz-UZ')}</span>
                  </div>

                  {/* Progress Indicators */}
                  <div className="flex items-center gap-6 self-stretch md:self-auto justify-between border-t border-dark-800/40 md:border-none pt-3 md:pt-0">
                    <div className="flex gap-4">
                      {/* Read progress */}
                      <div className="text-left">
                        <span className="text-[10px] text-dark-500 block uppercase font-bold tracking-wider mb-1">O'qildi</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-dark-850 h-1.5 rounded-full overflow-hidden border border-dark-800">
                            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${readPercent}%` }}></div>
                          </div>
                          <span className="text-xs text-blue-400 font-bold whitespace-nowrap">{task.read}/{task.total}</span>
                        </div>
                      </div>

                      {/* Completed progress */}
                      <div className="text-left">
                        <span className="text-[10px] text-dark-500 block uppercase font-bold tracking-wider mb-1">Bajarildi</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-dark-850 h-1.5 rounded-full overflow-hidden border border-dark-800">
                            <div className="bg-green-500 h-full rounded-full" style={{ width: `${compPercent}%` }}></div>
                          </div>
                          <span className="text-xs text-green-400 font-bold whitespace-nowrap">{task.completed}/{task.total}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-dark-400 p-1 hover:text-white rounded-lg hover:bg-dark-800/50 transition-colors">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded operators detail list */}
                {isExpanded && (
                  <div className="border-t border-dark-800 bg-dark-900/30 p-5 space-y-4">
                    {/* Render attachments for this task */}
                    {task.attachmentUrls && task.attachmentUrls.length > 0 && (
                      <div className="space-y-1.5 shrink-0 border-b border-dark-800 pb-3">
                        <p className="text-[10px] text-dark-400 uppercase font-bold tracking-wider mb-1">Biriktirilgan topshiriq fayllari:</p>
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

                    <h5 className="text-xs font-bold text-dark-400 uppercase tracking-wider mb-2">Xodimlar qamrovi va hisobotlari</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {task.operators.map((op, opIdx) => (
                        <div key={opIdx} className="bg-dark-800/50 border border-dark-750/70 px-4 py-3 rounded-xl flex flex-col gap-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-white text-sm font-medium truncate">{op.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-[9px] font-bold px-1 rounded border ${
                                  op.role === 'TEACHER' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
                                  op.role === 'SMM' ? 'bg-pink-500/10 border-pink-500/20 text-pink-400' :
                                  'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                }`}>
                                  {op.role === 'TEACHER' ? "O'qituvchi" : op.role === 'SMM' ? 'SMM' : 'Operator'}
                                </span>
                                <p className="text-dark-500 text-[10px] truncate">{op.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border flex items-center gap-1 ${
                                op.isRead 
                                  ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' 
                                  : 'bg-dark-900/60 border-dark-700 text-dark-500'
                              }`}>
                                {op.isRead ? <BookOpen className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                                {op.isRead ? "O'qildi" : "Ko'rilmadi"}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border flex items-center gap-1 ${
                                op.isCompleted 
                                  ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                                  : 'bg-red-500/10 border-red-500/20 text-red-400'
                              }`}>
                                {op.isCompleted ? <CheckCircle className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                                {op.isCompleted ? "Bajardi" : "Bajarilmadi"}
                              </span>
                            </div>
                          </div>
                          
                          {op.isCompleted && op.reportText && (
                            <div className="bg-dark-900/60 border border-dark-850 p-2.5 rounded-lg text-xs space-y-1">
                              <p className="text-dark-400 font-bold uppercase text-[9px] tracking-wider">Hisobot:</p>
                              <p className="text-white italic">"{op.reportText}"</p>
                              {op.completedAt && (
                                <span className="text-[9px] text-dark-500 block pt-0.5">Bajarilgan vaqt: {new Date(op.completedAt).toLocaleString('uz-UZ')}</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modern Glass Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in">
          <div className="card glass w-full max-w-2xl p-6 relative overflow-hidden border border-dark-800 shadow-2xl">
            
            {/* Cross button */}
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-4 right-4 text-dark-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-dark-850"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Send className="w-5 h-5 text-primary-400" />
              Yangi yozma topshiriq yuborish
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Task Title */}
              <div>
                <label className="label">Topshiriq sarlavhasi</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Kun yakunigacha barcha SLA buzilgan lidlarni yopish"
                  className="input bg-dark-850"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              {/* Task description */}
              <div>
                <label className="label">Batafsil ma'lumot va yo'riqnomalar</label>
                <textarea
                  required
                  rows="3"
                  placeholder="Vazifa bo'yicha tushuntirish va ko'rsatmalarni shu yerda yozib qoldiring..."
                  className="input bg-dark-850 h-28 resize-none py-2"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="label">Muddati (ixtiyoriy)</label>
                <input
                  type="date"
                  className="input bg-dark-850 text-white"
                  value={formData.dueDate}
                  onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>

              {/* Recipient toggle */}
              <div>
                <label className="label mb-2">Kimga yuboriladi?</label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    className={`flex-1 py-3 px-4 rounded-xl border font-medium flex items-center justify-center gap-2 transition-all ${
                      formData.sendToAll 
                        ? 'bg-primary-600/10 border-primary-500 text-primary-400 shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)]' 
                        : 'bg-dark-850 border-dark-800 text-dark-400 hover:text-white hover:border-dark-700'
                    }`}
                    onClick={() => handleSendToAllChange(true)}
                  >
                    <Users className="w-4 h-4" />
                    Barcha xodimlarga ({operators.length} ta)
                  </button>

                  <button
                    type="button"
                    className={`flex-1 py-3 px-4 rounded-xl border font-medium flex items-center justify-center gap-2 transition-all ${
                      !formData.sendToAll 
                        ? 'bg-primary-600/10 border-primary-500 text-primary-400 shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)]' 
                        : 'bg-dark-850 border-dark-800 text-dark-400 hover:text-white hover:border-dark-700'
                    }`}
                    onClick={() => handleSendToAllChange(false)}
                  >
                    <Users className="w-4 h-4" />
                    Tanlangan xodimlarga
                  </button>
                </div>
              </div>

              {/* Operator select grid */}
              {!formData.sendToAll && (
                <div className="space-y-2 animate-fade-in">
                  <label className="label text-xs">Operatorlarni tanlang:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1 bg-dark-900/40 border border-dark-800/85 rounded-xl">
                    {operators.map(op => {
                      const isSelected = formData.selectedOperatorIds.includes(op.id);
                      return (
                        <div
                          key={op.id}
                          onClick={() => handleToggleOperator(op.id)}
                          className={`cursor-pointer px-3 py-2.5 rounded-lg border flex items-center gap-2.5 transition-all select-none ${
                            isSelected 
                              ? 'bg-primary-500/10 border-primary-500 text-primary-400 shadow-[0_0_10px_-2px_rgba(59,130,246,0.2)]'
                              : 'bg-dark-850 border-dark-800 text-dark-300 hover:bg-dark-800 hover:border-dark-700'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSelected ? 'bg-primary-600/20 text-primary-400' : 'bg-dark-700 text-dark-400'
                          }`}>
                            {op.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold truncate leading-tight">{op.name}</p>
                            <span className="text-[9px] text-dark-500 block uppercase tracking-wider">{op.role === 'TEACHER' ? "O'qituvchi" : op.role === 'SMM' ? 'SMM' : 'Operator'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* File upload area */}
              <div className="space-y-3">
                <label className="label mb-0">Fayl biriktirish (Rasm, PDF, Word, Excel)</label>
                <div className="flex items-center gap-3">
                  <label 
                    htmlFor="task-files-upload"
                    className="flex items-center gap-2 cursor-pointer bg-dark-850 border border-dark-800 hover:border-dark-700 hover:bg-dark-800 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-all select-none"
                  >
                    <Paperclip className="w-4 h-4 text-primary-400" />
                    Hujjat yuklash
                  </label>
                  <input 
                    type="file" 
                    id="task-files-upload" 
                    multiple 
                    accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.doc,.docx,.xls,.xlsx" 
                    className="hidden" 
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                  {uploading && (
                    <span className="text-xs text-dark-400 flex items-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                      Fayl yuklanmoqda...
                    </span>
                  )}
                </div>

                {/* Uploaded files preview list */}
                {attachments.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 p-2 bg-dark-850 border border-dark-800 rounded-lg text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          {getFileIcon(file.url)}
                          <span className="text-white truncate" title={file.name}>
                            {file.name}
                          </span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => handleRemoveAttachment(idx)}
                          className="text-dark-400 hover:text-red-400 p-1 rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 btn-secondary justify-center py-2.5 text-sm"
                  disabled={submitting}
                >
                  Bekor qilish
                </button>
                <button 
                  type="submit" 
                  className="flex-1 btn-primary justify-center py-2.5 text-sm gap-2"
                  disabled={submitting}
                >
                  {submitting ? "Yuborilmoqda..." : "Yuborish"}
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
