import { useState, useEffect, useRef } from 'react';
import { Bot, Send, User, Sparkles, Trash2, Copy, Check, BookOpen, RefreshCw, AlertCircle, MessageSquare } from 'lucide-react';
import api from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';

export default function MentorBot() {
  const { showNotification } = useNotification();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: "Assalomu alaykum! Men Kasbtech Akademiyasining **Mentor Bot** intellektual yordamchisiman. 🤖\n\nQuyidagi mavzular bo'yicha savollaringizga ustozlarimiz kiritgan **Bilimlar Bazasi** asosida javob bera olaman. Menga savolingizni yo'llang!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchCourses = async () => {
    try {
      const res = await api.get('/lms/courses');
      setCourses(res.data.courses || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  const handleSend = async (textToSend) => {
    const query = textToSend || inputMessage;
    if (!query.trim() || loading) return;

    const userMsgId = Date.now().toString();
    const userMsg = {
      id: userMsgId,
      sender: 'user',
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setLoading(true);

    try {
      const res = await api.post('/lms/ai-mentor/chat', {
        message: query.trim(),
        courseId: selectedCourseId || null
      });

      const botMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: res.data.reply || 'Javob olindi.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        isError: true,
        text: "Kechirasiz, sun'iy intellekt bot bilan bog'lanishda xatolik yuz berdi. Qayta urinib ko'ring.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showNotification('Nusxalandi', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'bot',
        text: "Suhbat tarixi tozalandi. Qanday savolingiz bor?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const quickPrompts = [
    "Darslarni o'zlashtirish tartibi qanday?",
    "Uy vazifasini qanday topshiraman?",
    "KasbCoin va reyting tizimi haqida ma'lumot bering",
    "Guruh qoidalari va talablar nimalardan iborat?"
  ];

  return (
    <div className="max-w-5xl mx-auto flex flex-col h-[calc(100vh-7rem)] bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden glass shadow-2xl">
      {/* Header */}
      <div className="p-4 md:p-5 border-b border-dark-800 bg-dark-900/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/20">
              <Bot className="w-6 h-6 animate-pulse-soft" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-dark-900 rounded-full"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-bold text-white tracking-tight">Mentor Kasbtech Bot</h2>
              <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md bg-primary-500/20 text-primary-400 border border-primary-500/30">
                AI Knowledge RAG
              </span>
            </div>
            <p className="text-xs text-dark-400">Ustozlar kiritgan bilimlar bazasi bo'yicha onlayn maslahatchi</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Course filter select */}
          <div className="flex items-center gap-1.5 bg-dark-800/60 border border-dark-700/60 rounded-lg px-3 py-1.5 text-xs text-dark-200">
            <BookOpen className="w-3.5 h-3.5 text-primary-400 shrink-0" />
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="bg-transparent text-white text-xs outline-none cursor-pointer max-w-[140px] truncate"
            >
              <option value="" className="bg-dark-900 text-white">Barcha fanlar</option>
              {courses.map(c => (
                <option key={c.id} value={c.id} className="bg-dark-900 text-white">{c.title}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleClearChat}
            className="p-2 text-dark-400 hover:text-red-400 hover:bg-dark-800 rounded-lg transition-colors"
            title="Suhbatni tozalash"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 max-w-[88%] md:max-w-[80%] ${
              msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold ${
                msg.sender === 'user'
                  ? 'bg-primary-600 text-white'
                  : msg.isError
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-gradient-to-br from-primary-500 to-indigo-600 text-white'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div className="group relative">
              <div
                className={`p-3.5 md:p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.sender === 'user'
                    ? 'bg-primary-600 text-white rounded-tr-none shadow-lg shadow-primary-600/10'
                    : msg.isError
                    ? 'bg-red-500/10 border border-red-500/30 text-red-200 rounded-tl-none'
                    : 'bg-dark-800/80 border border-dark-700/60 text-dark-100 rounded-tl-none shadow-md'
                }`}
              >
                {msg.text}
              </div>

              <div className={`flex items-center gap-2 mt-1 px-1 text-[11px] text-dark-400 ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}>
                <span>{msg.timestamp}</span>
                {msg.sender === 'bot' && (
                  <button
                    onClick={() => handleCopy(msg.text, msg.id)}
                    className="opacity-0 group-hover:opacity-100 text-dark-400 hover:text-white transition-opacity p-0.5"
                    title="Nusxalash"
                  >
                    {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-3 max-w-[80%]">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-4 rounded-2xl rounded-tl-none bg-dark-800/80 border border-dark-700/60 flex items-center gap-2">
              <span className="w-2 h-2 bg-primary-400 rounded-full animate-ping"></span>
              <span className="text-xs text-dark-300">Bilimlar bazasi tahlil qilinmoqda...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="px-4 py-2 bg-dark-950/40 border-t border-dark-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[11px] font-semibold text-primary-400 shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Tezkor savollar:
        </span>
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            disabled={loading}
            className="px-2.5 py-1 bg-dark-800/60 hover:bg-primary-600/20 hover:border-primary-500/40 border border-dark-700/60 rounded-full text-xs text-dark-300 hover:text-primary-300 shrink-0 transition-all cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div className="p-3 md:p-4 bg-dark-900 border-t border-dark-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Mentor botga savolingizni yozing..."
            disabled={loading}
            className="flex-1 bg-dark-800/80 border border-dark-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-dark-400 focus:outline-none focus:border-primary-500 transition-colors"
          />

          <button
            type="submit"
            disabled={!inputMessage.trim() || loading}
            className="w-11 h-11 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center shrink-0 shadow-lg shadow-primary-600/20 transition-all"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
