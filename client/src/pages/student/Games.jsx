import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../lib/api';
import { 
  Trophy, 
  Zap, 
  Puzzle, 
  Sparkles, 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  ArrowRight,
  Gamepad2
} from 'lucide-react';

export default function StudentGames() {
  const { fetchCoinBalance } = useOutletContext() || {};
  const [activeTab, setActiveTab] = useState('menu'); // 'menu' | 'blitz' | 'match' | 'simulator' | 'leaderboard'
  const [gameLeaderboard, setGameLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [rewardNotification, setRewardNotification] = useState(null);

  // User stats stored locally & fetched
  const [gameCoinsEarned, setGameCoinsEarned] = useState(0);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      const res = await api.get('/lms/games/leaderboard');
      setGameLeaderboard(res.data.leaderboard || []);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const handleAwardCoins = async (amount, description, gameType) => {
    try {
      const res = await api.post('/lms/coins/award', { amount, description, gameType });
      if (res.data.success) {
        setGameCoinsEarned(prev => prev + amount);
        if (fetchCoinBalance) fetchCoinBalance();
        setRewardNotification({
          coins: amount,
          message: description
        });
        setTimeout(() => setRewardNotification(null), 4000);
        loadLeaderboard();
      }
    } catch (err) {
      console.error('Award error:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-900/60 via-indigo-900/50 to-blue-900/60 border border-purple-500/20 p-6 md:p-8 backdrop-blur-xl">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold">
              <Gamepad2 className="w-4 h-4 text-purple-400" />
              <span>Kasbtech Gamification Hub</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
              Interaktiv Ta'limiy O'yinlar 🎮
            </h1>
            <p className="text-dark-300 text-sm md:text-base max-w-2xl">
              1-8 mavzular bo'yicha bilimlaringizni sinang, reytingda 1-o'ringa ko'tariling va haqiqiy KasbCoin vaucherlarini yuting!
            </p>
          </div>

          {/* User Fast Stats Badge */}
          <div className="flex items-center gap-3 bg-dark-900/80 border border-purple-500/30 p-4 rounded-2xl shrink-0">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-2xl animate-pulse">
              🪙
            </div>
            <div>
              <p className="text-xs text-dark-400 font-medium">Jami O'yindan Yutildi</p>
              <p className="text-xl font-bold text-yellow-400">+{gameCoinsEarned} KasbCoin</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-2 border-t border-purple-500/20 pt-4">
          <button
            onClick={() => setActiveTab('menu')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'menu'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-dark-800/60 text-dark-300 hover:text-white hover:bg-dark-800'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>O'yinlar Menusi</span>
          </button>

          <button
            onClick={() => setActiveTab('blitz')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'blitz'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'bg-dark-800/60 text-dark-300 hover:text-white hover:bg-dark-800'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>1. Marketing Blitz</span>
          </button>

          <button
            onClick={() => setActiveTab('match')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'match'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-dark-800/60 text-dark-300 hover:text-white hover:bg-dark-800'
            }`}
          >
            <Puzzle className="w-4 h-4 text-emerald-400" />
            <span>2. Match Master</span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'simulator'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                : 'bg-dark-800/60 text-dark-300 hover:text-white hover:bg-dark-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>3. AI Marketer Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'leaderboard'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'bg-dark-800/60 text-dark-300 hover:text-white hover:bg-dark-800'
            }`}
          >
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span>O'yinlar Reytingi</span>
          </button>
        </div>
      </div>

      {/* Floating Reward Toast Notification */}
      {rewardNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-yellow-500 to-amber-600 text-dark-950 p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <div className="text-3xl">🪙</div>
          <div>
            <p className="font-extrabold text-base">+{rewardNotification.coins} KasbCoin Yutdingiz!</p>
            <p className="text-xs font-semibold opacity-90">{rewardNotification.message}</p>
          </div>
        </div>
      )}

      {/* Tab 1: MENU CARD SELECTION */}
      {activeTab === 'menu' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Blitz */}
          <div className="group bg-dark-900/60 border border-dark-800 hover:border-amber-500/50 rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Zap className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">1-O'YIN • VIKTORINA</span>
                <h3 className="text-xl font-bold text-white mt-1">Marketing Blitz Quiz ⚡</h3>
                <p className="text-dark-400 text-sm mt-2">
                  SWOT, Target Audience, UTP va Kopirayting bo'yicha 10 ta tezkor savol. Vaqtli timer va Combo bonuslar!
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-dark-300 pt-2 border-t border-dark-800">
                <span>⏱️ 15 soniya/savol</span>
                <span>🪙 Max +15 KasbCoin</span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('blitz')}
              className="mt-6 w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-dark-950 font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <span>Boshlash</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 2: Match Master */}
          <div className="group bg-dark-900/60 border border-dark-800 hover:border-emerald-500/50 rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <Puzzle className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">2-O'YIN • MOSLASHTIRISH</span>
                <h3 className="text-xl font-bold text-white mt-1">Match Master 🧩</h3>
                <p className="text-dark-400 text-sm mt-2">
                  Marketing atamalari, formula va misollarni to'g'ri juftliklarga moslashtiring. Xotira va bilim imtihoni!
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-dark-300 pt-2 border-t border-dark-800">
                <span>🧠 6 ta Juftlik</span>
                <span>🪙 Max +15 KasbCoin</span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('match')}
              className="mt-6 w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-dark-950 font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <span>Boshlash</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 3: AI Marketer Simulator */}
          <div className="group bg-dark-900/60 border border-dark-800 hover:border-cyan-500/50 rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/10 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">3-O'YIN • SIMULYATOR</span>
                <h3 className="text-xl font-bold text-white mt-1">AI Marketer Simulator 🚀</h3>
                <p className="text-dark-400 text-sm mt-2">
                  Haqiqiy bizneskeyslarda Bosh Marketolog bo'ling. Hook, UTP va AI promptlarni tanlab sotuvni 3x ga oshiring!
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-dark-300 pt-2 border-t border-dark-800">
                <span>🎯 2 ta Strategik Keys</span>
                <span>🪙 Max +20 KasbCoin</span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('simulator')}
              className="mt-6 w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-dark-950 font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <span>Boshlash</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* GAME 1: MARKETING BLITZ QUIZ */}
      {activeTab === 'blitz' && (
        <BlitzQuizGame onComplete={handleAwardCoins} onBack={() => setActiveTab('menu')} />
      )}

      {/* GAME 2: MATCH MASTER */}
      {activeTab === 'match' && (
        <MatchMasterGame onComplete={handleAwardCoins} onBack={() => setActiveTab('menu')} />
      )}

      {/* GAME 3: AI MARKETER SIMULATOR */}
      {activeTab === 'simulator' && (
        <SimulatorGame onComplete={handleAwardCoins} onBack={() => setActiveTab('menu')} />
      )}

      {/* LEADERBOARD TAB */}
      {activeTab === 'leaderboard' && (
        <div className="bg-dark-900/60 border border-dark-800 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-400" />
                <span>O'yinlar bo'yicha Eng Kuchli Talabalar</span>
              </h2>
              <p className="text-dark-400 text-sm mt-1">Interaktiv o'yinlarda eng ko'p KasbCoin to'plagan liderlar</p>
            </div>
            <button
              onClick={loadLeaderboard}
              className="px-3 py-1.5 rounded-lg bg-dark-800 text-dark-300 hover:text-white text-xs font-semibold"
            >
              Yangilash
            </button>
          </div>

          {loadingLeaderboard ? (
            <div className="py-12 text-center text-dark-400">Yuklanmoqda...</div>
          ) : gameLeaderboard.length === 0 ? (
            <div className="py-12 text-center text-dark-400">Hali o'yin o'ynaganlar yo'q. Birinchi bo'lib siz o'ynang!</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-dark-800 text-dark-400 text-xs font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">O'rin</th>
                    <th className="py-3 px-4">Talaba</th>
                    <th className="py-3 px-4 text-center">O'ynalgan O'yinlar</th>
                    <th className="py-3 px-4 text-right">O'yindan Yutgan Koini</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800/50">
                  {gameLeaderboard.map((item, index) => {
                    const isGold = index === 0;
                    const isSilver = index === 1;
                    const isBronze = index === 2;

                    return (
                      <tr 
                        key={item.id}
                        className={`hover:bg-dark-800/30 transition-colors ${
                          isGold ? 'bg-yellow-500/5' : isSilver ? 'bg-slate-400/5' : isBronze ? 'bg-amber-700/5' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-bold text-sm">
                          {isGold && <span className="text-xl">🥇 1</span>}
                          {isSilver && <span className="text-xl">🥈 2</span>}
                          {isBronze && <span className="text-xl">🥉 3</span>}
                          {!isGold && !isSilver && !isBronze && <span className="text-dark-400">{index + 1}</span>}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center font-bold text-purple-300 overflow-hidden shrink-0">
                              {item.avatar ? <img src={item.avatar} alt="" className="w-full h-full object-cover" /> : item.name?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white flex items-center gap-1.5">
                                {item.name}
                                {isGold && <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">O'yin Qiroli</span>}
                              </p>
                              <p className="text-xs text-dark-400">{item.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center text-sm font-semibold text-dark-300">
                          {item.gamesPlayed} ta o'yin
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-yellow-400 text-sm">
                          +{item.gameCoins} 🪙
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   GAME 1 COMPONENT: MARKETING BLITZ QUIZ
   ========================================================================= */
function BlitzQuizGame({ onComplete, onBack }) {
  const QUESTIONS = [
    {
      q: "Shifokor qoidasi marketingda nimani anglatadi?",
      options: [
        "Tekshirmasdan turib darhol reklama (Target) yoqish",
        "Avval biznesni analiz/tashxis qilish, keyin reklama yoqish",
        "Tadbirkorlarga tibbiy xizmat ko'rsatish",
        "Har kuni Instagramda 5 ta post joylash"
      ],
      correct: 1
    },
    {
      q: "Domino's Pitsaning mashhur UTP va'dasi qanday edi?",
      options: [
        "Pitsa eng arzon va eng sifatli",
        "30 daqiqada yetkazamiz, kechiksak — bepul!",
        "Har bir pitsaga tekin pepsi beramiz",
        "O'zbekistondagi eng kattasi"
      ],
      correct: 1
    },
    {
      q: "AIDA formulasi nimani anglatadi?",
      options: [
        "Attention, Interest, Desire, Action",
        "Analiz, Indeks, Diagramma, Audit",
        "Avtomatlashtirish, Internet, Daromad, Agentlik",
        "Auditoriya, Ilmoq, Daromad, Aksiya"
      ],
      correct: 0
    },
    {
      q: "Mijoz Portreti (Avatar) va Maqsadli Auditoriya o'rtasidagi farq nimada?",
      options: [
        "Ular bir xil narsa",
        "Auditoriya = Katta stadion, Avatar = Bitta aniq muxlis tasviri",
        "Avatar = Faqat ayollar, Auditoriya = Erkaklar",
        "Auditoriya = AI, Avatar = Insho"
      ],
      correct: 1
    },
    {
      q: "Hook (Ilmoq) ning asosiy vazifasi nima?",
      options: [
        "Videoning oxirida rahmat aytish",
        "Mijoz e'tiborini dastlabki 3 soniyada ushlab qolish",
        "Raqobatchilarni haqorat qilish",
        "Sayt yaratish"
      ],
      correct: 1
    },
    {
      q: "Mukammal AI Prompt formulasi qaysi?",
      options: [
        "ROL + KONTEKST + MAQSAD + FORMAT",
        "NOMI + NARXI + MANZILI",
        "AI + CHATGPT + GEMINI",
        "SAVOL + JAVOB + MATN"
      ],
      correct: 0
    },
    {
      q: "Facebook Ad Library bilan nima qilish mumkin?",
      options: [
        "Raqobatchilarning faol reklamalarini 'Marketing josusligi' qilish",
        "Bepul pitsa buyurtma qilish",
        "Sayt kodlarini buzib kirish",
        "Instagram akkauntni bloklash"
      ],
      correct: 0
    },
    {
      q: "Odamchalashtirish (Table Read) qoidasi nima?",
      options: [
        "AI bergan matnni ovoz chiqarib o'qib, oddiy o'zbek tiliga tahrirlash",
        "Stol ustida ovqat yeyish",
        "Kitobiy rasmiy tilda gapirish",
        "AI yozgan matnni o'qimasdan joylash"
      ],
      correct: 0
    }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    if (gameOver || selectedOption !== null) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleAnswer(-1); // Timeout
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentIndex, selectedOption, gameOver]);

  const handleAnswer = (optionIdx) => {
    if (selectedOption !== null) return;
    setSelectedOption(optionIdx);

    const isCorrect = optionIdx === QUESTIONS[currentIndex].correct;
    if (isCorrect) {
      setScore(prev => prev + 10 + streak * 2);
      setStreak(prev => prev + 1);
    } else {
      setStreak(0);
    }

    setTimeout(() => {
      if (currentIndex + 1 < QUESTIONS.length) {
        setCurrentIndex(prev => prev + 1);
        setSelectedOption(null);
        setTimeLeft(15);
      } else {
        setGameOver(true);
        const finalCoins = Math.min(Math.round(score / 5) + 5, 15);
        onComplete(finalCoins, `Marketing Blitz Quiz-da ${score} ball to'plaganingiz uchun`, 'blitz');
      }
    }, 1200);
  };

  const currentQ = QUESTIONS[currentIndex];

  return (
    <div className="bg-dark-900/80 border border-amber-500/30 rounded-3xl p-6 md:p-8 space-y-6">
      {/* Quiz Top bar */}
      <div className="flex items-center justify-between border-b border-dark-800 pb-4">
        <button onClick={onBack} className="text-dark-400 hover:text-white text-xs font-semibold flex items-center gap-1">
          ← Menuga qaytish
        </button>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            <Zap className="w-4 h-4" />
            <span>Streak: x{streak}</span>
          </div>
          <div className="text-sm font-bold text-white">
            Ball: <span className="text-amber-400">{score}</span>
          </div>
        </div>
      </div>

      {!gameOver ? (
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Progress & Timer */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-dark-400 font-medium">
              <span>Savol {currentIndex + 1} / {QUESTIONS.length}</span>
              <span className={timeLeft <= 5 ? 'text-red-400 font-bold animate-ping' : 'text-amber-400'}>
                ⏱️ {timeLeft}s
              </span>
            </div>
            <div className="w-full bg-dark-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / QUESTIONS.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Text */}
          <div className="bg-dark-800/50 border border-dark-700/60 p-6 rounded-2xl">
            <h3 className="text-lg md:text-xl font-bold text-white leading-relaxed">
              {currentQ.q}
            </h3>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 gap-3">
            {currentQ.options.map((opt, idx) => {
              let btnStyle = "bg-dark-800/60 border-dark-700 text-dark-200 hover:bg-dark-700/80 hover:text-white";
              if (selectedOption !== null) {
                if (idx === currentQ.correct) {
                  btnStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold";
                } else if (idx === selectedOption) {
                  btnStyle = "bg-red-500/20 border-red-500 text-red-300";
                }
              }

              return (
                <button
                  key={idx}
                  disabled={selectedOption !== null}
                  onClick={() => handleAnswer(idx)}
                  className={`w-full p-4 rounded-xl border text-left text-sm md:text-base transition-all flex items-center justify-between ${btnStyle}`}
                >
                  <span>{opt}</span>
                  {selectedOption !== null && idx === currentQ.correct && (
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  )}
                  {selectedOption !== null && idx === selectedOption && idx !== currentQ.correct && (
                    <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 space-y-6 max-w-md mx-auto">
          <div className="w-20 h-20 bg-amber-500/20 border-2 border-amber-500/40 rounded-full flex items-center justify-center mx-auto text-4xl animate-bounce">
            🏆
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-white">Viktorina Yakunlandi!</h3>
            <p className="text-dark-300 text-sm mt-1">Siz {score} ball to'pladingiz!</p>
          </div>

          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 text-sm font-bold">
            🎉 +{Math.min(Math.round(score / 5) + 5, 15)} KasbCoin Hisobingizga O'tkazildi!
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setCurrentIndex(0);
                setSelectedOption(null);
                setScore(0);
                setStreak(0);
                setTimeLeft(15);
                setGameOver(false);
              }}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-dark-950 font-bold text-sm flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Qaytadan O'ynash</span>
            </button>
            <button
              onClick={onBack}
              className="px-4 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-white font-bold text-sm"
            >
              Menuga Qaytish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   GAME 2 COMPONENT: MATCH MASTER
   ========================================================================= */
function MatchMasterGame({ onComplete, onBack }) {
  const PAIRS = [
    { id: 1, term: "Domino's Pizza", match: "30 minutda pitsa / bepul" },
    { id: 2, term: "AIDA Formulasi", match: "Attention, Interest, Desire, Action" },
    { id: 3, term: "SWOT Analiz", match: "Strengths, Weaknesses, Opportunities, Threats" },
    { id: 4, term: "Shifokor Qoidasi", match: "Avval analitik tashxis, keyin reklama" },
    { id: 5, term: "Hook (Ilmoq)", match: "Dastlabki 3 soniyada e'tiborni ushlash" },
    { id: 6, term: "Mukammal Prompt", match: "Rol + Kontekst + Maqsad + Format" }
  ];

  const [cards, setCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [matchedIds, setMatchedIds] = useState([]);
  const [moves, setMoves] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    initGame();
  }, []);

  const initGame = () => {
    const list = [];
    PAIRS.forEach(p => {
      list.push({ cardId: `term-${p.id}`, pairId: p.id, text: p.term, type: 'term' });
      list.push({ cardId: `match-${p.id}`, pairId: p.id, text: p.match, type: 'match' });
    });
    // Shuffle
    setCards(list.sort(() => Math.random() - 0.5));
    setSelectedCards([]);
    setMatchedIds([]);
    setMoves(0);
    setCompleted(false);
  };

  const handleCardClick = (card) => {
    if (selectedCards.length === 2 || matchedIds.includes(card.pairId) || selectedCards.find(c => c.cardId === card.cardId)) return;

    const newSelected = [...selectedCards, card];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      setMoves(prev => prev + 1);
      if (newSelected[0].pairId === newSelected[1].pairId && newSelected[0].type !== newSelected[1].type) {
        // Correct match!
        setMatchedIds(prev => [...prev, card.pairId]);
        setSelectedCards([]);
        if (matchedIds.length + 1 === PAIRS.length) {
          setCompleted(true);
          onComplete(15, "Match Master o'yinida barcha juftliklarni topganingiz uchun", 'match');
        }
      } else {
        // Wrong match
        setTimeout(() => setSelectedCards([]), 1000);
      }
    }
  };

  return (
    <div className="bg-dark-900/80 border border-emerald-500/30 rounded-3xl p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-dark-800 pb-4">
        <button onClick={onBack} className="text-dark-400 hover:text-white text-xs font-semibold flex items-center gap-1">
          ← Menuga qaytish
        </button>
        <div className="text-sm font-bold text-white">
          Urinishlar: <span className="text-emerald-400">{moves}</span> | Topildi: <span className="text-emerald-400">{matchedIds.length} / {PAIRS.length}</span>
        </div>
      </div>

      {!completed ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {cards.map(card => {
            const isMatched = matchedIds.includes(card.pairId);
            const isSelected = selectedCards.some(c => c.cardId === card.cardId);

            return (
              <button
                key={card.cardId}
                onClick={() => handleCardClick(card)}
                disabled={isMatched}
                className={`h-28 p-3 rounded-2xl text-xs md:text-sm font-semibold transition-all duration-300 flex items-center justify-center text-center border ${
                  isMatched
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 cursor-default opacity-80'
                    : isSelected
                    ? 'bg-purple-600 border-purple-400 text-white scale-105 shadow-lg shadow-purple-600/30'
                    : 'bg-dark-800/80 border-dark-700 text-dark-200 hover:border-emerald-500/50 hover:bg-dark-700'
                }`}
              >
                <span>{card.text}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 space-y-6 max-w-md mx-auto">
          <div className="w-20 h-20 bg-emerald-500/20 border-2 border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-4xl animate-bounce">
            🧩
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-white">Match Master G'olibi!</h3>
            <p className="text-dark-300 text-sm mt-1">Siz {moves} ta urinishda barcha juftliklarni topdingiz!</p>
          </div>

          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-sm font-bold">
            🎉 +15 KasbCoin Hisobingizga Qo'shildi!
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={initGame}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-dark-950 font-bold text-sm flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Qaytadan O'ynash</span>
            </button>
            <button onClick={onBack} className="px-4 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-white font-bold text-sm">
              Menuga Qaytish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   GAME 3 COMPONENT: AI MARKETER SIMULATOR
   ========================================================================= */
function SimulatorGame({ onComplete, onBack }) {
  const SCENARIOS = [
    {
      id: 1,
      title: "1-Keys: Jizzaxdagi erkaklar kiyim do'koni sotuvini 3x ga oshirish",
      context: "Do'konda sifatli kostyum-shimlar bor, lekin mijozlar faqat narx so'rab kelib ketishmoqda.",
      options: [
        {
          text: "A) Reklamaga: 'Eng arzon va sifatli kostyumlar bizda' deb rasm qo'yish",
          score: 30,
          feedback: "Natija past! Arzon degan so'z mijozda shubha uyg'otadi va brendni 'poddelka' qilib ko'rsatadi."
        },
        {
          text: "B) Hook: 'Muhim uchrashuvda 1-taassurotni boy bermaslik siri!' + UTP: 'Agar o'lcham tushmasa, 24 soatda almashtirib beramiz'",
          score: 100,
          feedback: "A'lo strategiya! Status (Ego) triggeri va almashtirish kafolati mijozning qo'rquvini bittada yengdi! ROI +320%"
        },
        {
          text: "C) 10 daqiqalik uzun video chiqarib barcha matolarni tushuntirish",
          score: 40,
          feedback: "Videoni hech kim oxirigacha ko'rmaydi. 3 soniya qoidasi buzildi."
        }
      ]
    },
    {
      id: 2,
      title: "2-Keys: AI + Digital Marketing kursiga talabalarni jalb qilish",
      context: "Bozorda eski SMM kurslari ko'p. Talabalar 'AI o'rganish qiyin bo'lsa-chi?' deb qo'rqishmoqda.",
      options: [
        {
          text: "A) Hook: 'SMM o'rganish — vaqtni bekorga sarflash. Agar AI ishlatmasangiz!' + AI prompt orqali 30 daqiqada video tayyorlashni ko'rsatish",
          score: 100,
          feedback: "Dahshatli natija! Shok fakt Hook va amaliy yechim talabalarning vaqt yetishmasligi og'rig'iga aniq tegdi!"
        },
        {
          text: "B) 'Bizning o'quv markazimiz 5 yildan beri ishlaydi, keling o'qing' deb e'lon joylash",
          score: 35,
          feedback: "Buni hamma aytadi. Zerikarli va UTP mutlaqo yo'q."
        }
      ]
    }
  ];

  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [totalScore, setTotalScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  const handleSelectOption = (opt) => {
    setSelectedOption(opt);
  };

  const handleNext = () => {
    const addedScore = selectedOption ? selectedOption.score : 0;
    const newTotal = totalScore + addedScore;
    setTotalScore(newTotal);

    if (scenarioIndex + 1 < SCENARIOS.length) {
      setScenarioIndex(prev => prev + 1);
      setSelectedOption(null);
    } else {
      setCompleted(true);
      onComplete(20, "AI Marketer Simulator strategik keyslarini muvaffaqiyatli bajarganingiz uchun", 'simulator');
    }
  };

  const currentScen = SCENARIOS[scenarioIndex];

  return (
    <div className="bg-dark-900/80 border border-cyan-500/30 rounded-3xl p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-dark-800 pb-4">
        <button onClick={onBack} className="text-dark-400 hover:text-white text-xs font-semibold flex items-center gap-1">
          ← Menuga qaytish
        </button>
        <div className="text-sm font-bold text-white">
          Keys: <span className="text-cyan-400">{scenarioIndex + 1} / {SCENARIOS.length}</span>
        </div>
      </div>

      {!completed ? (
        <div className="space-y-6 max-w-2xl mx-auto">
          <div className="bg-dark-800/60 border border-dark-700 p-5 rounded-2xl space-y-2">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">STRATEGIK BOSH MARKETOLOG VAZIFASI</span>
            <h3 className="text-lg font-bold text-white">{currentScen.title}</h3>
            <p className="text-dark-300 text-sm">{currentScen.context}</p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold text-dark-400 uppercase">Qaysi strategik qarorni qabul qilasiz?</p>
            {currentScen.options.map((opt, idx) => {
              const isSelected = selectedOption === opt;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(opt)}
                  className={`w-full p-4 rounded-xl border text-left text-sm transition-all ${
                    isSelected 
                      ? 'bg-cyan-600/20 border-cyan-500 text-white font-semibold' 
                      : 'bg-dark-800/40 border-dark-700 text-dark-200 hover:bg-dark-700/60'
                  }`}
                >
                  {opt.text}
                </button>
              );
            })}
          </div>

          {selectedOption && (
            <div className={`p-4 rounded-xl text-sm font-semibold border ${
              selectedOption.score >= 80 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}>
              💡 Feedback: {selectedOption.feedback}
            </div>
          )}

          <div className="flex justify-end">
            <button
              disabled={!selectedOption}
              onClick={handleNext}
              className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 text-dark-950 font-bold text-sm transition-colors flex items-center gap-2"
            >
              <span>Keyingi Keysga O'tish</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 space-y-6 max-w-md mx-auto">
          <div className="w-20 h-20 bg-cyan-500/20 border-2 border-cyan-500/40 rounded-full flex items-center justify-center mx-auto text-4xl animate-bounce">
            🚀
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-white">AI Marketolog Simulyatsiyasi Yakunlandi!</h3>
            <p className="text-dark-300 text-sm mt-1">Siz muvaffaqiyatli strategiyalar tuzib +{totalScore} ball to'pladingiz!</p>
          </div>

          <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-300 text-sm font-bold">
            🎉 +20 KasbCoin Mukofoti Taqdim Etildi!
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setScenarioIndex(0);
                setSelectedOption(null);
                setTotalScore(0);
                setCompleted(false);
              }}
              className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-dark-950 font-bold text-sm flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Qaytadan O'ynash</span>
            </button>
            <button onClick={onBack} className="px-4 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-white font-bold text-sm">
              Menuga Qaytish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
