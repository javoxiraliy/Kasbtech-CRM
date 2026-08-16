import { Sparkles } from 'lucide-react';

export default function MotivationalBanner() {
  return (
    <div className="mb-6 p-5 rounded-2xl bg-dark-900 border border-dark-800 shadow-md relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-r from-primary-900/10 to-emerald-900/10 opacity-50"></div>
      
      <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4 z-10">
        <div className="flex items-center gap-4 w-full">
          <div className="p-3 bg-primary-500/10 rounded-xl text-primary-400 border border-primary-500/20 shadow-sm shrink-0">
            <Sparkles className="w-5 h-5 text-primary-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-base sm:text-lg font-medium text-dark-100 tracking-wide">
              <span className="text-primary-400 font-bold mr-1">Unutma!</span>
              Kayfiyating qanday bo'lishidan qat'iy nazar{' '}
              <span className="text-emerald-400 font-bold mx-1">reja</span>
              bajarilishi shart.
            </h4>
            <p className="text-sm text-dark-400 mt-1">O'z maqsading sari tinmay harakat qil.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
