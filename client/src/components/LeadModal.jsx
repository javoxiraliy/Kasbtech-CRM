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
  const { addNotification } = useNotification();

  useEffect(() => {
    fetchLead();
  }, [leadId]);

  const fetchLead = async () => {
    try {
      const res = await api.get(`/leads/${leadId}`);
      setLead(res.data.lead);
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
            <div className="flex flex-col gap-1 text-sm text-dark-300 mt-2">
              <span className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary-400" /> {lead.phone}</span>
              {lead.phone2 && <span className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary-400" /> {lead.phone2}</span>}
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
              <div className="space-y-2">
                <button onClick={() => handleStatusChange('IN_PROGRESS')} className="w-full btn-secondary justify-center border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10">Jarayonga olish</button>
                <button onClick={() => handleStatusChange('VOUCHER_CHECK')} className="w-full btn-secondary justify-center border-purple-500/30 text-purple-400 hover:bg-purple-500/10">Vaucher tekshiruvi</button>
                <button onClick={() => handleStatusChange('SUCCESS')} className="w-full btn-secondary justify-center border-green-500/30 text-green-400 hover:bg-green-500/10">Muvaffaqiyatli</button>
                <button onClick={() => handleStatusChange('ARCHIVED')} className="w-full btn-secondary justify-center border-red-500/30 text-red-400 hover:bg-red-500/10">Rad etish</button>
              </div>
            </div>
          </div>

          {/* Right Column: History & Comments */}
          <div className="md:col-span-2 flex flex-col h-full bg-dark-900/30 rounded-xl border border-dark-800 overflow-hidden">
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
