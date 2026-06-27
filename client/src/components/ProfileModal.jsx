import { useState } from 'react';
import { X, User, Phone, FileText, Key, Loader2, Shield, Camera } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

export default function ProfileModal({ onClose }) {
  const { user, updateProfile } = useAuth();
  const { addNotification } = useNotification();

  const [name, setName] = useState(user?.name || '');
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  const [submitting, setSubmitting] = useState(false);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      addNotification('warning', "Ism maydoni bo'sh bo'lishi mumkin emas");
      return;
    }

    if (password && !currentPassword) {
      addNotification('warning', "Parolni o'zgartirish uchun joriy parolingizni kiritishingiz shart!");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('nickname', nickname);
      formData.append('phone', phone);
      formData.append('bio', bio);
      
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }
      if (password) {
        formData.append('password', password);
        formData.append('currentPassword', currentPassword);
      }

      const res = await api.put('/auth/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        updateProfile(res.data.user);
        addNotification('success', "Profil ma'lumotlari muvaffaqiyatli yangilandi");
        setPassword('');
        setCurrentPassword('');
        setAvatarFile(null);
        onClose();
      }
    } catch (error) {
      console.error(error);
      addNotification('error', error.response?.data?.error || "Profilni yangilashda xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'TEACHER': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'MENTOR': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'SMM': return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      case 'STUDENT': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default: return 'bg-primary-500/10 text-primary-400 border-primary-500/20';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'ADMIN': return 'Administrator';
      case 'TEACHER': return 'O\'qituvchi';
      case 'MENTOR': return 'Mentor';
      case 'SMM': return 'SMM Mutaxassisi';
      case 'STUDENT': return 'Talaba';
      case 'OPERATOR': return 'Operator';
      default: return role;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in animate-duration-200">
      <div className="card glass w-full max-w-lg overflow-hidden shadow-2xl relative animate-scale-up">
        
        {/* Header */}
        <div className="p-4 border-b border-dark-800 bg-dark-900/50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-primary-400" />
            Mening Profilim
          </h3>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-dark-850 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Avatar Upload and Role */}
          <div className="flex items-center gap-4 p-3 bg-dark-800/40 border border-dark-700/40 rounded-2xl">
            <div className="relative group/avatar cursor-pointer">
              <input
                type="file"
                id="avatar-input"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <label htmlFor="avatar-input" className="cursor-pointer block relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold border-2 border-dark-600 shadow-md overflow-hidden relative">
                  {avatarPreview ? (
                    <img 
                      src={avatarPreview} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    name.charAt(0).toUpperCase()
                  )}
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center transition-opacity duration-200">
                    <Camera className="w-4 h-4 text-white" />
                    <span className="text-[8px] text-white font-bold uppercase mt-0.5">Yuklash</span>
                  </div>
                </div>
              </label>
            </div>
            <div>
              <h4 className="text-base font-bold text-white leading-tight">{name}</h4>
              <p className="text-xs text-dark-400 mt-0.5">{user?.email}</p>
              <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 mt-2 rounded border ${getRoleBadgeColor(user?.role)}`}>
                {getRoleLabel(user?.role)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Ism */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-dark-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-dark-400" /> Ism-sharif
              </label>
              <input
                type="text"
                required
                className="input h-10 text-xs"
                placeholder="Sherzod Asadov"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            {/* Taxallus */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-dark-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-dark-400" /> Taxallus (Username)
              </label>
              <input
                type="text"
                className="input h-10 text-xs"
                placeholder="sherzod_a"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
              />
            </div>

            {/* Telefon */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-dark-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-dark-400" /> Telefon raqam
              </label>
              <input
                type="text"
                className="input h-10 text-xs"
                placeholder="+998901234567"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>

            {/* Parolni o'zgartirish */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-dark-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-dark-400" /> Yangi parol (Ixtiyoriy)
              </label>
              <input
                type="password"
                className="input h-10 text-xs"
                placeholder="Yangi parol yozing..."
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {/* Eski parolni tasdiqlash */}
            {password && (
              <div className="space-y-1 sm:col-span-2 animate-fade-in">
                <label className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" /> Amaldagi (eski) parolingizni tasdiqlang *
                </label>
                <input
                  type="password"
                  required
                  className="input h-10 text-xs border-red-500/30 focus:border-red-500 bg-red-500/5"
                  placeholder="Yangi parolni saqlash uchun joriy parolingizni kiriting..."
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                />
              </div>
            )}

          </div>

          {/* Bio */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-dark-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-dark-400" /> Bio / Ma'lumot
            </label>
            <textarea
              rows="3"
              className="input text-xs"
              placeholder="O'zingiz haqingizda yozing..."
              value={bio}
              onChange={e => setBio(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-2 border-t border-dark-800">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 btn-primary py-2 text-xs font-semibold justify-center bg-primary-600 hover:bg-primary-700 text-white border-none"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saqlanmoqda...
                </>
              ) : 'Saqlash'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn-secondary py-2 text-xs font-semibold justify-center border-dark-700 hover:bg-dark-800 text-dark-300"
            >
              Bekor qilish
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
