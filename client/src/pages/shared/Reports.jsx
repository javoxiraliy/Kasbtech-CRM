import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { FileText, Send, Calendar, Copy, Check } from 'lucide-react';
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
  
  // Initialize content with template based on role and tab
  const [content, setContent] = useState('');

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
      setReports(res.data.reports);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    setSubmitting(true);
    try {
      const res = await api.post('/reports', { type: activeTab, content });
      setReports([res.data.report, ...reports]);
      addNotification('success', 'Hisobot muvaffaqiyatli yuborildi');
      
      // Reset form to template
      const template = TEMPLATES[user.role]?.[activeTab] || '';
      setContent(template.replace('{date}', today).replace('{name}', user.name));
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Mening Hisobotlarim</h1>
        <p className="text-dark-400 text-sm">Kunlik va haftalik hisobotlarni to'ldirish va yuborish</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Form Section */}
        <div className="card glass p-6 h-fit">
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
                className="input bg-dark-900/50 min-h-[300px] font-mono text-sm"
                value={content}
                onChange={e => setContent(e.target.value)}
                required
              />
              <p className="text-xs text-dark-400 mt-2">
                * Hisobotni avval shu yerda saqlang, keyin yuqoridagi "Nusxa ko'chirish" tugmasi orqali nusxa olib, Telegram guruhiga yuboring.
              </p>
            </div>
            <button 
              type="submit" 
              disabled={submitting} 
              className="btn-primary w-full justify-center py-3"
            >
              <Send className="w-5 h-5" />
              {submitting ? 'Yuborilmoqda...' : 'Hisobotni Saqlash'}
            </button>
          </form>
        </div>

        {/* History Section */}
        <div className="card glass p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-400" />
            Yuborilgan hisobotlar tarixi
          </h2>
          
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <p className="text-dark-400 text-center py-8">Yuklanmoqda...</p>
            ) : reports.length === 0 ? (
              <p className="text-dark-400 text-center py-8">Hali hisobotlar yuborilmagan</p>
            ) : (
              reports.map(report => (
                <div key={report.id} className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/50">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`badge ${
                      report.type === 'DAILY' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                    }`}>
                      {report.type === 'DAILY' ? 'Kunlik' : 'Haftalik'}
                    </span>
                    <span className="text-xs text-dark-400">
                      {new Date(report.createdAt).toLocaleString('uz-UZ')}
                    </span>
                  </div>
                  <div className="text-sm text-dark-300 whitespace-pre-wrap font-mono bg-dark-900/50 p-3 rounded-lg border border-dark-800">
                    {report.content}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
