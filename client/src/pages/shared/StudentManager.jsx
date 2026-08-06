import { useState, useEffect } from 'react';
import { Plus, Search, User, XCircle, BookOpen, Mail, Lock, Unlock } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

export default function StudentManager() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.openRegister) {
      setIsRegModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  
  // Register Modal state
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    courseIds: []
  });

  // Course Access Modal state
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const { addNotification } = useNotification();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [studentsRes, coursesRes] = await Promise.all([
        api.get('/lms/students'),
        api.get('/lms/courses')
      ]);
      setStudents(studentsRes.data.students);
      setCourses(coursesRes.data.courses);
    } catch (error) {
      console.error(error);
      addNotification('error', "Ma'lumotlarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/lms/students/register', formData);
      addNotification('success', "Talaba profili muvaffaqiyatli yaratildi va paroli berildi!");
      setIsRegModalOpen(false);
      setFormData({ name: '', email: '', password: '', courseIds: [] });
      fetchData();
    } catch (error) {
      addNotification('error', error.response?.data?.error || "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCourse = async (studentId, courseId, hasAccess) => {
    try {
      if (hasAccess) {
        // Revoke access
        await api.post(`/lms/students/${studentId}/unenroll`, { courseId });
        addNotification('success', "Kursga ruxsat bekor qilindi");
      } else {
        // Grant access
        await api.post(`/lms/students/${studentId}/enroll`, { courseId });
        addNotification('success', "Kursga ruxsat berildi");
      }
      fetchData();
      
      // Update selectedStudent in modal if open
      if (selectedStudent && selectedStudent.id === studentId) {
        setSelectedStudent(prev => {
          const updatedEnrollments = hasAccess
            ? prev.enrollments.filter(e => e.courseId !== courseId)
            : [...prev.enrollments, { courseId, course: courses.find(c => c.id === courseId) }];
          return { ...prev, enrollments: updatedEnrollments };
        });
      }
    } catch (error) {
      addNotification('error', error.response?.data?.error || "Xatolik yuz berdi");
    }
  };

  const toggleCourseCheckbox = (courseId) => {
    setFormData(prev => {
      const exists = prev.courseIds.includes(courseId);
      const updated = exists
        ? prev.courseIds.filter(id => id !== courseId)
        : [...prev.courseIds, courseId];
      return { ...prev, courseIds: updated };
    });
  };

  // Filter students
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-dark-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Talabalar Boshqaruvi</h1>
          <p className="text-dark-400 text-sm">O'quvchilarga ruxsat berish, profil va login parollarini sozlash</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="btn-primary" onClick={() => setIsRegModalOpen(true)}>
            <Plus className="w-5 h-5" />
            Yangi Talaba qo'shish
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            type="text"
            className="input pl-10"
            placeholder="Talaba ismi yoki email bo'yicha qidirish..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="text-dark-400 text-sm font-medium">
          Jami talabalar: <span className="text-white">{students.length} ta</span>
        </div>
      </div>

      <div className="card glass p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-dark-900/50 border-b border-dark-800 text-dark-300 text-sm">
                <th className="p-4 font-medium">Talaba</th>
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">Yozilgan Kurslari</th>
                <th className="p-4 font-medium">Qo'shilgan Sana</th>
                <th className="p-4 font-medium text-right">Kurs Ruxsati</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-dark-400">Yuklanmoqda...</td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-dark-400">Talabalar topilmadi</td>
                </tr>
              ) : filteredStudents.map((student) => (
                <tr key={student.id} className="border-b border-dark-800/50 hover:bg-dark-800/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-dark-800 border border-dark-700 flex items-center justify-center text-blue-400 font-bold">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{student.name}</p>
                        <p className="text-xs text-dark-400">ID: {student.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-dark-300">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-dark-400" />
                      {student.email}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1.5">
                      {student.enrollments.length === 0 ? (
                        <span className="text-dark-500 text-xs italic">Kurslarga ruxsat yo'q</span>
                      ) : student.enrollments.map((e) => (
                        <span key={e.id} className="badge bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                          {e.course.title}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-dark-400">
                    {new Date(student.createdAt).toLocaleDateString('uz-UZ')}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedStudent(student);
                        setIsAccessModalOpen(true);
                      }}
                      className="btn-secondary py-1.5 px-3 text-xs"
                    >
                      <BookOpen className="w-3.5 h-3.5 mr-1" />
                      Ruxsatlarni boshqarish
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Student Modal */}
      {isRegModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in">
          <div className="card glass w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Plus className="w-6 h-6 text-blue-400" />
                Yangi Talaba Profili ochish
              </h2>
              <button onClick={() => setIsRegModalOpen(false)} className="text-dark-400 hover:text-white transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="label">Talaba F.I.SH.</label>
                <input
                  type="text"
                  required
                  className="input bg-dark-800"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Masalan: Dilshod Aliyev"
                />
              </div>

              <div>
                <label className="label">Email (Tizimga kirish logini)</label>
                <input
                  type="email"
                  required
                  className="input bg-dark-800"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="talaba@kasbtech.uz"
                />
              </div>

              <div>
                <label className="label">Parol</label>
                <input
                  type="password"
                  required
                  className="input bg-dark-800"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Kamida 6 ta belgi"
                />
              </div>

              <div>
                <label className="label mb-2 block">Darslarga Ruxsat berish (Kursni tanlang)</label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-dark-800 rounded-lg p-2.5 bg-dark-900/40">
                  {courses.map((course) => (
                    <label key={course.id} className="flex items-center gap-2.5 text-sm text-dark-300 cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={formData.courseIds.includes(course.id)}
                        onChange={() => toggleCourseCheckbox(course.id)}
                        className="rounded border-dark-700 bg-dark-800 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      {course.title}
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsRegModalOpen(false)} className="flex-1 btn-secondary justify-center">
                  Bekor qilish
                </button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary justify-center">
                  {saving ? "Yaratilmoqda..." : "Profilni yaratish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Course Access Management Modal */}
      {isAccessModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in">
          <div className="card glass w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Kurs Ruxsatlarini Boshqarish</h2>
                <p className="text-xs text-dark-400 mt-0.5">{selectedStudent.name} ({selectedStudent.email})</p>
              </div>
              <button onClick={() => setIsAccessModalOpen(false)} className="text-dark-400 hover:text-white transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {courses.map((course) => {
                const hasAccess = selectedStudent.enrollments.some(e => e.courseId === course.id);
                return (
                  <div key={course.id} className="flex items-center justify-between p-3 rounded-lg bg-dark-800/40 border border-dark-800">
                    <div className="flex items-center gap-2.5">
                      <BookOpen className="w-5 h-5 text-dark-400" />
                      <div>
                        <p className="text-sm font-medium text-white">{course.title}</p>
                        <p className="text-xs text-dark-500">Narxi: {parseFloat(course.price).toLocaleString()} so'm</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleToggleCourse(selectedStudent.id, course.id, hasAccess)}
                      className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                        hasAccess 
                          ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20' 
                          : 'bg-dark-800 text-dark-300 border-dark-700 hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/20'
                      }`}
                    >
                      {hasAccess ? (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          Ruxsat etilgan
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          Ruxsat berish
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="pt-5 border-t border-dark-800/60 mt-6 flex justify-end">
              <button onClick={() => setIsAccessModalOpen(false)} className="btn-secondary">
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
