import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function ReportWarningBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [warningText, setWarningText] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const [show, setShow] = useState(false);

  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const day = now.getDay(); // 0: Sunday, 1: Mon, ..., 6: Sat
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // Target: 18:00 (18 hours, 0 minutes)
      const targetTime = new Date(now);
      targetTime.setHours(18, 0, 0, 0);

      let isWarning = false;
      let text = '';

      if (day === 6) {
        // Saturday: Weekly report warning from 15:00 to 18:00
        if (hours >= 15 && hours < 18) {
          isWarning = true;
          text = 'Haftalik tahliliy hisobot topshirish vaqti yaqinlashmoqda!';
        }
      } else {
        // Other days: Daily report warning from 17:00 to 18:00
        if (hours === 17) {
          isWarning = true;
          text = 'Kunlik hisobot topshirish vaqti yaqinlashmoqda!';
        }
      }

      if (isWarning) {
        const diffMs = targetTime - now;
        const diffMins = Math.max(0, Math.floor(diffMs / 60000));
        
        if (diffMins > 0) {
          const hr = Math.floor(diffMins / 60);
          const mn = diffMins % 60;
          setTimeLeft(`${hr > 0 ? hr + ' soat ' : ''}${mn} daqiqa qoldi`);
        } else {
          setTimeLeft("Vaqt tugadi (18:00)");
        }
        setWarningText(text);
        setShow(true);
      } else {
        setShow(false);
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (!show || !user) return null;

  const getReportLink = () => {
    const rolePath = user.role.toLowerCase();
    return `/${rolePath}/reports`;
  };

  return (
    <div className="mb-6 p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 glass flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse-slow">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-yellow-500/20 rounded-xl text-yellow-400">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-white font-semibold text-sm sm:text-base leading-tight">
            {warningText}
          </h4>
          <p className="text-xs text-yellow-400/80 flex items-center gap-1 mt-1">
            <Clock className="w-3.5 h-3.5" />
            Topshirish muddati: 18:00 gacha ({timeLeft})
          </p>
        </div>
      </div>
      
      <button
        onClick={() => navigate(getReportLink())}
        className="btn-primary py-2 px-4 text-xs font-semibold bg-yellow-500 hover:bg-yellow-600 text-dark-950 border-none shadow-[0_0_15px_rgba(234,179,8,0.2)] shrink-0 self-stretch sm:self-auto justify-center"
      >
        Hisobot Topsherish
        <ArrowRight className="w-4 h-4 ml-1" />
      </button>
    </div>
  );
}
