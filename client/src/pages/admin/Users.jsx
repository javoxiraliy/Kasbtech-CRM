import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Shield, User, CheckCircle, XCircle, BookOpen, Smartphone } from 'lucide-react';
import api from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';
import ConfirmModal from '../../components/ConfirmModal';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger',
    confirmText: '',
    cancelText: 'Bekor qilish'
  });

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'OPERATOR',
    workingHours: '09:00 - 18:00'
  });

  const { addNotification } = useNotification();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.users);
    } catch (error) {
      addNotification('error', "Xodimlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id, name) => {
    setConfirmModal({
      isOpen: true,
      title: "Xodimni o'chirish",
      message: `${name}ni butunlay o'chirib tashlamoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi!`,
      type: 'danger',
      confirmText: "Ha, o'chirish",
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await api.delete(`/admin/users/${id}`);
          addNotification('success', "Xodim butunlay o'chirildi");
          fetchUsers();
        } catch (error) {
          addNotification('error', error.response?.data?.error || "Xatolik yuz berdi");
        }
      }
    });
  };

  const handleDeactivate = (id, currentStatus) => {
    const actionText = currentStatus ? "faolsizlantirmoqchimisiz" : "faollashtirmoqchimisiz";
    const statusText = currentStatus ? "Faolsizlantirish" : "Faollashtirish";
    setConfirmModal({
      isOpen: true,
      title: `Xodimni ${statusText.toLowerCase()}`,
      message: `Haqiqatan ham bu xodimni ${actionText}?`,
      type: currentStatus ? 'warning' : 'success',
      confirmText: `Ha, ${statusText.toLowerCase()}`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await api.patch(`/admin/users/${id}`, { isActive: !currentStatus });
          addNotification('success', "Xodim holati o'zgartirildi");
          fetchUsers();
        } catch (error) {
          addNotification('error', "Xatolik yuz berdi");
        }
      }
    });
  };

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'OPERATOR', workingHours: '09:00 - 18:00' });
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({ 
      name: user.name, 
      email: user.email, 
      password: '', 
      role: user.role,
      workingHours: user.workingHours || '09:00 - 18:00'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingUser) {
        const data = { 
          name: formData.name, 
          role: formData.role,
          workingHours: formData.workingHours
        };
        if (formData.password) data.password = formData.password;
        await api.patch(`/admin/users/${editingUser.id}`, data);
        addNotification('success', "Xodim ma'lumotlari yangilandi");
      } else {
        await api.post('/admin/users', formData);
        addNotification('success', "Yangi xodim qo'shildi");
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (error) {
      addNotification('error', error.response?.data?.error || "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Xodimlar Boshqaruvi</h1>
          <p className="text-dark-400 text-sm">Tizim foydalanuvchilari va operatorlarni boshqarish</p>
        </div>
        <button className="btn-primary" onClick={openAddModal}>
          <Plus className="w-5 h-5" />
          Yangi Xodim
        </button>
      </div>

      <div className="card glass p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-dark-900/50 border-b border-dark-800 text-dark-300 text-sm">
                <th className="p-4 font-medium">Xodim</th>
                <th className="p-4 font-medium">Rol</th>
                <th className="p-4 font-medium">Ish vaqti</th>
                <th className="p-4 font-medium">Holat</th>
                <th className="p-4 font-medium">Lidlar (Jami)</th>
                <th className="p-4 font-medium text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-dark-400">Yuklanmoqda...</td>
                </tr>
              ) : users.map((u) => (
                <tr key={u.id} className="border-b border-dark-800/50 hover:bg-dark-800/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-dark-800 border border-dark-700 flex items-center justify-center text-dark-300">
                        {u.role === 'ADMIN' ? (
                          <Shield className="w-5 h-5 text-purple-400" />
                        ) : u.role === 'TEACHER' ? (
                          <BookOpen className="w-5 h-5 text-emerald-400" />
                        ) : u.role === 'SMM' ? (
                          <Smartphone className="w-5 h-5 text-pink-400" />
                        ) : (
                          <User className="w-5 h-5 text-blue-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium">{u.name}</p>
                        <p className="text-xs text-dark-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`badge ${
                      u.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 
                      u.role === 'TEACHER' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                      u.role === 'SMM' ? 'bg-pink-500/20 text-pink-400 border-pink-500/30' :
                      'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    }`}>
                      {u.role === 'ADMIN' ? 'Admin' : u.role === 'TEACHER' ? "O'qituvchi" : u.role === 'SMM' ? 'SMM / Media' : 'Operator'}
                    </span>
                  </td>
                  <td className="p-4 text-dark-300">
                    {u.workingHours || '09:00 - 18:00'}
                  </td>
                  <td className="p-4">
                    {u.isActive ? (
                      <span className="flex items-center gap-1.5 text-green-400 text-xs font-medium">
                        <CheckCircle className="w-4 h-4" /> Faol
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-red-400 text-xs font-medium">
                        <XCircle className="w-4 h-4" /> Nofaol
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-dark-300">{u._count?.leads || 0} ta</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => openEditModal(u)}
                        className="p-2 text-dark-400 hover:text-blue-400 transition-colors rounded-lg hover:bg-blue-500/10"
                        title="Tahrirlash"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeactivate(u.id, u.isActive)}
                        className={`p-2 transition-colors rounded-lg ${u.isActive ? 'text-dark-400 hover:text-yellow-400 hover:bg-yellow-500/10' : 'text-dark-400 hover:text-green-400 hover:bg-green-500/10'}`}
                        title={u.isActive ? "Faolsizlantirish" : "Faollashtirish"}
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(u.id, u.name)}
                        className="p-2 text-dark-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                        title="Butunlay o'chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in">
          <div className="card glass w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingUser ? "Xodimni tahrirlash" : "Yangi xodim qo'shish"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-dark-400 hover:text-white transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">F.I.SH</label>
                <input
                  type="text"
                  required
                  className="input bg-dark-800"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Masalan: Sardor Eshmatov"
                />
              </div>
              
              <div>
                <label className="label">Email manzil</label>
                <input
                  type="email"
                  required={!editingUser}
                  disabled={!!editingUser}
                  className="input bg-dark-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="admin@crm.uz"
                />
              </div>

              <div>
                <label className="label">Parol {editingUser && <span className="text-dark-500 text-xs font-normal ml-1">(faqat o'zgartirish uchun)</span>}</label>
                <input
                  type="password"
                  required={!editingUser}
                  className="input bg-dark-800"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  placeholder={editingUser ? "Yangi parol (ixtiyoriy)" : "Parol"}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Rol</label>
                  <select
                    className="input bg-dark-800"
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="OPERATOR">Operator</option>
                    <option value="TEACHER">O'qituvchi</option>
                    <option value="SMM">SMM / Mobilograf</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="label">Ish vaqti</label>
                  <input
                    type="text"
                    className="input bg-dark-800"
                    value={formData.workingHours}
                    onChange={e => setFormData({...formData, workingHours: e.target.value})}
                    placeholder="09:00 - 18:00"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 btn-secondary justify-center">
                  Bekor qilish
                </button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary justify-center">
                  {saving ? "Saqlanmoqda..." : "Saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
