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
  Gamepad2,
  Lock,
  Star,
  BookOpen,
  Filter,
  Layers
} from 'lucide-react';

export default function StudentGames() {
  const { fetchCoinBalance } = useOutletContext() || {};
  const [activeTab, setActiveTab] = useState('menu'); // 'menu' | 'blitz' | 'match' | 'simulator' | 'leaderboard'
  const [gameLeaderboard, setGameLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [rewardNotification, setRewardNotification] = useState(null);
  const [gameCoinsEarned, setGameCoinsEarned] = useState(0);

  // Level progress stored in localStorage
  const [levelProgress, setLevelProgress] = useState(() => {
    try {
      const saved = localStorage.getItem('kasbtech_game_levels');
      return saved ? JSON.parse(saved) : {
        blitz: { easy: 0, medium: 0, hard: 0 },
        match: { easy: 0, medium: 0, hard: 0 },
        simulator: { easy: 0, medium: 0, hard: 0 }
      };
    } catch {
      return {
        blitz: { easy: 0, medium: 0, hard: 0 },
        match: { easy: 0, medium: 0, hard: 0 },
        simulator: { easy: 0, medium: 0, hard: 0 }
      };
    }
  });

  const [selectedGameLevel, setSelectedGameLevel] = useState('easy'); // 'easy' | 'medium' | 'hard'
  const [selectedModuleCategory, setSelectedModuleCategory] = useState('all'); // 'all' | 'hormozi' | 'foundation' | 'web_target' | 'bot_sales'

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const saveLevelStars = (gameKey, levelKey, stars) => {
    setLevelProgress(prev => {
      const updated = {
        ...prev,
        [gameKey]: {
          ...prev[gameKey],
          [levelKey]: Math.max(prev[gameKey][levelKey] || 0, stars)
        }
      };
      try {
        localStorage.setItem('kasbtech_game_levels', JSON.stringify(updated));
      } catch (err) {
        console.error('Error saving level progress:', err);
      }
      return updated;
    });
  };

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
        setTimeout(() => setRewardNotification(null), 4500);
        loadLeaderboard();
      }
    } catch (err) {
      console.error('Award error:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-900/80 via-indigo-900/70 to-blue-900/80 border border-purple-500/30 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold tracking-wide">
              <BookOpen className="w-4 h-4 text-purple-400" />
              <span>Alex Hormozi "$100M Money Models" + KASBTECH Modulli Savollar Baza Tizimi</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
              Interaktiv Ta'limiy O'yinlar 🎮
            </h1>
            <p className="text-dark-300 text-sm md:text-base max-w-2xl leading-relaxed">
              Savollar endi **4 ta alohida Bo'lim va 3 ta Qiyinchilik darajasiga** ajratilgan! O'zingiz xohlagan bo'limni tanlab bilimingizni sinang!
            </p>
          </div>

          {/* User Fast Stats Badge */}
          <div className="flex items-center gap-4 bg-dark-900/90 border border-purple-500/30 p-4 rounded-2xl shrink-0 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-2xl animate-pulse">
              🪙
            </div>
            <div>
              <p className="text-xs text-dark-400 font-semibold uppercase tracking-wider">O'yindan Yutilgan KasbCoin</p>
              <p className="text-2xl font-black text-yellow-400">+{gameCoinsEarned} KasbCoin</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-2 border-t border-purple-500/20 pt-4 scrollbar-none">
          <button
            onClick={() => setActiveTab('menu')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'menu'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40 scale-105'
                : 'bg-dark-800/60 text-dark-300 hover:text-white hover:bg-dark-800'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>O'yinlar Menusi</span>
          </button>

          <button
            onClick={() => { setActiveTab('blitz'); setSelectedGameLevel('easy'); }}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'blitz'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/40 scale-105'
                : 'bg-dark-800/60 text-dark-300 hover:text-white hover:bg-dark-800'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>1. Marketing Blitz</span>
          </button>

          <button
            onClick={() => { setActiveTab('match'); setSelectedGameLevel('easy'); }}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'match'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/40 scale-105'
                : 'bg-dark-800/60 text-dark-300 hover:text-white hover:bg-dark-800'
            }`}
          >
            <Puzzle className="w-4 h-4 text-emerald-400" />
            <span>2. Match Master</span>
          </button>

          <button
            onClick={() => { setActiveTab('simulator'); setSelectedGameLevel('easy'); }}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'simulator'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/40 scale-105 font-bold'
                : 'bg-dark-800/60 text-dark-300 hover:text-white hover:bg-dark-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>3. AI Marketer Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'leaderboard'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40 scale-105'
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
        <div className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 text-dark-950 p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce border border-yellow-300">
          <div className="text-3xl">🪙</div>
          <div>
            <p className="font-extrabold text-base">+{rewardNotification.coins} KasbCoin Yutdingiz!</p>
            <p className="text-xs font-bold opacity-90">{rewardNotification.message}</p>
          </div>
        </div>
      )}

      {/* Tab 1: MENU CARD SELECTION WITH DIFFICULTY BADGES */}
      {activeTab === 'menu' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Blitz */}
          <div className="group bg-dark-900/70 border border-dark-800 hover:border-amber-500/50 rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-amber-500/10 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                  <Zap className="w-7 h-7" />
                </div>
                <div className="flex items-center gap-1 text-xs text-yellow-400 font-bold bg-yellow-500/10 px-2.5 py-1 rounded-full border border-yellow-500/20">
                  <Star className="w-3.5 h-3.5 fill-yellow-400" />
                  <span>{levelProgress.blitz.easy + levelProgress.blitz.medium + levelProgress.blitz.hard}/9 Yulduz</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">1-O'YIN • BOSQICHLI VIKTORINA</span>
                <h3 className="text-xl font-bold text-white mt-1">Marketing Blitz Quiz ⚡</h3>
                <p className="text-dark-400 text-sm mt-2 leading-relaxed">
                  Bo'limlarga bo'lingan 50+ ta savollar banki. 🟢 Oson, 🟡 O'rta va 🔴 Qiyin bosqichlar!
                </p>
              </div>

              {/* Difficulty badges */}
              <div className="space-y-2 pt-2 border-t border-dark-800">
                <div className="flex items-center justify-between text-xs text-dark-300">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold">🟢 Oson (20s timer)</span>
                  <span>+10 KasbCoin</span>
                </div>
                <div className="flex items-center justify-between text-xs text-dark-300">
                  <span className="flex items-center gap-1.5 text-amber-400 font-bold">🟡 O'rta (15s timer)</span>
                  <span>+15 KasbCoin (x1.5)</span>
                </div>
                <div className="flex items-center justify-between text-xs text-dark-300">
                  <span className="flex items-center gap-1.5 text-rose-400 font-bold">🔴 Qiyin (10s timer)</span>
                  <span>+25 KasbCoin (x2.5)</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => { setActiveTab('blitz'); setSelectedGameLevel('easy'); }}
              className="mt-6 w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-dark-950 font-extrabold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <span>Bo'limlarni va Darajani Tanlash</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 2: Match Master */}
          <div className="group bg-dark-900/70 border border-dark-800 hover:border-emerald-500/50 rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-emerald-500/10 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <Puzzle className="w-7 h-7" />
                </div>
                <div className="flex items-center gap-1 text-xs text-yellow-400 font-bold bg-yellow-500/10 px-2.5 py-1 rounded-full border border-yellow-500/20">
                  <Star className="w-3.5 h-3.5 fill-yellow-400" />
                  <span>{levelProgress.match.easy + levelProgress.match.medium + levelProgress.match.hard}/9 Yulduz</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">2-O'YIN • BOSQICHLI MOSLASHTIRISH</span>
                <h3 className="text-xl font-bold text-white mt-1">Match Master 🧩</h3>
                <p className="text-dark-400 text-sm mt-2 leading-relaxed">
                  Money Models formulalari (Decoy, Anchor, Rollover) va Kasbtech 40-kunlik atamalari juftliklari!
                </p>
              </div>

              {/* Difficulty badges */}
              <div className="space-y-2 pt-2 border-t border-dark-800">
                <div className="flex items-center justify-between text-xs text-dark-300">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold">🟢 6 ta Juftlik (Oson)</span>
                  <span>+10 KasbCoin</span>
                </div>
                <div className="flex items-center justify-between text-xs text-dark-300">
                  <span className="flex items-center gap-1.5 text-amber-400 font-bold">🟡 8 ta Juftlik (O'rta)</span>
                  <span>+15 KasbCoin</span>
                </div>
                <div className="flex items-center justify-between text-xs text-dark-300">
                  <span className="flex items-center gap-1.5 text-rose-400 font-bold">🔴 10 ta Juftlik (Qiyin)</span>
                  <span>+25 KasbCoin</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => { setActiveTab('match'); setSelectedGameLevel('easy'); }}
              className="mt-6 w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-dark-950 font-extrabold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <span>Bo'limlarni va Darajani Tanlash</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 3: AI Marketer Simulator */}
          <div className="group bg-dark-900/70 border border-dark-800 hover:border-cyan-500/50 rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-cyan-500/10 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div className="flex items-center gap-1 text-xs text-yellow-400 font-bold bg-yellow-500/10 px-2.5 py-1 rounded-full border border-yellow-500/20">
                  <Star className="w-3.5 h-3.5 fill-yellow-400" />
                  <span>{levelProgress.simulator.easy + levelProgress.simulator.medium + levelProgress.simulator.hard}/9 Yulduz</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">3-O'YIN • STRATEGIK SIMULYATOR</span>
                <h3 className="text-xl font-bold text-white mt-1">AI Marketer Simulator 🚀</h3>
                <p className="text-dark-400 text-sm mt-2 leading-relaxed">
                  Real bizneskeyslarda Bosh Marketolog rolini o'ynang. Attraction, Upsell, Downsell va Continuity zanjirini quring!
                </p>
              </div>

              {/* Difficulty badges */}
              <div className="space-y-2 pt-2 border-t border-dark-800">
                <div className="flex items-center justify-between text-xs text-dark-300">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold">🟢 Kitob Do'koni Keysi</span>
                  <span>+15 KasbCoin</span>
                </div>
                <div className="flex items-center justify-between text-xs text-dark-300">
                  <span className="flex items-center gap-1.5 text-amber-400 font-bold">🟡 Erkaklar Kiyim Keysi</span>
                  <span>+20 KasbCoin</span>
                </div>
                <div className="flex items-center justify-between text-xs text-dark-300">
                  <span className="flex items-center gap-1.5 text-rose-400 font-bold">🔴 High-Ticket $1000 Keysi</span>
                  <span>+30 KasbCoin</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => { setActiveTab('simulator'); setSelectedGameLevel('easy'); }}
              className="mt-6 w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-dark-950 font-extrabold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              <span>Bo'limlarni va Darajani Tanlash</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* GAME 1: MARKETING BLITZ QUIZ */}
      {activeTab === 'blitz' && (
        <BlitzQuizGame 
          currentLevel={selectedGameLevel}
          onLevelChange={setSelectedGameLevel}
          currentCategory={selectedModuleCategory}
          onCategoryChange={setSelectedModuleCategory}
          levelProgress={levelProgress.blitz}
          onSaveProgress={(lvl, stars) => saveLevelStars('blitz', lvl, stars)}
          onComplete={handleAwardCoins} 
          onBack={() => setActiveTab('menu')} 
        />
      )}

      {/* GAME 2: MATCH MASTER */}
      {activeTab === 'match' && (
        <MatchMasterGame 
          currentLevel={selectedGameLevel}
          onLevelChange={setSelectedGameLevel}
          currentCategory={selectedModuleCategory}
          onCategoryChange={setSelectedModuleCategory}
          levelProgress={levelProgress.match}
          onSaveProgress={(lvl, stars) => saveLevelStars('match', lvl, stars)}
          onComplete={handleAwardCoins} 
          onBack={() => setActiveTab('menu')} 
        />
      )}

      {/* GAME 3: AI MARKETER SIMULATOR */}
      {activeTab === 'simulator' && (
        <SimulatorGame 
          currentLevel={selectedGameLevel}
          onLevelChange={setSelectedGameLevel}
          currentCategory={selectedModuleCategory}
          onCategoryChange={setSelectedModuleCategory}
          levelProgress={levelProgress.simulator}
          onSaveProgress={(lvl, stars) => saveLevelStars('simulator', lvl, stars)}
          onComplete={handleAwardCoins} 
          onBack={() => setActiveTab('menu')} 
        />
      )}

      {/* LEADERBOARD TAB */}
      {activeTab === 'leaderboard' && (
        <div className="bg-dark-900/80 border border-dark-800 rounded-3xl p-6 md:p-8 space-y-6 backdrop-blur-xl">
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
                        className={`hover:bg-dark-800/40 transition-colors ${
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
                                {isGold && <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-bold">O'yin Qiroli</span>}
                              </p>
                              <p className="text-xs text-dark-400">{item.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center text-sm font-semibold text-dark-300">
                          {item.gamesPlayed} ta o'yin
                        </td>
                        <td className="py-3 px-4 text-right font-black text-yellow-400 text-sm">
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
   DIFFICULTY LEVEL SELECTOR & MODULE CATEGORY BAR COMPONENT
   ========================================================================= */
function LevelSelector({ currentLevel, onLevelChange, currentCategory, onCategoryChange, progress }) {
  const isMediumUnlocked = (progress?.easy || 0) > 0;
  const isHardUnlocked = (progress?.medium || 0) > 0;

  const categories = [
    { id: "all", label: "🌐 Barcha Mavzular" },
    { id: "hormozi", label: "💰 1-Bo'lim: Hormozi Money Models" },
    { id: "foundation", label: "🎯 2-Bo'lim: Poydevor & Kopirayting" },
    { id: "web_target", label: "💻 3-Bo'lim: Sayt & Meta Target" },
    { id: "bot_sales", label: "🤖 4-Bo'lim: ChatPlace & Savdo" }
  ];

  return (
    <div className="space-y-3">
      {/* Category Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none bg-dark-950/80 p-2 rounded-2xl border border-purple-500/20">
        <span className="text-xs font-bold text-purple-300 uppercase tracking-wider px-2 flex items-center gap-1.5 shrink-0">
          <Layers className="w-3.5 h-3.5 text-purple-400" />
          Mavzu Bo'limi:
        </span>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange && onCategoryChange(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              currentCategory === cat.id
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-dark-900 text-dark-400 hover:text-white hover:bg-dark-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Difficulty Level Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-dark-950/60 p-2.5 rounded-2xl border border-dark-800">
        <span className="text-xs font-bold text-dark-400 uppercase tracking-wider px-3 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" />
          Daraja:
        </span>
        
        {/* Easy Level */}
        <button
          onClick={() => onLevelChange('easy')}
          className={`flex-1 min-w-[140px] p-2.5 rounded-xl border transition-all text-xs font-bold flex items-center justify-between ${
            currentLevel === 'easy'
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10 scale-105'
              : 'bg-dark-900 border-dark-800 text-dark-400 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-1.5">🟢 Oson</span>
          <div className="flex items-center">
            {[1, 2, 3].map(s => (
              <Star key={s} className={`w-3 h-3 ${s <= (progress?.easy || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-dark-700'}`} />
            ))}
          </div>
        </button>

        {/* Medium Level */}
        <button
          disabled={!isMediumUnlocked}
          onClick={() => isMediumUnlocked && onLevelChange('medium')}
          className={`flex-1 min-w-[140px] p-2.5 rounded-xl border transition-all text-xs font-bold flex items-center justify-between ${
            !isMediumUnlocked 
              ? 'bg-dark-900/40 border-dark-800 text-dark-600 cursor-not-allowed opacity-60' 
              : currentLevel === 'medium'
              ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10 scale-105'
              : 'bg-dark-900 border-dark-800 text-dark-400 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-1.5">
            {!isMediumUnlocked && <Lock className="w-3 h-3 text-dark-500" />}
            🟡 O'rta (Intermediate)
          </span>
          <div className="flex items-center">
            {[1, 2, 3].map(s => (
              <Star key={s} className={`w-3 h-3 ${s <= (progress?.medium || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-dark-700'}`} />
            ))}
          </div>
        </button>

        {/* Hard Level */}
        <button
          disabled={!isHardUnlocked}
          onClick={() => isHardUnlocked && onLevelChange('hard')}
          className={`flex-1 min-w-[140px] p-2.5 rounded-xl border transition-all text-xs font-bold flex items-center justify-between ${
            !isHardUnlocked 
              ? 'bg-dark-900/40 border-dark-800 text-dark-600 cursor-not-allowed opacity-60' 
              : currentLevel === 'hard'
              ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-md shadow-rose-500/10 scale-105'
              : 'bg-dark-900 border-dark-800 text-dark-400 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-1.5">
            {!isHardUnlocked && <Lock className="w-3 h-3 text-dark-500" />}
            🔴 Qiyin (Advanced)
          </span>
          <div className="flex items-center">
            {[1, 2, 3].map(s => (
              <Star key={s} className={`w-3 h-3 ${s <= (progress?.hard || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-dark-700'}`} />
            ))}
          </div>
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   GAME 1 COMPONENT: MARKETING BLITZ QUIZ (WITH CATEGORIZED & SHUFFLED BANK)
   ========================================================================= */
function BlitzQuizGame({ currentLevel, onLevelChange, currentCategory, onCategoryChange, levelProgress, onSaveProgress, onComplete, onBack }) {
  const ALL_QUESTIONS = {
    easy: [
      // 1-Bo'lim: Hormozi
      {
        cat: 'hormozi',
        q: "Alex Hormozi kitobi bo'yicha 'Attraction Offer' ning asosiy vazifasi nima?",
        options: [
          "Begona odamlarni birinchi marta mijozga aylantirish va xarajatni qoplash",
          "Mijozdan ko'proq pul undirish",
          "Mijozni bloklash",
          "Eski tovarlarni tashlab yuborish"
        ],
        correct: 0
      },
      {
        cat: 'hormozi',
        q: "Alex Hormozi kitobida 'Giveaways' (Tanlovlar) grand prize g'olibidan tashqari boshqalarga nima beriladi?",
        options: [
          "Kichikroq chegirma/vaucher ('Surprise discount') taklif qilinadi",
          "Hech narsa berilmaydi va bloklanadi",
          "Jarima solinadi",
          "Uydan haydaladi"
        ],
        correct: 0
      },
      // 2-Bo'lim: Poydevor & Kopirayting
      {
        cat: 'foundation',
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
        cat: 'foundation',
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
        cat: 'foundation',
        q: "Kasbtech 1-Kun: Digital Marketing an'anaviy marketingdan nimasi bilan ustun?",
        options: [
          "Faqat maqsadli auditoriyaga 'Snayper' kabi reklama ko'rsatish va har 1$ ning ROI sini Tiynigacha o'lchash",
          "Ko'chaga katta bilbord ilish bilan",
          "Televizorga 1000$ berish bilan",
          "Hech qanday farqi yo'q"
        ],
        correct: 0
      },
      {
        cat: 'foundation',
        q: "Kasbtech 1-Kun: 4 bosqichli 'Oltin Zanjir' (Funnel) tartibi qanday?",
        options: [
          "Traffic (Reklama) -> Sayt (Qabul) -> Lead (Mijoz) -> Sales (Savdo)",
          "Sales -> Traffic -> Sayt -> Lead",
          "Lead -> Sales -> Sayt -> Traffic",
          "Sayt -> Sales -> Traffic -> Lead"
        ],
        correct: 0
      },
      {
        cat: 'foundation',
        q: "Kasbtech 4-Kun: 'Drel va devordagi teshik' misolida mijoz aslida nimani sotib oladi?",
        options: [
          "Drelning temirini emas, devordagi teshik va rasm osilgach olinadigan Xotirjamlikni!",
          "Faqat drelning o'zini",
          "5 millimetrli buruni",
          "Uydagi mebelni"
        ],
        correct: 0
      },
      // 3-Bo'lim: Sayt & Target
      {
        cat: 'web_target',
        q: "Kasbtech 15-Kun: Landing Page saytining oddiy saytdan ustunligi nima?",
        options: [
          "Faqat bitta mahsulot va bitta harakatga (sotuvga) yo'naltirilgan bo'lishi",
          "100 ta menyusi borligi",
          "Tekin ekanligi",
          "Faqat kompyuterda ochilishi"
        ],
        correct: 0
      },
      // 4-Bo'lim: Bot & Savdo
      {
        cat: 'bot_sales',
        q: "Kasbtech 28-Kun: 'Speed to Lead' (Javob berish tezligi) qoidasi nima?",
        options: [
          "Mijoz yozgach dastlabki 5 daqiqa ichida javob berilmasa, xarid ehtimoli 80% ga tushib ketadi",
          "5 kundan keyin javob berish",
          "Faqat telefonda gaplashish",
          "Mijozga 1 soatdan keyin javob yozish"
        ],
        correct: 0
      }
    ],
    medium: [
      // 1-Bo'lim: Hormozi
      {
        cat: 'hormozi',
        q: "Alex Hormozi bo'yicha 'Decoy Offer' (Chalg'ituvchi o'lja) qanday ishlaydi?",
        options: [
          "Arzon/oddiy taklif yoniga o'ta jozibador Premium variantni qo'yib, mijozni premiumga undash",
          "Mijozni aldab pulini yechib olish",
          "Faqat bitta mahsulot sotish",
          "Reklamani o'chirib qo'yish"
        ],
        correct: 0
      },
      {
        cat: 'hormozi',
        q: "Alex Hormozi 'Buy X Get Y Free' da nima uchun chegirmadan ko'ra ko'proq tekin buyum berish jozibadorroq deydi?",
        options: [
          "Odamlar 'Chegirma' dan ko'ra 'Tekin mahsulot' ni 10 barobar balandroq qadrga ega deb bilishadi",
          "Chegirma ko'proq pul beradi",
          "Tekin narsa hech kimga kerak emas",
          "Faqat kiyim do'konlarida ishlaydi"
        ],
        correct: 0
      },
      {
        cat: 'hormozi',
        q: "Alex Hormozi bo'yicha 'Menu Upsell' tarkibidagi 4 ta taktika qaysilar?",
        options: [
          "Unselling, Prescription, A/B tanlov va Card On File",
          "AIDA, PAS, SWOT, CRM",
          "CPM, CTR, CPC, CPL",
          "Buy, Sell, Upsell, Downsell"
        ],
        correct: 0
      },
      // 2-Bo'lim: Poydevor & Kopirayting
      {
        cat: 'foundation',
        q: "PAS va AIDA formulalari o'rtasidagi tub farq nima?",
        options: [
          "PAS og'riq va muammodan qochish orqali, AIDA esa xohish va orzu orqali sotadi",
          "PAS faqat inglizcha, AIDA o'zbekcha",
          "PAS sayt uchun, AIDA bot uchun",
          "Ular bir xil formula"
        ],
        correct: 0
      },
      {
        cat: 'foundation',
        q: "Mukammal AI Prompt Formulasi tarkibiy qismlari qaysilar?",
        options: [
          "ROL + VAZIFA + KONTEKST + FORMAT va OHANG",
          "NOMI + NARXI + MANZILI",
          "AI + CHATGPT + GEMINI",
          "SAVOL + JAVOB + MATN"
        ],
        correct: 0
      },
      {
        cat: 'foundation',
        q: "Kasbtech 13-Kun: Sotuvchi hikoyaning 4 bosqichi qaysilar?",
        options: [
          "Jarlik (Muammo) -> Soxta Yechimlar -> Kashfiyot (Offer) -> Transformatsiya (Natija)",
          "Muammo -> Narx -> Chegirma -> Sotuv",
          "Kirish -> Asosiy -> Xulosa -> Rasm",
          "Salom -> Savol -> Buyruq -> Xayr"
        ],
        correct: 0
      },
      // 3-Bo'lim: Sayt & Target
      {
        cat: 'web_target',
        q: "Kasbtech 23-Kun: CTR (Click-Through Rate) va CPL (Cost Per Lead) nimani bildiradi?",
        options: [
          "CTR = Reklamaga bosishlar foizi (Kreativ sifati), CPL = Bitta ariza/lid narxi",
          "CTR = Sayt tezligi, CPL = Oylik maosh",
          "CTR = Telegram obunachisi, CPL = Instagram layki",
          "CTR = Bot javobi, CPL = Sayt domeni"
        ],
        correct: 0
      },
      {
        cat: 'web_target',
        q: "Kasbtech 24-Kun: Facebook Pixel nima vazifani bajaradi?",
        options: [
          "Tilda saytingizga kelgan mijozlarni tanib olib yodlaydigan 'aqlli kamera'",
          "Instagram rasmini chizadigan dastur",
          "Parollarni saqlaydigan ilova",
          "Chatbot yaratuvchi vosita"
        ],
        correct: 0
      },
      // 4-Bo'lim: Bot & Savdo
      {
        cat: 'bot_sales',
        q: "Kasbtech 29-Kun: Reels kommentariyasiga auto-reply yozish nimaga foyda beradi?",
        options: [
          "Instagram algoritmiga interaksiya berib videoni trendga olib chiqadi va Directga taklif yuboradi",
          "Faqat obunachi ko'paytiradi",
          "Instagram profilni bloklaydi",
          "Hech qanday foydasi yo'q"
        ],
        correct: 0
      }
    ],
    hard: [
      // 1-Bo'lim: Hormozi
      {
        cat: 'hormozi',
        q: "Hormozi kitobidagi 'Anchor Upsell' mexanikasi qanday ishlaydi?",
        options: [
          "Avval 5x-10x qimmat 'Anchor' ko'rsatilib, mijoz 'Gasp' qilgach asosiy taklif arzon va jozibador bo'lib ko'rinadi",
          "Kema langarini sotish",
          "Arzon narsani qimmatga sotish",
          "Chegirma e'lon qilish"
        ],
        correct: 0
      },
      {
        cat: 'hormozi',
        q: "Alex Hormozi bo'yicha 'Rollover Upsell' qanday ishlaydi?",
        options: [
          "Mijozning oldingi to'lagan pulini (yoki 90%+ chegirmali gift cardini) keyingi uzoq muddatli qimmatroq obunaga o'tkazish",
          "Puldanoq kechib yuborish",
          "Faqat 1 oylik xizmat berish",
          "Chegirmani bekor qilish"
        ],
        correct: 0
      },
      {
        cat: 'hormozi',
        q: "Trial With Penalty (Jarima bilan sinov) downsellida mijoz qachon to'lov qiladi?",
        options: [
          "Faqat berilgan shartlar yoki vazifalarni bajarmay o'tkazib yuborganda",
          "O'sha zahoti oldindan",
          "Hech qachon to'lamaydi",
          "3 yildan keyin"
        ],
        correct: 0
      },
      {
        cat: 'hormozi',
        q: "Alex Hormozi bo'yicha 'Feature Downsell' vaqtida narx qanday tushiriladi?",
        options: [
          "Oddiy chegirma bermasdan, mahsulotning ma'lum bir imkoniyatini (masalan kafolatni) olib tashlab narx tushiriladi",
          "Shunchaki 50% skidka qilinadi",
          "Mahsulot tekinga beriladi",
          "Narx oshiriladi"
        ],
        correct: 0
      },
      // 3-Bo'lim: Sayt & Target
      {
        cat: 'web_target',
        q: "Kasbtech 26-Kun: Vertikal va Gorizontal Mashtablash (Scaling) farqi nima?",
        options: [
          "Vertikal = Ishlab turgan reklama byudjetini har 3 kunda max 20% ga oshirish; Gorizontal = Ad Set ni duplicate qilib yangi auditoriya berish",
          "Vertikal = Instagram, Gorizontal = Telegram",
          "Vertikal = Arzonlashtirish, Gorizontal = Qimmatlashtirish",
          "Bir xil narsa"
        ],
        correct: 0
      },
      {
        cat: 'web_target',
        q: "Kasbtech 24-Kun: Lookalike (LAL) auditoriya nima va u qanday yaratiladi?",
        options: [
          "Pixel yig'gan 100+ real xaridorlar bazasidan Meta algoritmi orqali 1% o'xshashlikdagi eng aniq xaridorlarni topish",
          "Rasmga qarab odam tanlash",
          "Instagram obunachilarini sanash",
          "Faqat tanishlarga reklama berish"
        ],
        correct: 0
      },
      // 4-Bo'lim: Bot & Savdo
      {
        cat: 'bot_sales',
        q: "Kasbtech 31-Kun: Meta '24-Hour Rule' (24 soatlik qoida) va Smart Delay botda qanday ishlaydi?",
        options: [
          "Mijoz oxirgi marta yozgach 24 soat ichida bepul bot xabari yuborish mumkin; Smart Delay esa qochgan mijozga Follow-up yuboradi",
          "Bot 24 soat uxlaydi",
          "Mijozga har soatda spam yuboriladi",
          "Instagram hisob bloklanadi"
        ],
        correct: 0
      },
      {
        cat: 'bot_sales',
        q: "Kasbtech 38-Kun: Zoom uchrashuvida 'Frame' (Freym) ni ushlash nimani anglatadi?",
        options: [
          "Kim ko'p savol bersa uchrashuvni o'sha boshqaradi; shifokor kabi muammoni aniqlab (Discovery/The Gap) keyin Pitch qilinadi",
          "Kameraga qaramaslik",
          "Faqat o'zini maqtash",
          "Narxni darhol aytish"
        ],
        correct: 0
      }
    ]
  };

  const levelTime = currentLevel === 'easy' ? 20 : currentLevel === 'medium' ? 15 : 10;
  const levelMultiplier = currentLevel === 'easy' ? 1.0 : currentLevel === 'medium' ? 1.5 : 2.5;

  // State for filtered & shuffled questions
  const [questionsList, setQuestionsList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(levelTime);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    // Filter by category and shuffle
    const pool = ALL_QUESTIONS[currentLevel] || ALL_QUESTIONS.easy;
    let filtered = pool;
    if (currentCategory && currentCategory !== 'all') {
      filtered = pool.filter(q => q.cat === currentCategory);
      if (filtered.length === 0) filtered = pool; // fallback
    }

    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    setQuestionsList(shuffled);
    setCurrentIndex(0);
    setSelectedOption(null);
    setScore(0);
    setStreak(0);
    setTimeLeft(levelTime);
    setGameOver(false);
  }, [currentLevel, currentCategory]);

  useEffect(() => {
    if (gameOver || selectedOption !== null) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleAnswer(-1);
          return levelTime;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentIndex, selectedOption, gameOver, currentLevel, currentCategory]);

  const handleAnswer = (optionIdx) => {
    if (selectedOption !== null) return;
    setSelectedOption(optionIdx);

    const isCorrect = optionIdx === questionsList[currentIndex]?.correct;
    if (isCorrect) {
      setScore(prev => prev + 15 + streak * 3);
      setStreak(prev => prev + 1);
    } else {
      setStreak(0);
    }

    setTimeout(() => {
      if (currentIndex + 1 < questionsList.length) {
        setCurrentIndex(prev => prev + 1);
        setSelectedOption(null);
        setTimeLeft(levelTime);
      } else {
        setGameOver(true);
        const finalScore = score + (isCorrect ? 15 + streak * 3 : 0);
        let calculatedStars = 1;
        if (finalScore >= 70) calculatedStars = 3;
        else if (finalScore >= 40) calculatedStars = 2;

        onSaveProgress(currentLevel, calculatedStars);

        const baseReward = currentLevel === 'easy' ? 10 : currentLevel === 'medium' ? 15 : 25;
        const awardedCoins = Math.round(baseReward * levelMultiplier);

        onComplete(
          awardedCoins, 
          `Marketing Blitz (${currentLevel.toUpperCase()}) da ${finalScore} ball to'plaganingiz uchun`, 
          `blitz_${currentLevel}`
        );
      }
    }, 1200);
  };

  const currentQ = questionsList[currentIndex];

  return (
    <div className="bg-dark-900/80 border border-amber-500/30 rounded-3xl p-6 md:p-8 space-y-6 backdrop-blur-xl">
      {/* Level & Module Category Selector */}
      <LevelSelector 
        currentLevel={currentLevel}
        onLevelChange={onLevelChange}
        currentCategory={currentCategory}
        onCategoryChange={onCategoryChange}
        progress={levelProgress}
      />

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
            <div className="flex justify-between text-xs text-dark-400 font-semibold">
              <span>Savol {currentIndex + 1} / {questionsList.length}</span>
              <span className={timeLeft <= 4 ? 'text-red-400 font-bold animate-ping' : 'text-amber-400'}>
                ⏱️ {timeLeft}s
              </span>
            </div>
            <div className="w-full bg-dark-800 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / (questionsList.length || 1)) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Text */}
          <div className="bg-dark-800/60 border border-dark-700 p-6 rounded-2xl">
            <h3 className="text-lg md:text-xl font-bold text-white leading-relaxed">
              {currentQ?.q}
            </h3>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 gap-3">
            {currentQ?.options.map((opt, idx) => {
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
            <h3 className="text-2xl font-extrabold text-white">
              {currentLevel.toUpperCase()} Darajasi Yakunlandi!
            </h3>
            <p className="text-dark-300 text-sm mt-1">Siz {score} ball to'pladingiz!</p>
          </div>

          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 text-sm font-bold">
            🎉 KasbCoin Mukofoti Hisobingizga O'tkazildi!
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                const pool = ALL_QUESTIONS[currentLevel] || ALL_QUESTIONS.easy;
                let filtered = pool;
                if (currentCategory && currentCategory !== 'all') {
                  filtered = pool.filter(q => q.cat === currentCategory);
                  if (filtered.length === 0) filtered = pool;
                }
                const shuffled = [...filtered].sort(() => Math.random() - 0.5);
                setQuestionsList(shuffled);
                setCurrentIndex(0);
                setSelectedOption(null);
                setScore(0);
                setStreak(0);
                setTimeLeft(levelTime);
                setGameOver(false);
              }}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-dark-950 font-bold text-sm flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Qaytadan O'ynash (Random)</span>
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
   GAME 2 COMPONENT: MATCH MASTER (WITH CATEGORY & DYNAMIC SHUFFLE)
   ========================================================================= */
function MatchMasterGame({ currentLevel, onLevelChange, currentCategory, onCategoryChange, levelProgress, onSaveProgress, onComplete, onBack }) {
  const MATCH_BANKS = {
    easy: [
      { id: 1, term: "Domino's Pizza", match: "30 minutda pitsa / bepul" },
      { id: 2, term: "AIDA Formulasi", match: "Attention, Interest, Desire, Action" },
      { id: 3, term: "SWOT Analiz", match: "Strengths, Weaknesses, Opportunities, Threats" },
      { id: 4, term: "Shifokor Qoidasi", match: "Avval analitik tashxis, keyin reklama" },
      { id: 5, term: "Hook (Ilmoq)", match: "Dastlabki 3 soniyada e'tiborni ushlash" },
      { id: 6, term: "Mukammal Prompt", match: "Rol + Vazifa + Kontekst + Format" }
    ],
    medium: [
      { id: 1, term: "Decoy Offer", match: "Chalg'ituvchi o'lja orqali Premium variantni sotish" },
      { id: 2, term: "Facebook Ad Library", match: "Raqobatchilar faol reklamalari josusligi" },
      { id: 3, term: "Formula 1 UTP", match: "Mijoz + Natija + Vaqt + Qanday qilib" },
      { id: 4, term: "Egri Raqobatchi", match: "Boshqa mahsulot orqali bitta muammoni hal qiluvchi" },
      { id: 5, term: "80/20 Qoidasi", match: "80% AI karkasi + 20% insoniy odamchalashtirish" },
      { id: 6, term: "SMMchi Sanjar", match: "Avatar timsoli (23 yosh, 3 mln oylik)" },
      { id: 7, term: "FOMO Triggeri", match: "Imkoniyatni boy berish qo'rquvi" },
      { id: 8, term: "Pozitsiyalash", match: "Brend nomi eshitilganda mijoz tasavvuri" }
    ],
    hard: [
      { id: 1, term: "Anchor Upsell", match: "5x-10x qimmat variant orqali asosiy offerni sotish" },
      { id: 2, term: "Rollover Upsell", match: "Oldingi to'lovni uzoq muddatli obunaga ko'chirish" },
      { id: 3, term: "Trial With Penalty", match: "Shart bajarilmagandagina jarima to'lash sinovi" },
      { id: 4, term: "Feature Downsell", match: "Kafolat yoki xususiyatni olib tashlab narx tushirish" },
      { id: 5, term: "Lookalike (LAL)", match: "100+ real mijozlarga 1% o'xshashlikdagi auditoriya" },
      { id: 6, term: "Meta 24-Hour Rule", match: "Mijoz yozgach 24 soat ichida bepul bot xabari" },
      { id: 7, term: "Table Read", match: "Ssenariyni ovoz chiqarib tahrirlash" },
      { id: 8, term: "130-150 So'z Qoidasi", match: "1 minutlik video matn me'yori" },
      { id: 9, term: "B-roll Stock", match: "Insonsiz kadr orti videolari prompti" },
      { id: 10, term: "The Gap (Bo'shliq)", match: "Zoomda mijoz o'z muammosiga iqror bo'lishi" }
    ]
  };

  const currentPairs = MATCH_BANKS[currentLevel] || MATCH_BANKS.easy;

  const [cards, setCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [matchedIds, setMatchedIds] = useState([]);
  const [moves, setMoves] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    initGame();
  }, [currentLevel, currentCategory]);

  const initGame = () => {
    const list = [];
    currentPairs.forEach(p => {
      list.push({ cardId: `term-${p.id}`, pairId: p.id, text: p.term, type: 'term' });
      list.push({ cardId: `match-${p.id}`, pairId: p.id, text: p.match, type: 'match' });
    });
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
        setMatchedIds(prev => [...prev, card.pairId]);
        setSelectedCards([]);
        if (matchedIds.length + 1 === currentPairs.length) {
          setCompleted(true);
          const stars = moves <= currentPairs.length + 3 ? 3 : moves <= currentPairs.length + 6 ? 2 : 1;
          onSaveProgress(currentLevel, stars);

          const baseCoin = currentLevel === 'easy' ? 10 : currentLevel === 'medium' ? 15 : 25;
          onComplete(baseCoin, `Match Master (${currentLevel.toUpperCase()}) da ${moves} ta urinish uchun`, `match_${currentLevel}`);
        }
      } else {
        setTimeout(() => setSelectedCards([]), 1000);
      }
    }
  };

  return (
    <div className="bg-dark-900/80 border border-emerald-500/30 rounded-3xl p-6 md:p-8 space-y-6 backdrop-blur-xl">
      {/* Level & Module Selector */}
      <LevelSelector 
        currentLevel={currentLevel}
        onLevelChange={onLevelChange}
        currentCategory={currentCategory}
        onCategoryChange={onCategoryChange}
        progress={levelProgress}
      />

      <div className="flex items-center justify-between border-b border-dark-800 pb-4">
        <button onClick={onBack} className="text-dark-400 hover:text-white text-xs font-semibold flex items-center gap-1">
          ← Menuga qaytish
        </button>
        <div className="text-sm font-bold text-white">
          Urinishlar: <span className="text-emerald-400">{moves}</span> | Topildi: <span className="text-emerald-400">{matchedIds.length} / {currentPairs.length}</span>
        </div>
      </div>

      {!completed ? (
        <div className={`grid gap-3 ${currentPairs.length > 8 ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-4'}`}>
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
                    ? 'bg-purple-600 border-purple-400 text-white scale-105 shadow-lg shadow-purple-600/30 font-bold'
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
            🎉 KasbCoin Mukofoti Hisobingizga O'tkazildi!
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
   GAME 3 COMPONENT: AI MARKETER SIMULATOR (WITH DYNAMIC SCENARIOS)
   ========================================================================= */
function SimulatorGame({ currentLevel, onLevelChange, currentCategory, onCategoryChange, levelProgress, onSaveProgress, onComplete, onBack }) {
  const SCENARIOS_BANK = {
    easy: {
      title: "🟢 Boshlang'ich Keys: Onlayn Kitob Do'koni Savdosini Oshirish (Hormozi Attraction Offer)",
      context: "Do'konda sifatli kitoblar bor, lekin foydalanuvchilar faqat Instagramda rasm ko'rib o'tib ketishmoqda.",
      options: [
        {
          text: "A) Reklamaga: 'Eng arzon va sifatli kitoblar bizda' deb oddiy e'lon joylash",
          score: 35,
          feedback: "Natija past. Arzon so'zi UTP hisoblanmaydi va qiymat bermaydi."
        },
        {
          text: "B) Hook: 'Kitob o'qishga vaqt topsha olmayapsizmi?' + UTP: 'Kuniga 15 daqiqada 1 ta kitob mazmunini o'rgatuvchi audiolari bilan birga yetkazamiz'",
          score: 100,
          feedback: "A'lo natija! Vaqt yetishmasligi og'rig'iga va audio bonus taklifiga zarba berildi!"
        }
      ]
    },
    medium: {
      title: "🟡 O'rta Keys: Jizzaxdagi Erkaklar Kiyim Do'koni (Hormozi Decoy + Classic Upsell)",
      context: "Do'konda sifatli kostyum-shimlar bor, lekin mijozlar faqat narx so'rab kelib ketishmoqda.",
      options: [
        {
          text: "A) Hook: 'Muhim uchrashuvda 1-taassurotni boy bermaslik siri!' + UTP: 'O'lcham tushmasa, 24 soatda almashtirib beramiz'",
          score: 100,
          feedback: "A'lo strategiya! Status (Ego) triggeri va almashtirish kafolati mijoz qo'rquvini bittada yengdi! ROI +320%"
        },
        {
          text: "B) 10 daqiqalik uzun video chiqarib barcha matolarni kitobiy tushuntirish",
          score: 40,
          feedback: "Videoni hech kim oxirigacha ko'rmaydi. 3 soniya qoidasi buzildi."
        }
      ]
    },
    hard: {
      title: "🔴 Qiyin Keys: $1000 High-Ticket B2B Service (Hormozi Anchor Upsell + Frame Closing)",
      context: "Tadbirkor bilan Zoom uchrashuvidasiz. U: '$1000 juda qimmat, boshqa SMMchilar $200 ga qiladi' demoqda.",
      options: [
        {
          text: "A) Frame Shifokor uslubi: '$200 lik SMMchilar sizga qancha savdo keltirdi? Nol! Men esa $1000 so'rayapman, lekin tizim orqali sizga $10,000 lik mijoz olib kelaman. Pul tejamoqchimisiz yoki pul topmoqchimisiz?'",
          score: 100,
          feedback: "Mukammal Shifokor Frame va Anchor yopish! Tadbirkor $10,000 lik kelajak daromad uchun $1000 sarmoya kiritishga indamay rozi bo'ldi!"
        },
        {
          text: "B) 'Mayli siz uchun $150 ga tushirib beraman' deb chegirma berish",
          score: 20,
          feedback: "Falokat! Chegirma xizmat qiymatini tushirdi va shubha uyg'otdi. Shartnoma barbod bo'ldi."
        }
      ]
    }
  };

  const currentScen = SCENARIOS_BANK[currentLevel] || SCENARIOS_BANK.easy;
  const [selectedOption, setSelectedOption] = useState(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    setSelectedOption(null);
    setCompleted(false);
  }, [currentLevel, currentCategory]);

  const handleNext = () => {
    setCompleted(true);
    const stars = selectedOption?.score >= 90 ? 3 : 1;
    onSaveProgress(currentLevel, stars);

    const baseCoins = currentLevel === 'easy' ? 15 : currentLevel === 'medium' ? 20 : 30;
    onComplete(baseCoins, `AI Marketer Simulator (${currentLevel.toUpperCase()}) keysi muvaffaqiyati uchun`, `simulator_${currentLevel}`);
  };

  return (
    <div className="bg-dark-900/80 border border-cyan-500/30 rounded-3xl p-6 md:p-8 space-y-6 backdrop-blur-xl">
      {/* Level Selector */}
      <LevelSelector 
        currentLevel={currentLevel}
        onLevelChange={onLevelChange}
        currentCategory={currentCategory}
        onCategoryChange={onCategoryChange}
        progress={levelProgress}
      />

      <div className="flex items-center justify-between border-b border-dark-800 pb-4">
        <button onClick={onBack} className="text-dark-400 hover:text-white text-xs font-semibold flex items-center gap-1">
          ← Menuga qaytish
        </button>
        <div className="text-sm font-bold text-white">
          Daraja: <span className="text-cyan-400 uppercase">{currentLevel}</span>
        </div>
      </div>

      {!completed ? (
        <div className="space-y-6 max-w-2xl mx-auto">
          <div className="bg-dark-800/60 border border-dark-700 p-5 rounded-2xl space-y-2">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">STRATEGIK BOSH MARKETOLOG VAZIFASI</span>
            <h3 className="text-lg font-bold text-white">{currentScen.title}</h3>
            <p className="text-dark-300 text-sm leading-relaxed">{currentScen.context}</p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold text-dark-400 uppercase">Qaysi strategik qarorni qabul qilasiz?</p>
            {currentScen.options.map((opt, idx) => {
              const isSelected = selectedOption === opt;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedOption(opt)}
                  className={`w-full p-4 rounded-xl border text-left text-sm transition-all ${
                    isSelected 
                      ? 'bg-cyan-600/20 border-cyan-500 text-white font-bold' 
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
              className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 text-dark-950 font-extrabold text-sm transition-colors flex items-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              <span>Natijani Ko'rish</span>
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
            <h3 className="text-2xl font-extrabold text-white">AI Marketer Simulyatsiyasi Yakunlandi!</h3>
            <p className="text-dark-300 text-sm mt-1">Siz muvaffaqiyatli strategik qaror qabul qildingiz!</p>
          </div>

          <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-300 text-sm font-bold">
            🎉 KasbCoin Mukofoti Hisobingizga Qo'shildi!
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setSelectedOption(null);
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
