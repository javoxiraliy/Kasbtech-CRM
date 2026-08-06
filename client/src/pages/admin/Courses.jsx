import { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit2, 
  Video, 
  ArrowLeft, 
  FolderPlus, 
  FileQuestion,
  Clock,
  Unlock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronsUp,
  ChevronsDown,
  FileText
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

export default function Courses() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isTeacher = user?.role === 'TEACHER';

  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [activeTab, setActiveTab] = useState('courses'); // 'courses', 'teachers', 'students'
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals status
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);

  // Form states
  const [courseForm, setCourseForm] = useState({ id: null, title: '', description: '', price: '', isPublished: false, thumbnail: null, teacherId: '' });
  const [moduleForm, setModuleForm] = useState({ id: null, title: '', order: '' });
  const [lessonForm, setLessonForm] = useState({ id: null, moduleId: null, title: '', description: '', videoUrl: '', duration: '', order: '', dripDays: '' });
  
  // Accordion / Collapsible states
  const [collapsedModules, setCollapsedModules] = useState({});
  const [expandedLessons, setExpandedLessons] = useState({});

  const toggleModuleCollapse = (modId) => {
    setCollapsedModules(prev => ({
      ...prev,
      [modId]: !prev[modId]
    }));
  };

  const collapseAllModules = () => {
    const map = {};
    selectedCourse?.modules?.forEach(m => { map[m.id] = true; });
    setCollapsedModules(map);
  };

  const expandAllModules = () => {
    setCollapsedModules({});
  };

  const toggleLessonExpand = (lessonId) => {
    setExpandedLessons(prev => ({
      ...prev,
      [lessonId]: !prev[lessonId]
    }));
  };

  // Quiz states
  const [quizLesson, setQuizLesson] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizPassScore, setQuizPassScore] = useState(70);

  const fetchStudents = async () => {
    try {
      const res = await api.get('/lms/students');
      setStudents(res.data.students || []);
    } catch (err) {
      console.error('Error fetching students', err);
    }
  };

  useEffect(() => {
    fetchCourses();
    if (isAdmin) {
      fetchTeachers();
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'teachers' && teachers.length === 0) {
      fetchTeachers();
    } else if (activeTab === 'students' && students.length === 0 && isAdmin) {
      fetchStudents();
    }
  }, [activeTab]);

  const fetchTeachers = async () => {
    try {
      const res = await api.get('/lms/teachers');
      setTeachers(res.data.teachers || []);
    } catch (err) {
      console.error('Error fetching teachers', err);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/lms/courses');
      setCourses(res.data.courses || []);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Kurslarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseClick = async (course) => {
    try {
      setLoading(true);
      // Fetch study structure to get modules and lessons
      const res = await api.get(`/lms/courses/${course.id}/study`);
      setSelectedCourse({
        ...course,
        modules: res.data.modules || []
      });
    } catch (err) {
      setError('Kurs ma\'lumotlarini yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // COURSE CRUD
  // ==========================================
  const handleSaveCourse = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('title', courseForm.title);
      formData.append('description', courseForm.description);
      formData.append('price', courseForm.price);
      formData.append('isPublished', courseForm.isPublished);
      formData.append('teacherId', courseForm.teacherId || '');
      if (courseForm.thumbnail instanceof File) {
        formData.append('thumbnail', courseForm.thumbnail);
      }

      if (courseForm.id) {
        // Edit
        await api.put(`/lms/courses/${courseForm.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        // Create
        await api.post('/lms/courses', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      setIsCourseModalOpen(false);
      fetchCourses();
      if (selectedCourse && selectedCourse.id === courseForm.id) {
        // Refresh details
        handleCourseClick({ ...selectedCourse, title: courseForm.title });
      }
    } catch (err) {
      setError('Kursni saqlashda xatolik yuz berdi');
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Haqiqatan ham bu kursni butunlay o\'chirmoqchimisiz? Undagi barcha darslar va uy vazifalari ham o\'chib ketadi!')) return;
    try {
      await api.delete(`/lms/courses/${courseId}`);
      setSelectedCourse(null);
      fetchCourses();
    } catch (err) {
      setError('Kursni o\'chirishda xatolik yuz berdi');
    }
  };

  // ==========================================
  // MODULE CRUD
  // ==========================================
  const handleSaveModule = async (e) => {
    e.preventDefault();
    try {
      if (moduleForm.id) {
        await api.put(`/lms/modules/${moduleForm.id}`, { title: moduleForm.title, order: moduleForm.order });
      } else {
        await api.post(`/lms/courses/${selectedCourse.id}/modules`, { title: moduleForm.title, order: moduleForm.order });
      }
      setIsModuleModalOpen(false);
      handleCourseClick(selectedCourse);
    } catch (err) {
      setError('Modulni saqlashda xatolik yuz berdi');
    }
  };

  const handleDeleteModule = async (moduleId) => {
    if (!window.confirm('Ushbu modulni o\'chirmoqchimisiz?')) return;
    try {
      await api.delete(`/lms/modules/${moduleId}`);
      handleCourseClick(selectedCourse);
    } catch (err) {
      setError('Modulni o\'chirishda xatolik');
    }
  };

  // ==========================================
  // LESSON CRUD
  // ==========================================
  const handleSaveLesson = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: lessonForm.title,
        description: lessonForm.description,
        videoUrl: lessonForm.videoUrl,
        duration: lessonForm.duration,
        order: lessonForm.order,
        dripDays: lessonForm.dripDays || 0
      };

      if (lessonForm.id) {
        await api.put(`/lms/lessons/${lessonForm.id}`, payload);
      } else {
        await api.post(`/lms/modules/${lessonForm.moduleId}/lessons`, payload);
      }
      setIsLessonModalOpen(false);
      handleCourseClick(selectedCourse);
    } catch (err) {
      setError('Darsni saqlashda xatolik');
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm('Ushbu darsni o\'chirmoqchimisiz?')) return;
    try {
      await api.delete(`/lms/lessons/${lessonId}`);
      handleCourseClick(selectedCourse);
    } catch (err) {
      setError('Darsni o\'chirishda xatolik');
    }
  };

  // ==========================================
  // QUIZ BUILDER
  // ==========================================
  const openQuizModal = async (lesson) => {
    setQuizLesson(lesson);
    try {
      const res = await api.get(`/lms/lessons/${lesson.id}/quiz`);
      setQuizQuestions(res.data.quiz.questions || []);
      setQuizPassScore(res.data.quiz.passScore || 70);
    } catch (err) {
      // If quiz doesn't exist, start with 1 empty question
      setQuizQuestions([{ questionText: '', options: ['', ''], correctOptionIndex: 0 }]);
      setQuizPassScore(70);
    }
    setIsQuizModalOpen(true);
  };

  const handleAddQuestion = () => {
    setQuizQuestions([...quizQuestions, { questionText: '', options: ['', ''], correctOptionIndex: 0 }]);
  };

  const handleRemoveQuestion = (qIdx) => {
    const updated = quizQuestions.filter((_, idx) => idx !== qIdx);
    setQuizQuestions(updated);
  };

  const handleQuizQuestionChange = (qIdx, value) => {
    const updated = [...quizQuestions];
    updated[qIdx].questionText = value;
    setQuizQuestions(updated);
  };

  const handleQuizOptionChange = (qIdx, optIdx, value) => {
    const updated = [...quizQuestions];
    updated[qIdx].options[optIdx] = value;
    setQuizQuestions(updated);
  };

  const handleAddOption = (qIdx) => {
    const updated = [...quizQuestions];
    updated[qIdx].options.push('');
    setQuizQuestions(updated);
  };

  const handleRemoveOption = (qIdx, optIdx) => {
    const updated = [...quizQuestions];
    updated[qIdx].options = updated[qIdx].options.filter((_, idx) => idx !== optIdx);
    if (updated[qIdx].correctOptionIndex >= updated[qIdx].options.length) {
      updated[qIdx].correctOptionIndex = 0;
    }
    setQuizQuestions(updated);
  };

  const handleSaveQuiz = async (e) => {
    e.preventDefault();
    try {
      // Validate
      const invalid = quizQuestions.some(q => !q.questionText || q.options.some(opt => !opt));
      if (invalid) {
        alert('Iltimos, barcha savollar va variantlarni to\'ldiring!');
        return;
      }

      await api.post(`/lms/lessons/${quizLesson.id}/quiz`, {
        questions: quizQuestions,
        passScore: quizPassScore
      });

      setIsQuizModalOpen(false);
      alert('Dars testi muvaffaqiyatli saqlandi!');
    } catch (err) {
      console.error(err);
      alert('Testni saqlashda xatolik yuz berdi');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title / Action bar */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary-500" />
            Kurslar va Akademik Dasturlar
          </h1>
          <p className="text-sm text-dark-400">Onlayn darslarni boshqarish va ta'lim jarayonini sozlash</p>
        </div>
        {!selectedCourse && isAdmin && (
          <button 
            onClick={() => {
              setCourseForm({ id: null, title: '', description: '', price: '', isPublished: false, thumbnail: null, teacherId: '' });
              setIsCourseModalOpen(true);
            }} 
            className="btn-primary"
          >
            <Plus className="w-5 h-5" />
            Kurs Yaratish
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg flex items-center gap-2 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Admin tabs */}
      {isAdmin && !selectedCourse && (
        <div className="flex gap-2 border-b border-dark-800 pb-3">
          <button 
            onClick={() => setActiveTab('courses')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'courses' ? 'bg-primary-600 text-white' : 'text-dark-300 hover:text-white bg-dark-900/50 border border-dark-850'}`}
          >
            Kurslar Nazorati
          </button>
          <button 
            onClick={() => setActiveTab('teachers')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'teachers' ? 'bg-primary-600 text-white' : 'text-dark-300 hover:text-white bg-dark-900/50 border border-dark-850'}`}
          >
            O'qituvchilar Nazorati
          </button>
          <button 
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'students' ? 'bg-primary-600 text-white' : 'text-dark-300 hover:text-white bg-dark-900/50 border border-dark-850'}`}
          >
            Talabalar Nazorati
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-dark-400">Yuklanmoqda...</div>
      ) : !selectedCourse ? (
        activeTab === 'courses' ? (
          // ==========================================
          // COURSES LIST VIEW
          // ==========================================
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => (
              <div key={course.id} className="card-hover flex flex-col justify-between">
                <div>
                  <div className="aspect-video bg-dark-800 rounded-lg overflow-hidden relative mb-4 border border-dark-700">
                    {course.thumbnail ? (
                      <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-dark-500 bg-dark-900/50">
                        <BookOpen className="w-12 h-12" />
                      </div>
                    )}
                    <span className={`absolute top-2 right-2 badge ${course.isPublished ? 'badge-success' : 'badge-progress'}`}>
                      {course.isPublished ? 'Nashr etilgan' : 'Qoralama'}
                    </span>
                  </div>
                  
                  <h3 className="font-bold text-white text-lg mb-2">{course.title}</h3>
                  <p className="text-sm text-dark-400 line-clamp-3 mb-2">{course.description}</p>
                  <div className="text-xs mb-4">
                    {course.teacher ? (
                      <span className="text-emerald-400 font-medium">O'qituvchi: {course.teacher.name}</span>
                    ) : (
                      <span className="text-dark-500 italic">O'qituvchi biriktirilmagan</span>
                    )}
                  </div>
                </div>

                <div className="border-t border-dark-800 pt-4 flex justify-between items-center mt-4">
                  <span className="text-primary-400 font-bold text-lg">
                    {new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', maximumFractionDigits: 0 }).format(course.price)}
                  </span>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleCourseClick(course)} 
                      className="btn-secondary py-1.5 px-3 text-xs"
                    >
                      {isTeacher ? "Darslarni boshqarish" : "Darslarni ko'rish"} ({course._count?.modules || 0} modul)
                    </button>
                    
                    {isAdmin && (
                      <>
                        <button 
                          onClick={() => {
                            setCourseForm({ 
                              id: course.id, 
                              title: course.title, 
                              description: course.description, 
                              price: course.price, 
                              isPublished: course.isPublished, 
                              thumbnail: course.thumbnail,
                              teacherId: course.teacherId || ''
                            });
                            setIsCourseModalOpen(true);
                          }}
                          className="p-2 text-dark-400 hover:text-white rounded-lg hover:bg-dark-800 transition-colors"
                          title="Tahrirlash"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        
                        <button 
                          onClick={() => handleDeleteCourse(course.id)}
                          className="p-2 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 transition-colors"
                          title="O'chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {courses.length === 0 && (
              <div className="col-span-full text-center py-12 text-dark-400 border border-dashed border-dark-700 rounded-xl">
                Hozircha kurslar mavjud emas. Yangi kurs yaratish uchun yuqoridagi tugmani bosing.
              </div>
            )}
          </div>
        ) : activeTab === 'teachers' ? (
          // ==========================================
          // TEACHERS MONITORING VIEW
          // ==========================================
          <div className="card glass p-0 overflow-hidden border border-dark-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-dark-900/50 border-b border-dark-800 text-dark-300 text-sm">
                    <th className="p-4 font-medium">O'qituvchi / Kurator</th>
                    <th className="p-4 font-medium">Email</th>
                    <th className="p-4 font-medium">Roli</th>
                    <th className="p-4 font-medium">Biriktirilgan Kurslar</th>
                    <th className="p-4 font-medium text-right">Kurslar soni</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {teachers.map(t => {
                    const assigned = courses.filter(c => c.teacherId === t.id);
                    return (
                      <tr key={t.id} className="border-b border-dark-800/50 hover:bg-dark-800/30 transition-colors">
                        <td className="p-4 font-medium text-white">{t.name}</td>
                        <td className="p-4 text-dark-300">{t.email}</td>
                        <td className="p-4">
                          <span className={`badge ${t.role === 'TEACHER' ? 'badge-success' : 'badge-progress'}`}>
                            {t.role === 'TEACHER' ? "O'qituvchi" : "Mentor"}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1.5">
                            {assigned.length === 0 ? (
                              <span className="text-dark-500 text-xs italic">Kurs biriktirilmagan</span>
                            ) : assigned.map(c => (
                              <span key={c.id} className="badge bg-primary-500/10 text-primary-400 border border-primary-500/20 text-xs">
                                {c.title}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-right text-white font-semibold">{assigned.length} ta</td>
                      </tr>
                    );
                  })}
                  {teachers.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-dark-400">O'qituvchilar topilmadi</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          // ==========================================
          // STUDENTS MONITORING VIEW
          // ==========================================
          <div className="card glass p-0 overflow-hidden border border-dark-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-dark-900/50 border-b border-dark-800 text-dark-300 text-sm">
                    <th className="p-4 font-medium">Talaba</th>
                    <th className="p-4 font-medium">Email</th>
                    <th className="p-4 font-medium">Ruxsat Berilgan Kurslari</th>
                    <th className="p-4 font-medium text-right">Kurslar soni</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {students.map(s => (
                    <tr key={s.id} className="border-b border-dark-800/50 hover:bg-dark-800/30 transition-colors">
                      <td className="p-4 font-medium text-white">{s.name}</td>
                      <td className="p-4 text-dark-300">{s.email}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                          {s.enrollments?.length === 0 ? (
                            <span className="text-dark-500 text-xs italic">Ruxsat berilmagan</span>
                          ) : s.enrollments?.map(e => (
                            <span key={e.id} className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
                              {e.course?.title}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-right text-white font-semibold">{s.enrollments?.length || 0} ta</td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-dark-400">Talabalar topilmadi</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        // ==========================================
        // SINGLE COURSE MANAGEMENT VIEW
        // ==========================================
        <div className="space-y-6">
          {/* Back Navigation & Course Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-dark-900 border border-dark-800 p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedCourse(null)} 
                className="p-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg transition-colors border border-dark-600"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <span className="text-xs text-primary-400 font-bold uppercase tracking-wider">Kurs boshqaruvi</span>
                <h2 className="text-xl font-bold text-white">{selectedCourse.title}</h2>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <button 
                onClick={collapseAllModules}
                className="btn-secondary py-1.5 px-2.5 text-xs text-dark-300 hover:text-white"
                title="Barcha modullarni yig'ish"
              >
                <ChevronsUp className="w-3.5 h-3.5" />
                Barchasini Yig'ish
              </button>
              <button 
                onClick={expandAllModules}
                className="btn-secondary py-1.5 px-2.5 text-xs text-dark-300 hover:text-white"
                title="Barcha modullarni ochish"
              >
                <ChevronsDown className="w-3.5 h-3.5" />
                Barchasini Ochish
              </button>

              {isTeacher && (
                <button 
                  onClick={() => {
                    setModuleForm({ id: null, title: '', order: selectedCourse.modules.length + 1 });
                    setIsModuleModalOpen(true);
                  }} 
                  className="btn-primary py-1.5 px-3 text-xs"
                >
                  <FolderPlus className="w-4 h-4" />
                  Yangi Modul Qo'shish
                </button>
              )}
            </div>
          </div>

          {/* Module & Lessons List */}
          <div className="space-y-4">
            {selectedCourse.modules.map((mod) => {
              const isModuleCollapsed = !!collapsedModules[mod.id];
              return (
                <div key={mod.id} className="bg-dark-900 border border-dark-700/80 rounded-xl overflow-hidden shadow-lg transition-all">
                  
                  {/* Module header */}
                  <div 
                    onClick={() => toggleModuleCollapse(mod.id)}
                    className="bg-dark-800/70 hover:bg-dark-800 border-b border-dark-700/60 px-5 py-3.5 flex justify-between items-center cursor-pointer select-none transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <button 
                        type="button"
                        className="p-1 rounded-md text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
                      >
                        {isModuleCollapsed ? <ChevronDown className="w-5 h-5 text-primary-400" /> : <ChevronUp className="w-5 h-5 text-primary-400" />}
                      </button>

                      <span className="w-7 h-7 rounded-lg bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-xs font-bold text-primary-400">
                        {mod.order}
                      </span>
                      <h3 className="font-bold text-white text-base">{mod.title}</h3>
                      <span className="text-[11px] font-medium text-dark-400 bg-dark-900/80 px-2.5 py-0.5 rounded-full border border-dark-700">
                        {mod.lessons.length} ta dars
                      </span>
                    </div>

                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      {isTeacher && (
                        <>
                          <button 
                            onClick={() => {
                              setLessonForm({ id: null, moduleId: mod.id, title: '', description: '', videoUrl: '', duration: '', order: mod.lessons.length + 1, dripDays: '' });
                              setIsLessonModalOpen(true);
                            }}
                            className="btn-primary py-1 px-2.5 text-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Dars Qo'shish
                          </button>
                          
                          <button 
                            onClick={() => {
                              setModuleForm({ id: mod.id, title: mod.title, order: mod.order });
                              setIsModuleModalOpen(true);
                            }}
                            className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          
                          <button 
                            onClick={() => handleDeleteModule(mod.id)}
                            className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Lessons inside Module */}
                  {!isModuleCollapsed && (
                    <div className="divide-y divide-dark-800/60 bg-dark-950/40">
                      {mod.lessons.map((lesson) => {
                        const isDescExpanded = !!expandedLessons[lesson.id];
                        const hasDesc = lesson.description && lesson.description.trim().length > 0;
                        
                        return (
                          <div key={lesson.id} className="p-4 sm:px-6 hover:bg-dark-800/30 transition-colors">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span className="w-6 h-6 rounded-md bg-dark-800 border border-dark-700 flex items-center justify-center text-xs font-semibold text-dark-300 shrink-0">
                                  {lesson.order}
                                </span>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                                      <Video className="w-4 h-4 text-primary-400 shrink-0" />
                                      {lesson.title}
                                    </h4>
                                    
                                    {hasDesc && (
                                      <button 
                                        type="button"
                                        onClick={() => toggleLessonExpand(lesson.id)}
                                        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary-400 hover:text-primary-300 bg-primary-500/10 hover:bg-primary-500/20 px-2 py-0.5 rounded border border-primary-500/20 transition-colors"
                                      >
                                        <FileText className="w-3 h-3" />
                                        {isDescExpanded ? 'Ta\'rifni yopish' : 'Ta\'rifni ko\'rish'}
                                        {isDescExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                      </button>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-4 mt-1.5 text-[11px] text-dark-400">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-dark-500" />
                                      {Math.round((lesson.duration || 0) / 60)} daqiqa
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Unlock className="w-3 h-3 text-dark-500" />
                                      Drip: {lesson.dripDays || 0} kun
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                {isTeacher && (
                                  <>
                                    <button 
                                      onClick={() => openQuizModal(lesson)}
                                      className="btn-secondary py-1 px-2.5 text-xs text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/10"
                                    >
                                      <FileQuestion className="w-3.5 h-3.5" />
                                      Test Sozlash
                                    </button>

                                    <button 
                                      onClick={() => {
                                        setLessonForm({ id: lesson.id, moduleId: mod.id, title: lesson.title, description: lesson.description || '', videoUrl: lesson.videoUrl, duration: lesson.duration, order: lesson.order, dripDays: lesson.dripDays });
                                        setIsLessonModalOpen(true);
                                      }}
                                      className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700 transition-colors border border-dark-700"
                                      title="Darsni tahrirlash"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    
                                    <button 
                                      onClick={() => handleDeleteLesson(lesson.id)}
                                      className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 transition-colors border border-dark-700"
                                      title="Darsni o'chirish"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Collapsible Lesson Description Box */}
                            {hasDesc && isDescExpanded && (
                              <div className="mt-3 p-3.5 rounded-lg bg-dark-900 border border-dark-800 text-xs text-dark-300 whitespace-pre-wrap leading-relaxed animate-fade-in">
                                <div className="text-[11px] font-bold text-dark-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-primary-400" /> Dars Ta'rifi:
                                </div>
                                {lesson.description}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {mod.lessons.length === 0 && (
                        <div className="p-6 text-center text-xs text-dark-500">
                          Ushbu modulda darslar mavjud emas. Yangi dars qo'shish uchun tugmani bosing.
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })}

            {selectedCourse.modules.length === 0 && (
              <div className="text-center py-12 text-dark-400 border border-dashed border-dark-700 rounded-xl">
                Modullar mavjud emas. O'quv rejasini boshlash uchun "Yangi Modul Qo'shish" tugmasini bosing.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          COURSE FORM MODAL
      ========================================== */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="card w-full max-w-md space-y-4">
            <h3 className="font-bold text-white text-lg border-b border-dark-800 pb-2">
              {courseForm.id ? 'Kursni Tahrirlash' : 'Yangi Kurs Yaratish'}
            </h3>
            
            <form onSubmit={handleSaveCourse} className="space-y-4">
              <div>
                <label className="label">Kurs Nomi</label>
                <input 
                  type="text" 
                  className="input" 
                  value={courseForm.title} 
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} 
                  required 
                />
              </div>

              <div>
                <label className="label">Kurs Ta'rifi</label>
                <textarea 
                  className="input min-h-[80px]" 
                  value={courseForm.description} 
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Narxi (So'mda)</label>
                  <input 
                    type="number" 
                    className="input" 
                    value={courseForm.price} 
                    onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })} 
                    required 
                  />
                </div>
                
                <div className="flex flex-col justify-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-dark-200 select-none">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 accent-primary-600 rounded" 
                      checked={courseForm.isPublished} 
                      onChange={(e) => setCourseForm({ ...courseForm, isPublished: e.target.checked })} 
                    />
                    Nashr etilsin (Publish)
                  </label>
                </div>
              </div>

              <div>
                <label className="label">Thumbnail (Muqova rasmi)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setCourseForm({ ...courseForm, thumbnail: e.target.files[0] })}
                  className="block w-full text-xs text-dark-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-dark-800 file:text-dark-100 hover:file:bg-dark-700 cursor-pointer"
                />
              </div>

              <div>
                <label className="label">O'qituvchi / Kurator biriktirish</label>
                <select 
                  className="input bg-dark-800" 
                  value={courseForm.teacherId} 
                  onChange={(e) => setCourseForm({ ...courseForm, teacherId: e.target.value })}
                >
                  <option value="">Biriktirilmagan</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.role === 'TEACHER' ? "O'qituvchi" : 'Mentor'})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 border-t border-dark-800 pt-3">
                <button type="button" onClick={() => setIsCourseModalOpen(false)} className="btn-secondary">Bekor qilish</button>
                <button type="submit" className="btn-primary">Saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODULE FORM MODAL
      ========================================== */}
      {isModuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="card w-full max-w-md space-y-4">
            <h3 className="font-bold text-white text-lg border-b border-dark-800 pb-2">
              {moduleForm.id ? 'Modulni Tahrirlash' : 'Yangi Modul Qo\'shish'}
            </h3>
            
            <form onSubmit={handleSaveModule} className="space-y-4">
              <div>
                <label className="label">Modul Nomi</label>
                <input 
                  type="text" 
                  className="input" 
                  value={moduleForm.title} 
                  onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })} 
                  required 
                />
              </div>

              <div>
                <label className="label">Tartib raqami</label>
                <input 
                  type="number" 
                  className="input" 
                  value={moduleForm.order} 
                  onChange={(e) => setModuleForm({ ...moduleForm, order: e.target.value })} 
                  required 
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-dark-800 pt-3">
                <button type="button" onClick={() => setIsModuleModalOpen(false)} className="btn-secondary">Bekor qilish</button>
                <button type="submit" className="btn-primary">Saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          LESSON FORM MODAL
      ========================================== */}
      {isLessonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="card w-full max-w-md space-y-4">
            <h3 className="font-bold text-white text-lg border-b border-dark-800 pb-2">
              {lessonForm.id ? 'Darsni Tahrirlash' : 'Yangi Dars Qo\'shish'}
            </h3>
            
            <form onSubmit={handleSaveLesson} className="space-y-4">
              <div>
                <label className="label">Dars Mavzusi</label>
                <input 
                  type="text" 
                  className="input" 
                  value={lessonForm.title} 
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} 
                  required 
                />
              </div>

              <div>
                <label className="label">Dars ta'rifi, savol-javoblar va uyga vazifa (kunlik topshiriq) shartlari</label>
                <textarea 
                  className="input min-h-[100px]" 
                  placeholder="Dars ta'rifi, o'tilgan materiallar bo'yicha savol-javoblar hamda o'quvchi bajarishi kerak bo'lgan kunlik uyga vazifa topshiriqlarini batafsil kiriting..."
                  value={lessonForm.description} 
                  onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })} 
                />
              </div>

              <div>
                <label className="label">Video darslik havolasi (YouTube havola yoki video ID)</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Masalan: https://www.youtube.com/watch?v=... yoki video_id"
                  value={lessonForm.videoUrl} 
                  onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })} 
                  required 
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Davomiyligi (sekundda)</label>
                  <input 
                    type="number" 
                    className="input" 
                    value={lessonForm.duration} 
                    onChange={(e) => setLessonForm({ ...lessonForm, duration: e.target.value })} 
                    required 
                  />
                </div>
                
                <div>
                  <label className="label">Tartib №</label>
                  <input 
                    type="number" 
                    className="input" 
                    value={lessonForm.order} 
                    onChange={(e) => setLessonForm({ ...lessonForm, order: e.target.value })} 
                    required 
                  />
                </div>

                <div>
                  <label className="label">Drip (Kun)</label>
                  <input 
                    type="number" 
                    className="input" 
                    placeholder="0"
                    value={lessonForm.dripDays} 
                    onChange={(e) => setLessonForm({ ...lessonForm, dripDays: e.target.value })} 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-dark-800 pt-3">
                <button type="button" onClick={() => setIsLessonModalOpen(false)} className="btn-secondary">Bekor qilish</button>
                <button type="submit" className="btn-primary">Saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          QUIZ BUILDER MODAL
      ========================================== */}
      {isQuizModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="card w-full max-w-2xl space-y-4 my-8 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-dark-800 pb-2 sticky top-0 bg-dark-900 z-10">
              <h3 className="font-bold text-white text-lg">
                "{quizLesson?.title}" darsi testi (Quiz Builder)
              </h3>
              <button onClick={() => setIsQuizModalOpen(false)} className="text-dark-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveQuiz} className="space-y-6">
              <div>
                <label className="label">O'tish Foizi (%)</label>
                <input 
                  type="number" 
                  min="10" 
                  max="100" 
                  className="input w-24" 
                  value={quizPassScore} 
                  onChange={(e) => setQuizPassScore(e.target.value)} 
                  required 
                />
              </div>

              {/* Questions list */}
              <div className="space-y-6">
                {quizQuestions.map((question, qIdx) => (
                  <div key={qIdx} className="p-4 border border-dark-700 bg-dark-800/30 rounded-lg space-y-4 relative">
                    <button 
                      type="button" 
                      onClick={() => handleRemoveQuestion(qIdx)} 
                      className="absolute top-2 right-2 text-red-400 hover:text-red-300 text-xs p-1"
                    >
                      Savolni o'chirish
                    </button>

                    <div>
                      <label className="label">Savol {qIdx + 1}</label>
                      <input 
                        type="text" 
                        className="input" 
                        value={question.questionText} 
                        onChange={(e) => handleQuizQuestionChange(qIdx, e.target.value)} 
                        placeholder="Savol matnini kiriting"
                        required 
                      />
                    </div>

                    {/* Options */}
                    <div className="space-y-2">
                      <label className="label">Variantlar (To'g'ri javobni tanlang)</label>
                      
                      {question.options.map((option, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            name={`correct-opt-${qIdx}`} 
                            checked={question.correctOptionIndex === optIdx}
                            onChange={() => {
                              const updated = [...quizQuestions];
                              updated[qIdx].correctOptionIndex = optIdx;
                              setQuizQuestions(updated);
                            }}
                            className="w-4 h-4 accent-primary-500 cursor-pointer"
                          />
                          <input 
                            type="text" 
                            className="input text-xs py-1" 
                            value={option} 
                            onChange={(e) => handleQuizOptionChange(qIdx, optIdx, e.target.value)} 
                            placeholder={`Variant ${optIdx + 1}`}
                            required 
                          />
                          {question.options.length > 2 && (
                            <button 
                              type="button" 
                              onClick={() => handleRemoveOption(qIdx, optIdx)} 
                              className="text-red-400 hover:text-red-300 px-1"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}

                      <button 
                        type="button" 
                        onClick={() => handleAddOption(qIdx)}
                        className="text-xs text-primary-400 hover:underline flex items-center gap-1 pt-1"
                      >
                        + Variant qo'shish
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center border-t border-dark-800 pt-4">
                <button 
                  type="button" 
                  onClick={handleAddQuestion} 
                  className="btn-secondary text-xs"
                >
                  + Savol Qo'shish
                </button>

                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsQuizModalOpen(false)} className="btn-secondary">Bekor qilish</button>
                  <button type="submit" className="btn-primary">Testni Saqlash</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
