import { useState, useEffect } from 'react';
import { Brain, Plus, Search, Edit2, Trash2, BookOpen, User, X, Check, Loader2, Sparkles, HelpCircle, FileText } from 'lucide-react';
import api from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

export default function BotKnowledgeBase() {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [items, setItems] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    topic: '',
    question: '',
    content: '',
    courseId: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  useEffect(() => {
    fetchItems();
    fetchCourses();
  }, [selectedCourseId]);

  const fetchCourses = async () => {
    try {
      const res = await api.get('/lms/courses');
      setCourses(res.data.courses || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCourseId) params.courseId = selectedCourseId;
      if (search) params.search = search;

      const res = await api.get('/lms/bot-knowledge', { params });
      setItems(res.data.items || []);
    } catch (err) {
      console.error('Error fetching bot knowledge:', err);
      showNotification('Bilimlar bazasini yuklashda xatolik', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchItems();
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      topic: '',
      question: '',
      content: '',
      courseId: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      topic: item.topic || '',
      question: item.question || '',
      content: item.content || '',
      courseId: item.courseId || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.topic.trim() || !formData.content.trim()) {
      showNotification('Mavzu va kontent kiritilishi shart', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        topic: formData.topic.trim(),
        question: formData.question.trim() || null,
        content: formData.content.trim(),
        courseId: formData.courseId || null
      };

      if (editingItem) {
        await api.put(`/lms/bot-knowledge/${editingItem.id}`, payload);
        showNotification('Bilimlar bazasi yangilandi', 'success');
      } else {
        await api.post('/lms/bot-knowledge', payload);
        showNotification('Yangi bilim saqlandi', 'success');
      }

      setIsModalOpen(false);
      fetchItems();
    } catch (err) {
      console.error('Save knowledge error:', err);
      showNotification('Saqlashda xatolik yuz berdi', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/lms/bot-knowledge/${id}`);
      showNotification("Yozuv o'chirildi", 'success');
      setDeleteConfirmId(null);
      fetchItems();
    } catch (err) {
      console.error('Delete knowledge error:', err);
      showNotification("O'chirishda xatolik", 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-dark-900/80 p-6 rounded-2xl border border-dark-800 glass shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/20 shrink-0">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Bot Bilimlar Bazasi (Knowledge Base)
            </h1>
            <p className="text-xs md:text-sm text-dark-400 mt-1">
              Mentor Kasbtech Bot talabalarning savollariga faqat va faqat ushbu kiritilgan ma'lumotlar bo'yicha javob beradi.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-medium text-sm shadow-lg shadow-primary-600/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi Bilim Qo'shish</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <form onSubmit={handleSearchSubmit} className="md:col-span-2 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Mavzu, savol yoki kontent bo'yicha izlash..."
              className="w-full bg-dark-900 border border-dark-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-dark-400 focus:outline-none focus:border-primary-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-dark-800 hover:bg-dark-700 text-white text-sm font-medium rounded-xl border border-dark-700 transition-colors"
          >
            Izlash
          </button>
        </form>

        <div className="flex items-center gap-2">
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none cursor-pointer focus:border-primary-500"
          >
            <option value="">Barcha Fanlar</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List / Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-dark-400">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-2" />
          <p className="text-sm">Bilimlar bazasi yuklanmoqda...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center bg-dark-900/60 border border-dark-800 rounded-2xl glass">
          <Brain className="w-12 h-12 text-dark-500 mx-auto mb-3 opacity-50" />
          <h3 className="text-base font-semibold text-white">Bilimlar bazasi bo'sh</h3>
          <p className="text-xs text-dark-400 mt-1 max-w-md mx-auto">
            Hali hech qanday bilim kiritilmagan. Talabalar botdan unumli foydalana olishi uchun yangi bilim qo'shing.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary-600/20 text-primary-400 border border-primary-500/30 rounded-xl text-xs font-semibold hover:bg-primary-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Birinchi bilimni qo'shish
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-dark-900/80 border border-dark-800/80 hover:border-primary-500/40 glass shadow-md hover:shadow-xl transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-primary-500/10 text-primary-400 border border-primary-500/20 truncate max-w-[200px]">
                    📌 {item.topic}
                  </span>

                  {item.course && (
                    <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-dark-800 text-dark-300 border border-dark-700 shrink-0">
                      {item.course.title}
                    </span>
                  )}
                </div>

                {item.question && (
                  <div className="mb-2 text-xs font-medium text-dark-300 flex items-center gap-1.5 bg-dark-950/60 p-2 rounded-lg border border-dark-800">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{item.question}</span>
                  </div>
                )}

                <p className="text-sm text-dark-200 leading-relaxed whitespace-pre-wrap line-clamp-4 bg-dark-950/30 p-3 rounded-xl border border-dark-800/60">
                  {item.content}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-dark-800/80 flex items-center justify-between text-xs text-dark-400">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-dark-500" />
                  {item.createdBy?.name || 'Admin'}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditModal(item)}
                    className="p-1.5 text-dark-400 hover:text-primary-400 hover:bg-dark-800 rounded-lg transition-colors cursor-pointer"
                    title="Tahrirlash"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setDeleteConfirmId(item.id)}
                    className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-dark-800 rounded-lg transition-colors cursor-pointer"
                    title="O'chirish"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl glass space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-dark-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary-400" />
                {editingItem ? "Bilim Yozuvini Tahrirlash" : "Yangi Bilim Qo'shish"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-dark-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-dark-300 mb-1.5">
                  Mavzu Sarlavhasi <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  placeholder="Masalan: Python Sintaksisi va O'zgaruvchilar"
                  className="w-full bg-dark-800 border border-dark-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-dark-300 mb-1.5">
                  Tegishli Fan / Kurs (Ixtiyoriy)
                </label>
                <select
                  value={formData.courseId}
                  onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                  className="w-full bg-dark-800 border border-dark-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="">Barcha fanlar uchun umumiy</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-dark-300 mb-1.5">
                  Mavzuga oid Savol yoki Kalit So'zlar (Ixtiyoriy)
                </label>
                <input
                  type="text"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="Masalan: o'zgaruvchi yaratish, variable, types, integer"
                  className="w-full bg-dark-800 border border-dark-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-dark-300 mb-1.5">
                  Bilim Kontenti / Tushuntirish / Javob matni <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={6}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Bot talabaga beradigan qat'iy ma'lumot va tushuntirishlarni kiriting..."
                  className="w-full bg-dark-800 border border-dark-700 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-primary-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-medium text-dark-300 hover:text-white bg-dark-800 hover:bg-dark-700 rounded-xl transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-500 rounded-xl shadow-lg shadow-primary-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingItem ? "Yangilash" : "Saqlash"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-800 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl glass">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Yozuvni o'chirmoqchimisiz?</h3>
              <p className="text-xs text-dark-400 mt-1">Ushbu bilim bot omboridan o'chiriladi va bot bundan foydalana olmaydi.</p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs font-medium text-dark-300 bg-dark-800 hover:bg-dark-700 rounded-xl"
              >
                Bekor qilish
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-xl shadow-lg shadow-red-600/20"
              >
                Ha, O'chirish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
