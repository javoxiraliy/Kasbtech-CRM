import { useState, useEffect } from 'react';
import { 
  CheckCheck, 
  FileText, 
  Download, 
  User, 
  Award,
  MessageSquare
} from 'lucide-react';
import api from '../../lib/api';

export default function HomeworkReview() {
  const [homeworks, setHomeworks] = useState([]);
  const [selectedHw, setSelectedHw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Review form state
  const [reviewForm, setReviewForm] = useState({ status: 'APPROVED', grade: '', feedback: '' });
  const [submitting, setSubmitting] = useState(false);

  const getFileUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) return path;
    const base = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace('/api', '') 
      : (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);
    return `${base}${path}`;
  };

  const getExtensionFromMime = (mimeType) => {
    switch (mimeType) {
      case 'image/jpeg':
      case 'image/jpg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/gif':
        return 'gif';
      case 'image/webp':
        return 'webp';
      case 'application/zip':
      case 'application/x-zip-compressed':
        return 'zip';
      case 'application/x-rar-compressed':
        return 'rar';
      case 'application/pdf':
        return 'pdf';
      case 'application/msword':
        return 'doc';
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return 'docx';
      case 'application/vnd.ms-excel':
        return 'xls';
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        return 'xlsx';
      case 'text/csv':
        return 'csv';
      case 'text/plain':
        return 'txt';
      default:
        const parts = mimeType.split('/');
        return parts.length > 1 ? parts[1] : 'bin';
    }
  };

  const handleDownloadFile = (hw) => {
    const fileUrl = hw.fileUrl;
    if (!fileUrl) return;

    if (fileUrl.startsWith('data:')) {
      const arr = fileUrl.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      const ext = getExtensionFromMime(mime);
      
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = blobUrl;
      const cleanName = `${hw.student.name}_${hw.lesson.title}`.replace(/[^a-zA-Z0-9_]/g, '_');
      a.download = `${cleanName}.${ext}`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } else {
      // Standard URL fallback for old uploads
      const a = document.createElement('a');
      a.href = getFileUrl(fileUrl);
      a.target = '_blank';
      a.download = `vazifa_${hw.id}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  useEffect(() => {
    fetchPendingHomeworks();
  }, []);

  const fetchPendingHomeworks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/lms/homeworks/pending');
      setHomeworks(res.data.homeworks || []);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Tekshiriladigan vazifalarni yuklashda xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHw = (hw) => {
    setSelectedHw(hw);
    setReviewForm({ status: 'APPROVED', grade: '100', feedback: '' });
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewForm.grade) {
      alert('Iltimos, bahoni kiriting (0-100)!');
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/lms/homeworks/${selectedHw.id}/review`, {
        status: reviewForm.status,
        grade: reviewForm.grade,
        feedback: reviewForm.feedback
      });

      alert(`Vazifa muvaffaqiyatli ${reviewForm.status === 'APPROVED' ? 'tasdiqlandi' : 'rad etildi'}!`);
      setSelectedHw(null);
      fetchPendingHomeworks();
    } catch (err) {
      console.error(err);
      alert('Vazifani baholashda xatolik yuz berdi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CheckCheck className="w-6 h-6 text-emerald-400" />
          Uy Vazifalarini Tekshirish Markazi
        </h1>
        <p className="text-sm text-dark-400">Talabalar tomonidan yuborilgan uy vazifalarini ko'rib chiqish va baholash</p>
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
          
          {/* Homework list */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-400" />
              Kelib tushgan vazifalar ({homeworks.length})
            </h2>

            <div className="space-y-3 max-h-[calc(100vh-16rem)] overflow-y-auto pr-1">
              {homeworks.map(hw => {
                const isSelected = selectedHw?.id === hw.id;
                
                return (
                  <button
                    key={hw.id}
                    onClick={() => handleSelectHw(hw)}
                    className={`w-full text-left card-hover p-4 bg-dark-900 border transition-all duration-200 ${
                      isSelected 
                        ? 'border-primary-500/80 bg-primary-600/5 shadow-primary-500/5' 
                        : 'border-dark-800'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold text-primary-400 flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {hw.student.name}
                      </span>
                      <span className="text-[10px] text-dark-500">
                        {new Date(hw.createdAt).toLocaleDateString('uz-UZ')}
                      </span>
                    </div>

                    <h4 className="font-bold text-white text-sm line-clamp-1">{hw.lesson.title}</h4>
                    <p className="text-[10px] text-dark-400 mt-1 uppercase tracking-wide">
                      {hw.lesson.module.course.title}
                    </p>
                  </button>
                );
              })}

              {homeworks.length === 0 && (
                <div className="text-center py-12 text-dark-500 border border-dashed border-dark-700 rounded-xl">
                  Hozircha tekshiriladigan yangi vazifalar yo'q. Dam oling!
                </div>
              )}
            </div>
          </div>

          {/* Grading Area */}
          <div className="lg:col-span-2">
            {selectedHw ? (
              <div className="card bg-dark-900 border-dark-800 p-6 space-y-6">
                
                {/* Header detail */}
                <div className="border-b border-dark-800 pb-4">
                  <span className="text-[10px] uppercase text-primary-400 font-bold tracking-wider">
                    {selectedHw.lesson.module.course.title} &gt; {selectedHw.lesson.module.title}
                  </span>
                  
                  <h3 className="text-lg font-bold text-white mt-1">{selectedHw.lesson.title}</h3>
                  
                  <div className="flex items-center gap-3 mt-3 text-xs text-dark-400">
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4 text-emerald-400" />
                      Talaba: <strong>{selectedHw.student.name}</strong> ({selectedHw.student.email})
                    </span>
                  </div>
                </div>

                {/* Submission content */}
                <div className="space-y-4 bg-dark-950 p-4 rounded-lg border border-dark-850">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider text-dark-400">Talaba javobi</h4>
                  
                  {selectedHw.textResponse && (
                    <div className="text-sm text-dark-200 whitespace-pre-line leading-relaxed">
                      {selectedHw.textResponse}
                    </div>
                  )}

                  {selectedHw.fileUrl && (
                    <div className="pt-2 space-y-3">
                      {/* File Preview Handling */}
                      {(selectedHw.fileUrl.startsWith('data:image/') || 
                        /\.(jpg|jpeg|png|gif|webp)$/i.test(selectedHw.fileUrl)) ? (
                        <div className="mt-2 max-w-lg border border-dark-800 rounded-lg overflow-hidden bg-dark-900">
                          <img 
                            src={selectedHw.fileUrl.startsWith('data:') ? selectedHw.fileUrl : getFileUrl(selectedHw.fileUrl)} 
                            alt="Vazifa rasmi" 
                            className="w-full h-auto max-h-[400px] object-contain" 
                          />
                        </div>
                      ) : /\.pdf$/i.test(selectedHw.fileUrl) ? (
                        <div className="mt-2 border border-dark-800 rounded-lg overflow-hidden bg-dark-900 h-[500px]">
                          <iframe 
                            src={getFileUrl(selectedHw.fileUrl)} 
                            title="PDF Preview"
                            className="w-full h-full"
                          />
                        </div>
                      ) : /\.(doc|docx|xls|xlsx|csv)$/i.test(selectedHw.fileUrl) ? (
                        <div className="mt-2 border border-dark-800 rounded-lg overflow-hidden bg-dark-900 h-[500px]">
                          <iframe 
                            src={`https://docs.google.com/viewer?url=${encodeURIComponent(getFileUrl(selectedHw.fileUrl))}&embedded=true`}
                            title="Document Preview"
                            className="w-full h-full"
                          />
                        </div>
                      ) : (
                        <div className="mt-2 p-4 border border-dark-800 rounded-lg bg-dark-900">
                          <p className="text-dark-300 text-sm flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Hujjat yuklangan. Ko'rish uchun quyidagi tugma orqali yuklab oling.
                          </p>
                        </div>
                      )}
                      
                      <div>
                        <button 
                          type="button"
                          onClick={() => handleDownloadFile(selectedHw)}
                          className="btn-secondary py-1.5 px-3 text-xs inline-flex items-center gap-1.5 bg-dark-800 hover:bg-dark-700 text-white cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Biriktirilgan faylni yuklab olish
                        </button>
                      </div>
                    </div>
                  )}

                  {!selectedHw.textResponse && !selectedHw.fileUrl && (
                    <p className="text-xs text-dark-500 italic">Javob matni va fayl yo'q.</p>
                  )}
                </div>

                {/* Review form */}
                <form onSubmit={handleSubmitReview} className="space-y-5 border-t border-dark-800 pt-5">
                  <h4 className="font-bold text-white text-sm flex items-center gap-1">
                    <Award className="w-4 h-4 text-yellow-500" />
                    Vazifani baholash va taqriz
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Qaror (Status)</label>
                      <select 
                        value={reviewForm.status} 
                        onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value })}
                        className="input"
                      >
                        <option value="APPROVED">Qabul qilish (APPROVED)</option>
                        <option value="REJECTED">Rad etish (REJECTED)</option>
                      </select>
                    </div>

                    <div>
                      <label className="label">Baholash (0-100 ball)</label>
                      <input 
                        type="number" 
                        min="0" 
                        max="100"
                        value={reviewForm.grade}
                        onChange={(e) => setReviewForm({ ...reviewForm, grade: e.target.value })}
                        className="input"
                        placeholder="masalan, 95"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Izoh / Mentor mulohazasi</label>
                    <textarea 
                      rows="4"
                      value={reviewForm.feedback}
                      onChange={(e) => setReviewForm({ ...reviewForm, feedback: e.target.value })}
                      placeholder="Xatolarni ko'rsating yoki a'lo baho uchun izoh yozing..."
                      className="input"
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button 
                      type="button" 
                      onClick={() => setSelectedHw(null)} 
                      className="btn-secondary"
                    >
                      Bekor qilish
                    </button>
                    
                    <button 
                      type="submit" 
                      disabled={submitting}
                      className="btn-primary"
                    >
                      {submitting ? 'Yuborilmoqda...' : 'Baholashni tasdiqlash'}
                    </button>
                  </div>
                </form>

              </div>
            ) : (
              <div className="card border-dark-800 p-12 text-center text-dark-500 flex flex-col items-center justify-center py-24 bg-dark-900/40">
                <MessageSquare className="w-12 h-12 text-dark-600 mb-3" />
                <h3 className="font-bold text-white text-md">Taqriz uchun vazifa tanlanmagan</h3>
                <p className="text-xs text-dark-400 mt-1 max-w-xs">
                  Baholashni boshlash uchun chap tarafdagi ro'yxatdan birorta o'quvchining vazifasini tanlang.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
