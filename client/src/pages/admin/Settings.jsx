import { useState, useEffect } from 'react';
import { Save, Clock, ShieldCheck, Loader2, Facebook } from 'lucide-react';
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

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      // Merge with defaults in case they don't exist yet
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
        <p className="text-dark-400 text-sm">SLA taymerlari va global qoidalarni tahrirlash</p>
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
        
        {/* Facebook Integration */}
        <div className="card glass relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <Facebook className="w-32 h-32 text-blue-500" />
          </div>
          
          <div className="relative z-10 flex flex-col sm:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <Facebook className="w-5 h-5" />
                <h3 className="text-lg font-semibold text-white">Facebook Integratsiyasi (Lead Ads)</h3>
              </div>
              <p className="text-sm text-dark-400">
                Ushbu bo'lim orqali Facebook reklamalaridan tushadigan lidlarni avtomatik tarzda CRM tizimiga ulashingiz mumkin. Tugmani bosing va 100k.uz kabi Facebook orqali ruxsatlarni tasdiqlang.
              </p>
              
              <div className="pt-2">
                <button 
                  onClick={handleFacebookConnect}
                  className="btn-primary bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                >
                  <Facebook className="w-4 h-4 mr-2" />
                  Facebookga bog'lash
                </button>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
