import { useState, useEffect } from 'react';
import { X, Phone, Clock, FileText, Send, User, Briefcase, GraduationCap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { uz } from 'date-fns/locale';
import api from '../lib/api';
import { useNotification } from '../contexts/NotificationContext';

const COURSE_LABELS = {
  VIDEOGRAPHY: 'Videomontaj "videografiya"',
  SMM: 'SMM',
  TARGET_PRO: 'Target pro',
  COMPUTER_GRAPHICS: 'Kompyuter grafikasi',
  COMPUTER_LITERACY: 'Kompyuter savodxonligi',
  GRAPHIC_DESIGN: 'Grafik dizayn',
  AUTOCAD: 'AutoCAD',
  THREE_D_MAX: '3D MAX',
  OTHER: 'Boshqa',
  VIDEO_EDITING: 'Video montaj',
  WEB_DEVELOPMENT: 'Web dasturlash',
  PYTHON: 'Python'
};

const EMPLOYMENT_LABELS = {
  UNEMPLOYED: 'Ishsiz',
  EMPLOYED_OFFICIAL: 'Rasmiy band',
  EMPLOYED_UNOFFICIAL: 'Rasmiy band emas',
  STUDENT: 'Talaba',
  STUDENT_EXTERNAL: 'Talaba "sirtqi"',
  SCHOOL_STUDENT: 'Maktab o\'quvchisi',
  HOUSEWIFE: 'Uy bekasi',
  employed: 'Ishlaydi',
  unemployed: 'Ishsiz',
  housewife: 'Uy bekasi',
  student: 'Talaba'
};

export default function LeadModal({ leadId, onClose, onUpdate }) {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showCourseSelector, setShowCourseSelector] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedEmploymentStatus, setSelectedEmploymentStatus] = useState('');
  const { addNotification } = useNotification();

  useEffect(() => {
    fetchLead();
  }, [leadId]);

  const fetchLead = async () => {
    try {
      const res = await api.get(`/leads/${leadId}`);
      setLead(res.data.lead);
      setSelectedCourse(res.data.lead.courseInterest || 'OTHER');
      setSelectedEmploymentStatus(res.data.lead.employmentStatus || 'UNEMPLOYED');
    } catch (error) {
      addNotification('error', "Lid ma'lumotlarini yuklashda xatolik");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    
    setSubmitting(true);
    try {
      const res = await api.post('/comments', {
        content: comment,
        leadId: lead.id,
      });
      setLead(prev => ({
        ...prev,
        comments: [res.data.comment, ...prev.comments]
      }));
      setComment('');
      addNotification('success', "Izoh qo'shildi");
    } catch (error) {
      addNotification('error', "Izoh qo'shishda xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await api.patch(`/leads/${lead.id}`, { status: newStatus });
      addNotification('success', "Holat o'zgartirildi");
      onUpdate();
      onClose();
    } catch (error) {
      addNotification('error', "Xatolik yuz berdi");
    }
  };

  const handleConfirmInProgress = async () => {
    setSubmitting(true);
    try {
      await api.patch(`/leads/${lead.id}`, { 
        status: 'IN_PROGRESS',
        courseInterest: selectedCourse,
        employmentStatus: selectedEmploymentStatus
      });
      addNotification('success', "Lid jarayonga olindi va ma'lumotlari belgilandi");
      onUpdate();
      onClose();
    } catch (error) {
      addNotification('error', "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !lead) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
        <div className="card glass p-8 flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-white">Yuklanmoqda...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in">
      <div className="card glass w-full max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl relative">
        
        {/* Header */}
        <div className="p-4 border-b border-dark-800 bg-dark-900/50 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">{lead.name}</h2>
            <div className="flex flex-col gap-1.5 text-sm text-dark-300 mt-2">
              <a 
                href={`tel:${lead.phone}`} 
                className="flex items-center gap-2 text-primary-400 hover:text-primary-300 hover:underline transition-colors w-fit"
              >
                <Phone className="w-4 h-4" /> 
                <span>{lead.phone}</span>
              </a>
              {lead.phone2 && (
                <a 
                  href={`tel:${lead.phone2}`} 
                  className="flex items-center gap-2 text-primary-400 hover:text-primary-300 hover:underline transition-colors w-fit"
                >
                  <Phone className="w-4 h-4" /> 
                  <span>{lead.phone2}</span>
                </a>
              )}
              <span className="flex items-center gap-2 mt-1"><GraduationCap className="w-4 h-4 text-purple-400" /> {COURSE_LABELS[lead.courseInterest] || lead.courseInterest}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-dark-400 hover:text-white bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Left Column: Details */}
          <div className="md:col-span-1 space-y-6">
            <div>
              <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider mb-3">Lid haqida</h3>
              <div className="space-y-3">
                <div className="bg-dark-800/50 p-3 rounded-lg border border-dark-700/50 overflow-hidden">
                  <div className="text-xs text-dark-400 mb-1 flex items-center gap-1"><Briefcase className="w-3 h-3" /> Bandlik holati</div>
                  <div className="text-sm text-white font-medium break-words capitalize">{EMPLOYMENT_LABELS[lead.employmentStatus] || lead.employmentStatus}</div>
                </div>
                <div className="bg-dark-800/50 p-3 rounded-lg border border-dark-700/50 overflow-hidden">
                  <div className="text-xs text-dark-400 mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Manba</div>
                  <div className="text-sm text-white font-medium break-words capitalize">{lead.source}</div>
                </div>
                <div className="bg-dark-800/50 p-3 rounded-lg border border-dark-700/50 overflow-hidden">
                  <div className="text-xs text-dark-400 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Qo'shilgan vaqti</div>
                  <div className="text-sm text-white font-medium">
                    {new Date(lead.createdAt).toLocaleString('uz-UZ', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {lead.notes && (
                  <div className="bg-dark-800/50 p-3 rounded-lg border border-dark-700/50 overflow-hidden">
                    <div className="text-xs text-dark-400 mb-1 flex items-center gap-1"><FileText className="w-3 h-3" /> Qo'shimcha</div>
                    <div className="text-sm text-white font-medium break-words">{lead.notes}</div>
                  </div>
                )}
                {lead.isGrantEligible && (
                  <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded-lg">
                    <div className="text-purple-400 text-sm font-medium flex items-center gap-2">
                      Grant uchun da'vogar
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider mb-3">Amallar</h3>
              {showCourseSelector ? (
                <div className="space-y-3 bg-dark-800/40 p-3 rounded-lg border border-yellow-500/20 animate-fade-in">
                  <div>
                    <label className="text-xs font-medium text-yellow-400 block mb-1">Mijoz tanlagan kurs:</label>
                    <select
                      className="w-full bg-dark-800 text-white rounded-lg border border-dark-700 p-2 text-sm focus:outline-none focus:border-yellow-500"
                      value={selectedCourse}
                      onChange={e => setSelectedCourse(e.target.value)}
                    >
                      {Object.entries(COURSE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-yellow-400 block mb-1">Bandlik holati:</label>
                    <select
                      className="w-full bg-dark-800 text-white rounded-lg border border-dark-700 p-2 text-sm focus:outline-none focus:border-yellow-500"
                      value={selectedEmploymentStatus}
                      onChange={e => setSelectedEmploymentStatus(e.target.value)}
                    >
                      {Object.entries(EMPLOYMENT_LABELS)
                        .filter(([key]) => key === key.toUpperCase())
                        .map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleConfirmInProgress}
                      disabled={submitting}
                      className="flex-1 btn-primary py-2 text-xs font-semibold justify-center bg-yellow-500 hover:bg-yellow-600 text-dark-950 border-none shadow-lg shadow-yellow-500/10"
                    >
                      {submitting ? 'Kutilmoqda...' : 'Tasdiqlash'}
                    </button>
                    <button
                      onClick={() => setShowCourseSelector(false)}
                      disabled={submitting}
                      className="btn-secondary py-2 text-xs font-semibold justify-center border-dark-700 hover:bg-dark-800 text-dark-300"
                    >
                      Bekor qilish
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <button 
                    onClick={() => setShowCourseSelector(true)} 
                    className="w-full btn-secondary justify-center border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                  >
                    Jarayonga olish
                  </button>
                  <button onClick={() => handleStatusChange('VOUCHER_CHECK')} className="w-full btn-secondary justify-center border-purple-500/30 text-purple-400 hover:bg-purple-500/10">Vaucher tekshiruvi</button>
                  <button onClick={() => handleStatusChange('SUCCESS')} className="w-full btn-secondary justify-center border-green-500/30 text-green-400 hover:bg-green-500/10">Muvaffaqiyatli</button>
                  <button onClick={() => handleStatusChange('ARCHIVED')} className="w-full btn-secondary justify-center border-red-500/30 text-red-400 hover:bg-red-500/10">Rad etish</button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: History & Comments */}
          <div className="md:col-span-2 flex flex-col h-[450px] md:h-full bg-dark-900/30 rounded-xl border border-dark-800 overflow-hidden">
            <div className="p-3 border-b border-dark-800 bg-dark-800/50 flex items-center gap-2">
              <FileText className="w-4 h-4 text-dark-300" />
              <h3 className="text-sm font-medium text-dark-100">Suhbat tarixi</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {lead.comments.length === 0 ? (
                <div className="text-center text-dark-500 py-8 text-sm">
                  Hali izohlar yo'q
                </div>
              ) : (
                lead.comments.map(c => (
                  <div key={c.id} className="bg-dark-800 p-3 rounded-lg border border-dark-700">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-medium text-primary-400">{c.author.name}</span>
                      <span className="text-xs text-dark-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: uz })}
                      </span>
                    </div>
                    <p className="text-sm text-dark-100 whitespace-pre-wrap">{c.content}</p>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-dark-800 bg-dark-900/80">
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  className="input flex-1 bg-dark-800 focus:bg-dark-900"
                  placeholder="Yangi izoh qoldiring..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                />
                <button 
                  type="submit" 
                  disabled={submitting || !comment.trim()}
                  className="btn-primary px-3"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
