import { useState, useEffect } from 'react';
import { Save, Clock, ShieldCheck, Loader2, Facebook, Bot, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';

export default function Settings() {
  const [settings, setSettings] = useState({
    sla_time_minutes: { value: '', description: '' },
    voucher_conditions: { value: '', description: '' },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { addNotification } = useNotification();

  const [fbStatus, setFbStatus] = useState({ connected: false, name: '', accountsCount: 0, accounts: [] });
  const [accounts, setAccounts] = useState([]);
  const [testingLead, setTestingLead] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: '', accessToken: '', category: '' });
  const [addingAccount, setAddingAccount] = useState(false);

  useEffect(() => {
    fetchSettings();
    checkFbStatus();
    fetchAccounts();

    const handleMessage = (event) => {
      if (event.data === 'FB_CONNECTED') {
        addNotification('success', "Facebook muvaffaqiyatli ulandi!");
        checkFbStatus();
        fetchAccounts();
        fetchSettings();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const checkFbStatus = async () => {
    try {
      const res = await api.get('/facebook/status');
      setFbStatus(res.data);
      if (res.data.accounts) {
        setAccounts(res.data.accounts);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/facebook/accounts');
      setAccounts(res.data.accounts || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddAccountSubmit = async (e) => {
    e.preventDefault();
    if (!newAccount.name || !newAccount.accessToken) {
      addNotification('error', "Sahifa nomi va Token kiritilishi shart!");
      return;
    }

    try {
      setAddingAccount(true);
      const res = await api.post('/facebook/accounts', newAccount);
      addNotification('success', res.data.message || "Facebook sahifasi qo'shildi!");
      setShowAddModal(false);
      setNewAccount({ name: '', accessToken: '', category: '' });
      fetchAccounts();
      checkFbStatus();
    } catch (e) {
      addNotification('error', e.response?.data?.error || "Sahifani qo'shishda xatolik");
    } finally {
      setAddingAccount(false);
    }
  };

  const handleDeleteAccount = async (id, name) => {
    if (!window.confirm(`"${name}" Facebook sahifasini uzishni tasdiqlaysizmi?`)) return;

    try {
      const res = await api.delete(`/facebook/accounts/${id}`);
      addNotification('success', res.data.message || "Facebook sahifasi o'chirildi!");
      fetchAccounts();
      checkFbStatus();
    } catch (e) {
      addNotification('error', "O'chirishda xatolik yuz berdi");
    }
  };

  const handleTestLead = async () => {
    try {
      setTestingLead(true);
      const res = await api.post('/facebook/test-lead', {
        name: 'Test Facebook Lead',
        phone: '+99890' + Math.floor(1000000 + Math.random() * 9000000),
        courseInterest: 'WEB_DEVELOPMENT'
      });
      addNotification('success', res.data.message || "Test lid yaratildi! Kanban doskasidan tekshirishingiz mumkin.");
    } catch (e) {
      addNotification('error', "Test lid yaratishda xatolik");
    } finally {
      setTestingLead(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      setSettings(prev => ({ ...prev, ...res.data.settings }));
    } catch (error) {
      addNotification('error', "Sozlamalarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookConnect = async () => {
    try {
      const res = await api.get('/facebook/auth');
      const width = 600;
      const height = 700;
      const left = window.innerWidth / 2 - width / 2;
      const top = window.innerHeight / 2 - height / 2;
      window.open(
        res.data.url, 
        'FacebookAuth', 
        `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
      );
    } catch (error) {
      addNotification('error', "Facebook tizimiga ulanib bo'lmadi");
    }
  };

  const handleSave = async (key) => {
    setSaving(key);
    try {
      await api.patch(`/settings/${key}`, {
        value: settings[key].value,
        description: settings[key].description,
      });
      addNotification('success', "Sozlama saqlandi");
      if (key.startsWith('FB_')) {
        checkFbStatus();
        fetchAccounts();
      }
    } catch (error) {
      addNotification('error', "Saqlashda xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key, field, val) => {
    setSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: val },
    }));
  };

  if (loading) {
    return <div className="text-dark-100 flex items-center justify-center h-full">Yuklanmoqda...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Tizim Sozlamalari</h1>
        <p className="text-dark-400 text-sm">SLA taymerlari, Facebook ko'p-akkauntli integratsiya va global qoidalarni tahrirlash</p>
      </div>

      <div className="grid gap-6">
        {/* SLA Setting */}
        <div className="card glass relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <Clock className="w-32 h-32 text-primary-500" />
          </div>
          
          <div className="relative z-10 flex flex-col sm:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2 text-primary-400 mb-2">
                <Clock className="w-5 h-5" />
                <h3 className="text-lg font-semibold text-white">SLA Vaqti (Daqiqa)</h3>
              </div>
              <p className="text-sm text-dark-400">
                Yangi tushgan lidlar uchun "Yangi" ustunida turish ruxsat etilgan maksimal vaqt. Ushbu vaqt o'tgach lid qizil rangga kirib miltillashni boshlaydi.
              </p>
              
              <div className="flex items-end gap-4 max-w-md">
                <div className="flex-1">
                  <label className="label">Daqiqalar</label>
                  <input 
                    type="number" 
                    className="input" 
                    value={settings.sla_time_minutes?.value || ''}
                    onChange={(e) => handleChange('sla_time_minutes', 'value', e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => handleSave('sla_time_minutes')}
                  disabled={saving === 'sla_time_minutes'}
                  className="btn-primary"
                >
                  {saving === 'sla_time_minutes' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Saqlash
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Voucher Setting */}
        <div className="card glass relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <ShieldCheck className="w-32 h-32 text-purple-500" />
          </div>
          
          <div className="relative z-10 flex flex-col sm:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="text-lg font-semibold text-white">Vaucher Shartlari</h3>
              </div>
              <p className="text-sm text-dark-400">
                Operatorlar lidni "Muvaffaqiyatli" ustuniga o'tkazishdan oldin ko'radigan vaucher tasdiqlash shartlari matni.
              </p>
              
              <div className="space-y-4 max-w-2xl">
                <div>
                  <label className="label">Shartlar matni</label>
                  <textarea 
                    rows={4}
                    className="input resize-none" 
                    value={settings.voucher_conditions?.value || ''}
                    onChange={(e) => handleChange('voucher_conditions', 'value', e.target.value)}
                  />
                </div>
                <div className="flex justify-end">
                  <button 
                    onClick={() => handleSave('voucher_conditions')}
                    disabled={saving === 'voucher_conditions'}
                    className="btn-primary bg-purple-600 hover:bg-purple-700"
                  >
                    {saving === 'voucher_conditions' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Saqlash
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Gemini AI Bot Setting */}
        <div className="card glass relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <Bot className="w-32 h-32 text-emerald-500" />
          </div>
          
          <div className="relative z-10 flex flex-col sm:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <Bot className="w-5 h-5" />
                <h3 className="text-lg font-semibold text-white">Gemini AI API Kaliti (Mentor Bot)</h3>
              </div>
              <p className="text-sm text-dark-400">
                Mentor Kasbtech Bot talabalar savollariga Bilimlar Bazasi asosida javob berishi uchun Google AI Studio API kalitini kiritishingiz mumkin.
              </p>
              
              <div className="flex items-end gap-4 max-w-xl">
                <div className="flex-1">
                  <label className="label">API Key</label>
                  <input 
                    type="password" 
                    className="input font-mono text-xs" 
                    placeholder="AIzaSy..."
                    value={settings.GEMINI_API_KEY?.value || ''}
                    onChange={(e) => handleChange('GEMINI_API_KEY', 'value', e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => handleSave('GEMINI_API_KEY')}
                  disabled={saving === 'GEMINI_API_KEY'}
                  className="btn-primary bg-emerald-600 hover:bg-emerald-700"
                >
                  {saving === 'GEMINI_API_KEY' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Saqlash
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Facebook Multi-Account Integration */}
        <div className="card glass relative overflow-hidden group border-blue-500/20">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <Facebook className="w-32 h-32 text-blue-500" />
          </div>
          
          <div className="relative z-10 flex flex-col gap-6">
            <div className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3 border-b border-dark-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-blue-400">
                    <Facebook className="w-6 h-6" />
                    <h3 className="text-lg font-bold text-white">Facebook Integratsiyasi (Lead Ads)</h3>
                  </div>
                  <p className="text-xs text-dark-400 mt-1">
                    Bir nechta Facebook va Instagram reklamalaridan tushadigan lidlarni CRM-ga bir vaqtda qabul qilish
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {fbStatus.connected ? (
                    <span className="badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold px-3.5 py-1.5 flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                      Ulangan ({accounts.length || 1} ta sahifa faol)
                    </span>
                  ) : (
                    <span className="badge bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold px-3.5 py-1.5 text-xs">
                      Ulanmagan
                    </span>
                  )}
                </div>
              </div>

              {/* Connected Accounts List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Ulangan Facebook Akkauntlar va Sahifalar ({accounts.length})
                  </h4>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowAddModal(true)}
                      className="btn-primary py-1.5 px-3 text-xs bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      + Yangi Sahifa Qo'shish
                    </button>

                    <button 
                      onClick={handleFacebookConnect}
                      className="btn-secondary py-1.5 px-3 text-xs border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                    >
                      <Facebook className="w-3.5 h-3.5 text-blue-400" />
                      OAuth orqali bog'lash
                    </button>
                  </div>
                </div>

                {accounts.length === 0 ? (
                  <div className="p-5 bg-dark-950/60 rounded-xl border border-dark-800 text-center space-y-2">
                    <p className="text-sm font-semibold text-white">Hozircha ulangan akkauntlar mavjud emas</p>
                    <p className="text-xs text-dark-400">Yuqoridagi <strong>"OAuth orqali bog'lash"</strong> yoki <strong>"+ Yangi Sahifa Qo'shish"</strong> tugmalarini bosing.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {accounts.map((acc, idx) => (
                      <div key={acc.id || idx} className="p-4 bg-dark-900/80 border border-dark-800 rounded-xl flex items-center justify-between gap-3 group/item hover:border-blue-500/40 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold shrink-0">
                            <Facebook className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-sm font-bold text-white truncate">{acc.name}</h5>
                            <div className="flex items-center gap-2 text-[11px] text-dark-400">
                              <span className="truncate">{acc.category || 'Business Page'}</span>
                              <span>•</span>
                              <span className="text-emerald-400 font-medium">🟢 Faol</span>
                            </div>
                          </div>
                        </div>

                        <button 
                          onClick={() => handleDeleteAccount(acc.id, acc.name)}
                          className="p-2 text-dark-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                          title="Akkauntni uzish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-2">
                <button 
                  onClick={handleTestLead}
                  disabled={testingLead}
                  className="btn-secondary text-xs font-bold border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                >
                  {testingLead ? <Loader2 className="w-4 h-4 animate-spin" /> : '🧪 Test Lid Yaratish'}
                </button>
              </div>

              {/* Advanced Settings */}
              <div className="space-y-4 pt-4 border-t border-dark-800">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Facebook API va Token Sozlamalari</h4>

                <div>
                  <label className="label">Asosiy Page Access Token (Standart)</label>
                  <div className="flex gap-2">
                    <input 
                      type="password" 
                      className="input font-mono text-xs" 
                      placeholder="EAA..."
                      value={settings.FB_PAGE_ACCESS_TOKEN?.value || ''}
                      onChange={(e) => handleChange('FB_PAGE_ACCESS_TOKEN', 'value', e.target.value)}
                    />
                    <button 
                      onClick={() => handleSave('FB_PAGE_ACCESS_TOKEN')}
                      disabled={saving === 'FB_PAGE_ACCESS_TOKEN'}
                      className="btn-primary py-1 px-3 text-xs shrink-0"
                    >
                      {saving === 'FB_PAGE_ACCESS_TOKEN' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Saqlash
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">FB App ID</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        className="input text-xs font-mono" 
                        placeholder="2637179990074660"
                        value={settings.FB_APP_ID?.value || ''}
                        onChange={(e) => handleChange('FB_APP_ID', 'value', e.target.value)}
                      />
                      <button 
                        onClick={() => handleSave('FB_APP_ID')}
                        disabled={saving === 'FB_APP_ID'}
                        className="btn-secondary py-1 px-2.5 text-xs shrink-0"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="label">FB App Secret</label>
                    <div className="flex gap-2">
                      <input 
                        type="password" 
                        className="input text-xs font-mono" 
                        placeholder="6b35de3e..."
                        value={settings.FB_APP_SECRET?.value || ''}
                        onChange={(e) => handleChange('FB_APP_SECRET', 'value', e.target.value)}
                      />
                      <button 
                        onClick={() => handleSave('FB_APP_SECRET')}
                        disabled={saving === 'FB_APP_SECRET'}
                        className="btn-secondary py-1 px-2.5 text-xs shrink-0"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Webhook Guide */}
              <div className="p-4 bg-dark-950/80 border border-dark-800 rounded-xl space-y-2 text-xs text-dark-300">
                <p className="font-bold text-white text-xs uppercase tracking-wider text-blue-400">
                  📌 Meta Developer Webhook Sozlash Yo'riqnomasi:
                </p>
                <p>Facebook Developer Console (developers.facebook.com) portalida <strong>Webhooks</strong> bo'limiga o'ting va quyidagi ma'lumotlarni kiriting:</p>
                <div className="bg-dark-900 p-2.5 rounded border border-dark-800 space-y-1 font-mono text-[11px]">
                  <p><span className="text-dark-500">Callback URL:</span> <span className="text-emerald-400">{window.location.origin.replace('5173', '5000')}/api/webhooks/meta</span></p>
                  <p><span className="text-dark-500">Verify Token:</span> <span className="text-yellow-400">KASBTECH_META_WEBHOOK_SECRET_123</span></p>
                  <p><span className="text-dark-500">Subscribed Fields:</span> <span className="text-primary-400">leadgen</span></p>
                </div>
              </div>

            </div>
          </div>
        </div>
        
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 max-w-md w-full glass space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-dark-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Facebook className="w-5 h-5 text-blue-400" />
                Yangi Facebook Sahifasini Bog'lash
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-dark-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddAccountSubmit} className="space-y-4">
              <div>
                <label className="label">Facebook Sahifa / Akkaunt Nomi</label>
                <input 
                  type="text" 
                  required
                  className="input" 
                  placeholder="masalan: Kasbtech SMM Reklama Sahifasi"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">Page Access Token</label>
                <input 
                  type="password" 
                  required
                  className="input font-mono text-xs" 
                  placeholder="EAA..."
                  value={newAccount.accessToken}
                  onChange={(e) => setNewAccount(prev => ({ ...prev, accessToken: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">Kategoriya / Izoh (Ixtiyoriy)</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="masalan: Target Reklama"
                  value={newAccount.category}
                  onChange={(e) => setNewAccount(prev => ({ ...prev, category: e.target.value }))}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                >
                  Bekor qilish
                </button>
                <button 
                  type="submit" 
                  disabled={addingAccount}
                  className="btn-primary bg-blue-600 hover:bg-blue-700"
                >
                  {addingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Qo'shish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
