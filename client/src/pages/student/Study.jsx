import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Play, 
  Lock, 
  CheckCircle, 
  FileText, 
  Send, 
  Check, 
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Clock,
  Video,
  AlertCircle
} from 'lucide-react';
import api from '../../lib/api';
import SecureYoutubePlayer from '../../components/SecureYoutubePlayer';

export default function StudentStudy() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [modules, setModules] = useState([]);
  const [courseProgress, setCourseProgress] = useState(0);
  const [selectedLesson, setSelectedLesson] = useState(null);
  
  // Lesson Detail states
  const [lessonDetail, setLessonDetail] = useState(null);
  const [watermark, setWatermark] = useState({ text: '', ip: '' });
  const [homeworkStatus, setHomeworkStatus] = useState('NOT_SUBMITTED');
  const [homeworkDetails, setHomeworkDetails] = useState(null);

  // Homework Upload state
  const [homeworkFile, setHomeworkFile] = useState(null);
  const [homeworkText, setHomeworkText] = useState('');
  const [submittingHw, setSubmittingHw] = useState(false);

  // Quiz Taker states
  const [quiz, setQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [quizResult, setQuizResult] = useState(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('description'); // description, homework, quiz
  const [isDescExpanded, setIsDescExpanded] = useState(true);

  // Floating Watermark position state
  const [watermarkPos, setWatermarkPos] = useState({ top: 10, left: 10 });
  const watermarkTimer = useRef(null);

  useEffect(() => {
    fetchCourseDetails();
  }, [courseId]);

  useEffect(() => {
    if (selectedLesson && !selectedLesson.isLocked) {
      fetchLessonDetails(selectedLesson.id);
    }
  }, [selectedLesson]);

  // Randomize Watermark Position
  useEffect(() => {
    if (lessonDetail) {
      watermarkTimer.current = setInterval(() => {
        const top = Math.floor(Math.random() * 80) + 5; // 5% to 85%
        const left = Math.floor(Math.random() * 70) + 5; // 5% to 75%
        setWatermarkPos({ top, left });
      }, 8000); // changes every 8 seconds
    }
    return () => {
      if (watermarkTimer.current) clearInterval(watermarkTimer.current);
    };
  }, [lessonDetail]);

  // Anti-copy, anti-devtools, anti-print and screen capture deterrents
  useEffect(() => {
    const preventActions = (e) => {
      if (e.type === 'contextmenu') {
        e.preventDefault();
      }
      if (e.type === 'copy' || e.type === 'cut' || e.type === 'paste') {
        e.preventDefault();
        alert('Ruxsatsiz nusxa olish va matn joylashtirish taqiqlangan!');
      }
      if (e.type === 'dragstart') {
        e.preventDefault();
      }
    };

    const preventKeys = (e) => {
      // Block F12, Ctrl+Shift+I/C/J, Ctrl+U, Ctrl+S, Ctrl+P
      if (
        e.keyCode === 123 || 
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 67 || e.keyCode === 74)) || 
        (e.ctrlKey && e.keyCode === 85) || 
        (e.ctrlKey && e.keyCode === 83) || 
        (e.ctrlKey && e.keyCode === 80)
      ) {
        e.preventDefault();
        alert('Xavfsizlik choralari sababli ushbu amal taqiqlangan!');
        return false;
      }
    };

    // Console clearing and debugger loop to deter devtools inspecting
    const devtoolsTimer = setInterval(() => {
      const start = new Date();
      debugger; 
      const end = new Date();
      if (end - start > 100) {
        console.clear();
      }
    }, 1000);

    document.addEventListener('contextmenu', preventActions);
    document.addEventListener('copy', preventActions);
    document.addEventListener('cut', preventActions);
    document.addEventListener('dragstart', preventActions);
    document.addEventListener('keydown', preventKeys);

    return () => {
      document.removeEventListener('contextmenu', preventActions);
      document.removeEventListener('copy', preventActions);
      document.removeEventListener('cut', preventActions);
      document.removeEventListener('dragstart', preventActions);
      document.removeEventListener('keydown', preventKeys);
      clearInterval(devtoolsTimer);
    };
  }, []);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/lms/courses/${courseId}/study`);
      setModules(res.data.modules || []);
      setCourseProgress(res.data.progress || 0);

      // Auto-select first unlocked lesson
      let foundFirst = null;
      for (const mod of res.data.modules) {
        for (const les of mod.lessons) {
          if (!les.isLocked) {
            foundFirst = les;
            break;
          }
        }
        if (foundFirst) break;
      }
      setSelectedLesson(foundFirst || res.data.modules[0]?.lessons[0] || null);
      setError('');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Kurs ma\'lumotlarini yuklashda xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLessonDetails = async (lessonId) => {
    try {
      setQuiz(null);
      setQuizResult(null);
      setQuizAnswers([]);
      setCurrentQuestionIndex(0);
      setHomeworkFile(null);
      setHomeworkText('');
      setIsDescExpanded(true);

      const res = await api.get(`/lms/lessons/${lessonId}`);
      setLessonDetail(res.data.lesson);
      setWatermark(res.data.watermark);

      // Re-map homework status from course structure
      const matchingModule = modules.find(m => m.lessons.some(l => l.id === lessonId));
      const matchingLesson = matchingModule?.lessons.find(l => l.id === lessonId);
      
      if (matchingLesson) {
        setHomeworkStatus(matchingLesson.homeworkStatus);
        setHomeworkDetails(matchingLesson.homeworkDetails);
      }

      // Pre-fetch quiz if tab is quiz
      fetchQuiz(lessonId);
    } catch (err) {
      console.error(err);
      setError('Dars ma\'lumotlarini yuklashda xatolik yuz berdi');
    }
  };

  const fetchQuiz = async (lessonId) => {
    try {
      const res = await api.get(`/lms/lessons/${lessonId}/quiz`);
      setQuiz(res.data.quiz);
      setQuizAnswers(new Array(res.data.quiz.questions.length).fill(-1));
    } catch (err) {
      setQuiz(null);
    }
  };

  // ==========================================
  // HOMEWORK SUBMISSION
  // ==========================================
  const handleHomeworkSubmit = async (e) => {
    e.preventDefault();
    if (!homeworkFile && !homeworkText) {
      alert('Iltimos, fayl tanlang yoki javob yozing!');
      return;
    }

    try {
      setSubmittingHw(true);
      const formData = new FormData();
      if (homeworkFile) {
        formData.append('file', homeworkFile);
      }
      formData.append('textResponse', homeworkText);

      await api.post(`/lms/lessons/${selectedLesson.id}/homework`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      alert('Vazifangiz topshirildi! Mentor tez orada tekshiradi.');
      
      // Refresh current study details
      const res = await api.get(`/lms/courses/${courseId}/study`);
      setModules(res.data.modules || []);
      setCourseProgress(res.data.progress || 0);

      // Reload lesson details
      fetchLessonDetails(selectedLesson.id);
    } catch (err) {
      console.error(err);
      alert('Vazifani yuklashda xatolik yuz berdi.');
    } finally {
      setSubmittingHw(false);
    }
  };

  // ==========================================
  // QUIZ SUBMISSION
  // ==========================================
  const handleQuizOptionSelect = (qIdx, optIdx) => {
    const updated = [...quizAnswers];
    updated[qIdx] = optIdx;
    setQuizAnswers(updated);
  };

  const handleQuizSubmit = async (e) => {
    e.preventDefault();
    if (quizAnswers.some(ans => ans === -1)) {
      alert('Iltimos, barcha test savollariga javob bering!');
      return;
    }

    try {
      setSubmittingQuiz(true);
      const res = await api.post(`/lms/quizzes/${quiz.id}/submit`, {
        answers: quizAnswers
      });
      setQuizResult(res.data);
      
      // Refresh course study logs (for progress meter)
      const studyRes = await api.get(`/lms/courses/${courseId}/study`);
      setModules(studyRes.data.modules || []);
      setCourseProgress(studyRes.data.progress || 0);
    } catch (err) {
      console.error(err);
      alert('Testni tekshirishda xatolik yuz berdi');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const url = lessonDetail?.videoUrl || '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  const youtubeId = (match && match[2].length === 11) ? match[2] : null;

  return (
    <div className="flex flex-col xl:flex-row gap-6 min-h-[calc(100vh-8rem)] select-none">
      
      {/* Sidebar: Course Modules & Lessons */}
      <div className="w-full xl:w-80 bg-dark-900 border border-dark-800 rounded-xl overflow-hidden flex flex-col flex-shrink-0">
        
        {/* Course Progress header */}
        <div className="p-4 border-b border-dark-800 bg-dark-850">
          <button 
            onClick={() => navigate('/student')}
            className="flex items-center gap-1.5 text-xs text-dark-400 hover:text-white mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kurslarimga qaytish
          </button>
          
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">O'qish jarayoni</h3>
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-dark-400">Tugallangan</span>
              <span className="text-primary-400">{courseProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-dark-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary-500 to-indigo-500 transition-all duration-300"
                style={{ width: `${courseProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Modules/Lessons Accordions */}
        <div className="flex-1 overflow-y-auto max-h-[50vh] xl:max-h-[60vh] divide-y divide-dark-800">
          {modules.map((mod) => (
            <div key={mod.id} className="p-3">
              <h4 className="text-xs font-bold text-dark-400 px-2 py-1.5 uppercase tracking-wide">
                Modul {mod.order}: {mod.title}
              </h4>
              
              <div className="mt-1 space-y-1">
                {mod.lessons.map((lesson) => {
                  const isSelected = selectedLesson?.id === lesson.id;
                  
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => setSelectedLesson(lesson)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-all duration-200 ${
                        isSelected 
                          ? 'bg-primary-600/20 text-white font-medium border border-primary-500/30' 
                          : 'text-dark-300 hover:bg-dark-800/50 hover:text-white'
                      }`}
                    >
                      <div className="flex items-start gap-2 pr-2">
                        {lesson.isLocked ? (
                          <Lock className="w-3.5 h-3.5 text-dark-500 mt-0.5 flex-shrink-0" />
                        ) : lesson.homeworkStatus === 'APPROVED' ? (
                          <CheckCircle className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Play className="w-3.5 h-3.5 text-primary-400 mt-0.5 flex-shrink-0" />
                        )}
                        <span className="line-clamp-2">{lesson.order}. {lesson.title}</span>
                      </div>
                      
                      {lesson.isLocked && (
                        <span className="text-[10px] text-dark-500 font-bold uppercase">Yopiq</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Study Workspace */}
      <div className="flex-1 flex flex-col gap-6">
        
        {loading ? (
          <div className="card text-center py-24 text-dark-400">Dars yuklanmoqda...</div>
        ) : error ? (
          <div className="card bg-dark-900 border-dark-800 p-8 text-center flex flex-col items-center justify-center py-24 space-y-4 shadow-xl">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <Lock className="w-8 h-8 text-red-400" />
            </div>
            
            <div className="max-w-md">
              <h3 className="font-extrabold text-white text-xl">Dostup Cheklangan</h3>
              <p className="text-sm text-dark-300 mt-2 leading-relaxed">
                {error}
              </p>
            </div>
            
            <button 
              onClick={() => navigate('/student')}
              className="btn-primary py-2 px-4 text-xs font-bold mt-4 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Kurslar katalogiga qaytish
            </button>
          </div>
        ) : selectedLesson && !selectedLesson.isLocked ? (
          // ==========================================
          // UNLOCKED LESSON WORKSPACE
          // ==========================================
          <div className="space-y-6">
            
            {/* Video Player Box with Floating Watermark */}
            <div className="bg-black border border-dark-800 rounded-2xl overflow-hidden aspect-video relative group shadow-2xl">
              
              {/* Dynamic anti-piracy floating watermark (rendered only for non-youtube stream, youtube handles its own for fullscreen support) */}
              {lessonDetail && watermark?.text && !youtubeId && (
                <div 
                  className="absolute pointer-events-none z-30 select-none text-[11px] sm:text-xs font-bold text-white/20 bg-black/10 px-2 py-1 rounded backdrop-blur-[1px] transition-all duration-1000 ease-in-out border border-white/5"
                  style={{ 
                    top: `${watermarkPos.top}%`, 
                    left: `${watermarkPos.left}%`,
                  }}
                >
                  {watermark.text} ({watermark.ip})
                </div>
              )}

              {/* Streaming Video Container */}
              <div className="w-full h-full relative">
                {(() => {
                  if (youtubeId) {
                    return (
                      <SecureYoutubePlayer
                        youtubeId={youtubeId}
                        watermarkText={watermark?.text}
                        watermarkIp={watermark?.ip}
                        watermarkPos={watermarkPos}
                      />
                    );
                  } else {
                    return (
                      <iframe 
                        src={`https://iframe.mediadelivery.net/embed/123456/${lessonDetail?.videoUrl}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`}
                        loading="lazy"
                        className="w-full h-full border-0 absolute top-0 left-0"
                        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                        allowFullScreen={true}
                      />
                    );
                  }
                })()}
              </div>

            </div>

            {/* Lesson Info Header */}
            <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div>
                  <h2 className="text-xl font-bold text-white">{lessonDetail?.title}</h2>
                  <p className="text-xs text-dark-400 mt-1 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    Davomiyligi: {Math.round((lessonDetail?.duration || 0) / 60)} daqiqa
                  </p>
                </div>
                
                {/* Tabs selection */}
                <div className="flex gap-2 bg-dark-850 p-1 rounded-lg border border-dark-700">
                  <button 
                    onClick={() => setTab('description')} 
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === 'description' ? 'bg-primary-600 text-white' : 'text-dark-300 hover:text-white'}`}
                  >
                    Vazifa Sharti
                  </button>
                  <button 
                    onClick={() => setTab('homework')} 
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === 'homework' ? 'bg-primary-600 text-white' : 'text-dark-300 hover:text-white'}`}
                  >
                    Uy Vazifasini Topshirish
                  </button>
                  {quiz && (
                    <button 
                      onClick={() => setTab('quiz')} 
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === 'quiz' ? 'bg-primary-600 text-white' : 'text-dark-300 hover:text-white'}`}
                    >
                      Dars Testi (Quiz)
                    </button>
                  )}
                </div>
              </div>

              {/* Tab Content Rendering */}
              <div className="mt-6 border-t border-dark-800 pt-5">
                
                {/* TAB 1: DESCRIPTION */}
                {tab === 'description' && (
                  <div className="space-y-4">
                    <div 
                      onClick={() => setIsDescExpanded(!isDescExpanded)}
                      className="flex items-center justify-between pb-3 border-b border-dark-800 cursor-pointer group select-none"
                    >
                      <h3 className="font-bold text-white text-sm flex items-center gap-2 group-hover:text-primary-400 transition-colors">
                        <FileText className="w-4.5 h-4.5 text-primary-400" />
                        Dars tavsifi va Uy vazifasi sharti
                      </h3>
                      <button className="text-dark-400 group-hover:text-white transition-colors">
                        {isDescExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    
                    {isDescExpanded && (
                      <div className="p-4 bg-dark-850/40 border border-dark-800 rounded-xl mt-2 transition-all duration-300">
                        <p className="text-sm text-dark-200 whitespace-pre-line leading-relaxed">
                          {lessonDetail?.description || 'Ushbu dars uchun matnli tavsif kiritilmagan.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: HOMEWORK SUBMISSION */}
                {tab === 'homework' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-dark-800 pb-3">
                      <h3 className="font-bold text-white text-sm">Uy vazifasi holati</h3>
                      
                      <span className={`badge ${
                        homeworkStatus === 'APPROVED' ? 'badge-success' :
                        homeworkStatus === 'PENDING' ? 'badge-progress' :
                        homeworkStatus === 'REJECTED' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        'badge-archived'
                      }`}>
                        {homeworkStatus === 'APPROVED' ? 'Qabul qilindi (APPROVED)' :
                         homeworkStatus === 'PENDING' ? 'Tekshirilmoqda (PENDING)' :
                         homeworkStatus === 'REJECTED' ? 'Rad etildi (REJECTED)' :
                         'Topshirilmagan'}
                      </span>
                    </div>

                    {/* Show reviewer details and feedback if checked */}
                    {homeworkDetails && (homeworkDetails.grade !== null || homeworkDetails.feedback) && (
                      <div className={`p-4 rounded-lg border ${homeworkStatus === 'APPROVED' ? 'bg-green-500/5 border-green-500/20 text-green-200' : 'bg-red-500/5 border-red-500/20 text-red-200'} text-xs space-y-2`}>
                        <p className="font-bold text-white">Mentor taqrizi:</p>
                        {homeworkDetails.grade !== null && (
                          <p>
                            <strong>Bahosi:</strong> {homeworkDetails.grade} / 100
                            {homeworkDetails.grade >= 60 && ` (🪙 +${Math.round(homeworkDetails.grade / 10)} koin qo'shildi)`}
                          </p>
                        )}
                        {homeworkDetails.feedback && <p><strong>Fikr-mulohaza:</strong> {homeworkDetails.feedback}</p>}
                      </div>
                    )}

                    {/* Upload / Submission form */}
                    {(homeworkStatus === 'NOT_SUBMITTED' || homeworkStatus === 'REJECTED') ? (
                      <form onSubmit={handleHomeworkSubmit} className="space-y-4">
                        <div>
                          <label className="label">Fayl yuklash (ZIP, RAR, PDF, Word, Excel, Rasm)</label>
                          <input 
                            type="file" 
                            accept=".zip,.rar,.pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.csv"
                            onChange={(e) => setHomeworkFile(e.target.files[0])}
                            className="block w-full text-xs text-dark-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-dark-800 file:text-dark-100 hover:file:bg-dark-700 cursor-pointer"
                          />
                        </div>

                        <div>
                          <label className="label">Javob matni (Muqobil variant yoki izoh)</label>
                          <textarea 
                            rows="4"
                            className="input text-xs" 
                            placeholder="Vazifa bo'yicha yozma javobingiz yoki havolalarni shu yerda yozib qoldirishingiz mumkin..."
                            value={homeworkText} 
                            onChange={(e) => setHomeworkText(e.target.value)} 
                          />
                        </div>

                        <button 
                          type="submit" 
                          disabled={submittingHw}
                          className="btn-primary py-2 px-4 text-xs font-bold"
                        >
                          {submittingHw ? 'Topshirilmoqda...' : 'Vazifani Topshirish'}
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    ) : (
                      <div className="p-4 bg-dark-850 rounded-lg text-center text-xs text-dark-400 border border-dark-800">
                        {homeworkStatus === 'PENDING' 
                          ? 'Vazifangiz tekshirish uchun topshirilgan. Mentor tasdiqlaganidan keyin keyingi darsingiz ochiladi.' 
                          : 'Ushbu dars bo\'yicha topshiriq muvaffaqiyatli topshirilgan va qabul qilingan!'}
                      </div>
                    )}

                  </div>
                )}

                {/* TAB 3: QUIZ (TEST TAKING WIZARD) */}
                {tab === 'quiz' && quiz && (
                  <div className="space-y-6">
                    <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                      <HelpCircle className="w-5 h-5 text-yellow-500" />
                      Dars testi savollari
                    </h3>

                    {!quizResult ? (
                      <form onSubmit={handleQuizSubmit} className="space-y-6">
                        {/* Quiz Progress Bar */}
                        <div className="flex items-center justify-between text-xs text-dark-400 mb-2 font-bold">
                          <span>Savol {currentQuestionIndex + 1} / {quiz.questions.length}</span>
                          <span>{Math.round(((currentQuestionIndex + 1) / quiz.questions.length) * 100)}%</span>
                        </div>
                        <div className="w-full bg-dark-800 h-2 rounded-full overflow-hidden mb-6">
                          <div 
                            className="bg-primary-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
                          ></div>
                        </div>

                        {/* Current Question */}
                        <div className="card bg-dark-900 border-dark-800 p-6 sm:p-8 space-y-6 relative overflow-hidden">
                          {/* Decorative blur */}
                          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-600/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                          
                          <h4 className="text-lg sm:text-xl font-bold text-white leading-relaxed relative z-10">
                            {currentQuestionIndex + 1}. {quiz.questions[currentQuestionIndex].questionText}
                          </h4>
                          
                          <div className="grid grid-cols-1 gap-3 relative z-10 mt-6">
                            {quiz.questions[currentQuestionIndex].options.map((opt, optIdx) => (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() => {
                                  handleQuizOptionSelect(currentQuestionIndex, optIdx);
                                  if (currentQuestionIndex < quiz.questions.length - 1) {
                                    setTimeout(() => setCurrentQuestionIndex(prev => prev + 1), 400);
                                  }
                                }}
                                className={`w-full p-4 rounded-xl text-left text-sm font-medium border transition-all duration-300 transform ${
                                  quizAnswers[currentQuestionIndex] === optIdx
                                    ? 'bg-primary-600/20 text-white border-primary-500 shadow-[0_0_15px_rgba(59,130,246,0.15)] translate-x-1'
                                    : 'bg-dark-950 text-dark-200 border-dark-800 hover:bg-dark-850 hover:border-dark-700 hover:text-white'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
                                    quizAnswers[currentQuestionIndex] === optIdx
                                      ? 'bg-primary-500 text-white border-primary-500'
                                      : 'bg-dark-800 text-dark-400 border-dark-700'
                                  }`}>
                                    {String.fromCharCode(65 + optIdx)}
                                  </div>
                                  <span>{opt}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex items-center justify-between pt-4">
                          <button
                            type="button"
                            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentQuestionIndex === 0}
                            className={`btn-outline py-2 px-4 text-xs ${currentQuestionIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <ArrowLeft className="w-4 h-4 mr-1 inline" />
                            Oldingi
                          </button>
                          
                          {currentQuestionIndex < quiz.questions.length - 1 ? (
                            <button
                              type="button"
                              onClick={() => setCurrentQuestionIndex(prev => Math.min(quiz.questions.length - 1, prev + 1))}
                              className="btn-primary py-2 px-4 text-xs font-bold"
                            >
                              Keyingi
                              <ChevronRight className="w-4 h-4 ml-1 inline" />
                            </button>
                          ) : (
                            <button 
                              type="submit" 
                              disabled={submittingQuiz || quizAnswers.includes(-1)}
                              className={`py-2 px-6 text-xs font-bold rounded-lg transition-all duration-300 ${
                                quizAnswers.includes(-1)
                                  ? 'bg-dark-800 text-dark-500 cursor-not-allowed border border-dark-700'
                                  : 'btn-primary shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                              }`}
                            >
                              {submittingQuiz ? 'Tekshirilmoqda...' : 'Javoblarni yuborish'}
                              <Send className="w-4 h-4 ml-2 inline" />
                            </button>
                          )}
                        </div>
                      </form>
                    ) : (
                      // Quiz results card
                      <div className="card border-dark-800 p-6 space-y-4 text-center">
                        <div className="flex justify-center">
                          {quizResult.passed ? (
                            <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center text-green-400">
                              <Check className="w-6 h-6" />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 font-bold">
                              ✕
                            </div>
                          )}
                        </div>

                        <div>
                          <h4 className="font-extrabold text-white text-lg">
                            {quizResult.passed ? 'Tabriklaymiz! Testdan o\'tdingiz!' : 'Afsuski, yetarli ball to\'play olmadingiz.'}
                          </h4>
                          <p className="text-xs text-dark-400 mt-1">
                            To'g'ri javoblar: {quizResult.correctAnswers} / {quizResult.totalQuestions} ({quizResult.score}%)
                          </p>
                           {quizResult.passed && (
                             <p className="text-xs text-yellow-400 font-extrabold mt-3 animate-pulse">
                               {quizResult.rewardCoins > 0 ? (
                                 <>
                                   🪙 Testdan muvaffaqiyatli o'tganingiz uchun +{quizResult.rewardCoins} koin hisobingizga qo'shildi!
                                   {quizResult.bonusCoins > 0 && ` (va to'liq 100% natija uchun +${quizResult.bonusCoins} koin bonus!)`}
                                 </>
                               ) : (
                                 <>
                                   🎉 Testdan muvaffaqiyatli o'tdingiz! (Ushbu test uchun koinlar oldin berilgan)
                                 </>
                               )}
                             </p>
                           )}
                        </div>

                          <button 
                            type="button" 
                            onClick={() => {
                              setQuizResult(null);
                              setCurrentQuestionIndex(0);
                              setQuizAnswers(new Array(quiz.questions.length).fill(-1));
                            }} 
                            className="btn-primary-outline w-full justify-center text-xs"
                          >
                            Qayta urinib ko'rish
                          </button>
                        </div>
                    )}
                  </div>
                )}

              </div>
            </div>

          </div>
        ) : (
          // ==========================================
          // LOCKED LESSON DISPLAY SCREEN
          // ==========================================
          <div className="card bg-dark-900 border-dark-800 p-8 text-center flex flex-col items-center justify-center py-24 space-y-4 shadow-xl">
            <div className="w-16 h-16 rounded-full bg-dark-800 border border-dark-700 flex items-center justify-center text-dark-400">
              <Lock className="w-8 h-8 text-dark-500" />
            </div>
            
            <div className="max-w-md">
              <h3 className="font-extrabold text-white text-lg">Ushbu dars qulflangan</h3>
              <p className="text-sm text-dark-400 mt-2 leading-relaxed">
                {selectedLesson?.lockReason || 'Ushbu dars hali o\'quv rejangiz bo\'yicha ochilmagan.'}
              </p>
            </div>
            
            <div className="bg-dark-850 p-4 border border-dark-750 text-xs text-dark-400 rounded-lg flex items-start gap-2.5 max-w-sm mt-4 text-left">
              <AlertCircle className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Kasbtech Akademiya Qoidasi:</strong> Darslarni ketma-ket, oldingi uy vazifalarni a'lo darajada topshirib, mentorlar tasdig'idan o'tkazgandan keyin ochish ta'lim sifatini oshirishga xizmat qiladi.
              </p>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
