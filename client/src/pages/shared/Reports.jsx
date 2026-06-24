import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { FileText, Send, Calendar, Copy, Check, Paperclip, X, Image, File, Download, ExternalLink, Loader2, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import api from '../../lib/api';

const TEMPLATES = {
  OPERATOR: {
    DAILY: `📊 #kunlik_hisobot #sotuv
🗓 Sana: {date}
👤 Xodim: {name}

📥 Yangi kelgan lidlar: 
📞 Qilingan qo'ng'iroqlar (umumiy): 
🤝 Markazga kelganlar (uchrashuv): 
💰 Qilingan sotuvlar soni va summasi:  ta /  so'm
⏳ Ertaga to'lov qiladiganlar (kutilma):  ta

❗️ Muammo yoki takliflar: -
🎯 Ertangi asosiy reja: `,
    WEEKLY: `📊 #haftalik_hisobot #sotuv
🗓 Hafta: {date}
👤 Xodim: {name}

🔹 Hafta davomida jami kelgan lidlar va ulardan sotuvga aylanish konversiyasi (%): 
🔹 Haftalik tushum va qilingan skidkalar summasi: 
🔹 Mijozlar eng ko'p rad etayotgan sabablar (E'tirozlar tahlili): `
  },
  TEACHER: {
    DAILY: `🎓 #kunlik_hisobot #oqituvchi
🗓 Sana: {date}
👤 O'qituvchi: {name} | Yo'nalish

📚 O'tilgan guruhlar: 
👥 Davomat: [Jami] / [Kelganlar]
📝 Dars mavzusi va berilgan vazifalar: 
⚠️ Qoloq yoki o'zlashtirishi qiyin bo'layotgan o'quvchilar: 

❗️ Texnik muammolar (kompyuter, proyektor): Yo'q`,
    WEEKLY: `🎓 #haftalik_hisobot #oqituvchi
🗓 Hafta: {date}
👤 O'qituvchi: {name}

🔹 Guruhlarning umumiy o'zlashtirish foizi: 
🔹 Hafta davomida amaliyotda qilingan eng yaxshi ishlar (keyslar uchun): 
🔹 Keyingi hafta uchun tayyorlangan o'quv materiallari holati: `
  },
  SMM: {
    DAILY: `📱 #kunlik_hisobot #smm_media
🗓 Sana: {date}
👤 Xodim: {name}

✅ Bajarilgan ishlar:
- 

📈 Natijalar:
- Post qamrovi (oxirgi 24 soat): 
- SMM orqali kelgan lidlar (Direct/Koment): 

🎯 Ertangi reja: `,
    WEEKLY: `📱 #haftalik_hisobot #smm_media
🗓 Hafta: {date}
👤 Xodim: {name}

🔹 Haftalik obunachilar o'sishi (+/-): 
🔹 Eng ko'p qamrov olgan va eng ko'p lid olib kelgan post tahlili: 
🔹 Targeting xarajatlari va bitta lidning o'rtacha narxi (CPL): 
🔹 Keyingi haftaning tasdiqlangan kontent-plani: `
  },
  ADMIN: {
    DAILY: `🏢 #kunlik_hisobot #admin
🗓 Sana: {date}
👤 Xodim: {name}

🧹 Markaz holati: 
⚙️ Texnik holat: 
👥 Xodimlar intizomi: 
💸 Qilingan xarajatlar: 

❗️ Zudlik bilan hal qilinishi kerak bo'lgan masalalar: `,
    WEEKLY: `🏢 #haftalik_hisobot #admin
🗓 Hafta: {date}
👤 Xodim: {name}

🔹 Barcha bo'limlarning haftalik hisobotlari jamlanmasi: 
🔹 Haftalik kirim va chiqim (operatsion xarajatlar) hisoboti: 
🔹 Keyingi hafta uchun xarid qilinishi kerak bo'lgan narsalar ro'yxati: `
  }
};



export default function Reports() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('DAILY'); // DAILY or WEEKLY
  const [copied, setCopied] = useState(false);
  
  // Warning states
  const [showDailyReminder, setShowDailyReminder] = useState(false);
  const [showWeeklyReminder, setShowWeeklyReminder] = useState(false);
  
  // Initialize content with template based on role and tab
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);

  const today = new Date().toLocaleDateString('uz-UZ');

  useEffect(() => {
    fetchMyReports();
  }, []);

  useEffect(() => {
    if (user && user.role) {
      const template = TEMPLATES[user.role]?.[activeTab] || '';
      setContent(template.replace('{date}', today).replace('{name}', user.name));
    }
  }, [user, activeTab, today]);

  const fetchMyReports = async () => {
    try {
      const res = await api.get('/reports');
      const fetchedReports = res.data.reports;
      setReports(fetchedReports);

      // Reminder calculation
      const todayDailyReport = fetchedReports.find(r => 
        r.type === 'DAILY' && 
        new Date(r.createdAt).toDateString() === new Date().toDateString()
      );
      
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - 6);
      const thisWeekReport = fetchedReports.find(r => 
        r.type === 'WEEKLY' && 
        new Date(r.createdAt) >= startOfWeek
      );

      const now = new Date();
      const hours = now.getHours();
      const isWeekday = now.getDay() >= 1 && now.getDay() <= 6;
      const isSaturday = now.getDay() === 6;

      const shouldDaily = isWeekday && hours >= 16 && hours < 18 && !todayDailyReport;
      const shouldWeekly = isSaturday && hours >= 12 && hours < 22 && !thisWeekReport;

      setShowDailyReminder(!!shouldDaily);
      setShowWeeklyReminder(!!shouldWeekly);

      if (shouldDaily) {
        addNotification('warning', "Kunlik hisobot topshirish vaqti yaqinlashmoqda! (muddati: 18:00 gacha)");
      }
      if (shouldWeekly) {
        addNotification('warning', "Haftalik tahliliy hisobot topshirish muddati keldi!");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getAttachmentUrl = (path) => {
    if (!path) return '';
    const base = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace('/api', '') 
      : (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);
    return `${base}${path}`;
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    setSubmitting(true);
    try {
      const res = await api.post('/reports', { 
        type: activeTab, 
        content,
        attachmentUrls: attachments.map(a => a.url)
      });
      setReports([res.data.report, ...reports]);
      addNotification('success', 'Hisobot muvaffaqiyatli yuborildi');
      
      // Reset form to template
      const template = TEMPLATES[user.role]?.[activeTab] || '';
      setContent(template.replace('{date}', today).replace('{name}', user.name));
      setAttachments([]);
    } catch (error) {
      addNotification('error', 'Hisobot yuborishda xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addNotification('success', 'Nusxa olindi. Telegram guruhiga yuborishingiz mumkin.');
  };

  const isImageFile = (url) => {
    const ext = url.split('.').pop().toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Mening Hisobotlarim</h1>
        <p className="text-dark-400 text-sm">Kunlik va haftalik hisobotlarni to'ldirish va yuborish</p>
      </div>

      {/* Warnings / Reminders */}
      {showDailyReminder && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl flex items-start gap-3 shadow-lg animate-pulse">
          <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-yellow-400 font-bold text-sm">Kunlik hisobot topshirish vaqti yaqinlashmoqda!</h4>
            <p className="text-dark-300 text-xs mt-0.5">Bugungi ish kuni yakunlanmoqda. Iltimos, soat 18:00 gacha hisobotingizni topshirib, Telegram guruhiga yuboring.</p>
          </div>
        </div>
      )}

      {showWeeklyReminder && (
        <div className="bg-purple-500/10 border border-purple-500/30 p-4 rounded-xl flex items-start gap-3 shadow-lg animate-pulse">
          <Calendar className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-purple-400 font-bold text-sm">Haftalik tahliliy hisobot topshirish muddati!</h4>
            <p className="text-dark-300 text-xs mt-0.5">Shanba kuni oxiri - haftalik tahlillarni sarhisob qilish vaqti. Iltimos, haftalik hisobotingizni yakunlang.</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-5 gap-6">
        {/* Form Section */}
        <div className="card glass p-6 h-fit md:col-span-3">
          <div className="flex bg-dark-800 p-1 rounded-lg mb-6">
            <button
              onClick={() => setActiveTab('DAILY')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === 'DAILY' ? 'bg-primary-500 text-white shadow-lg' : 'text-dark-400 hover:text-white'
              }`}
            >
              Kunlik Hisobot
            </button>
            <button
              onClick={() => setActiveTab('WEEKLY')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === 'WEEKLY' ? 'bg-primary-500 text-white shadow-lg' : 'text-dark-400 hover:text-white'
              }`}
            >
              Haftalik Hisobot
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="label mb-0">Hisobot matni</label>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="text-xs flex items-center gap-1 text-primary-400 hover:text-primary-300 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Nusxa olindi' : "Nusxa ko'chirish"}
                </button>
              </div>
              <textarea
                className="input bg-dark-900/50 min-h-[250px] font-mono text-sm"
                value={content}
                onChange={e => setContent(e.target.value)}
                required
              />
              <p className="text-xs text-dark-400 mt-2">
                * Hisobotni avval shu yerda saqlang, keyin yuqoridagi "Nusxa ko'chirish" tugmasi orqali nusxa olib, Telegram guruhiga yuboring.
              </p>
            </div>

            {/* Attachments Upload section */}
            <div className="space-y-3 pt-2">
              <label className="label mb-0">Fayl biriktirish (Rasm, PDF, Word, Excel)</label>
              
              <div className="flex items-center gap-3">
                <label 
                  htmlFor="report-files-upload"
                  className="flex items-center gap-2 cursor-pointer bg-dark-800 border border-dark-700 hover:border-dark-600 hover:bg-dark-750 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-all select-none"
                >
                  <Paperclip className="w-4 h-4 text-primary-400" />
                  Hujjat yuklash
                </label>
                <input 
                  type="file" 
                  id="report-files-upload" 
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

              {/* Uploaded items list */}
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

            <button 
              type="submit" 
              disabled={submitting || uploading} 
              className="btn-primary w-full justify-center py-3"
            >
              <Send className="w-5 h-5" />
              {submitting ? 'Yuborilmoqda...' : 'Hisobotni Saqlash'}
            </button>
          </form>
        </div>

        {/* History Section */}
        <div className="card glass p-6 md:col-span-2">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-400" />
            Tarix
          </h2>
          
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <p className="text-dark-400 text-center py-8">Yuklanmoqda...</p>
            ) : reports.length === 0 ? (
              <p className="text-dark-400 text-center py-8">Hali hisobotlar yuborilmagan</p>
            ) : (
              reports.map(report => (
                <div key={report.id} className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/50 space-y-3">
                  <div className="flex justify-between items-start">
                    <span className={`badge ${
                      report.type === 'DAILY' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                    }`}>
                      {report.type === 'DAILY' ? 'Kunlik' : 'Haftalik'}
                    </span>
                    <span className="text-[10px] text-dark-400">
                      {new Date(report.createdAt).toLocaleString('uz-UZ')}
                    </span>
                  </div>
                  
                  <div className="text-sm text-dark-300 whitespace-pre-wrap font-mono bg-dark-900/50 p-3 rounded-lg border border-dark-800">
                    {report.content}
                  </div>

                  {/* Render attachments for this report */}
                  {report.attachmentUrls && report.attachmentUrls.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] text-dark-400 uppercase font-bold tracking-wider">Biriktirilgan fayllar:</p>
                      <div className="flex flex-col gap-1">
                        {report.attachmentUrls.map((url, uidx) => {
                          const fileName = getFileName(url);
                          return (
                            <div key={uidx} className="flex items-center justify-between gap-3 p-1.5 bg-dark-900/30 rounded border border-dark-800 text-[11px]">
                              <span className="text-dark-300 truncate flex items-center gap-1.5">
                                {getFileIcon(url)}
                                {fileName || `Fayl_${uidx + 1}`}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <a 
                                  href={getAttachmentUrl(url)} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary-400 hover:text-white p-1"
                                  title="Ko'rish"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
