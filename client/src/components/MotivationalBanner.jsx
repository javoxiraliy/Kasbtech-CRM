import { Sparkles } from 'lucide-react';

export default function MotivationalBanner() {
  return (
    <div className="mb-6 p-4.5 rounded-2xl bg-gradient-to-r from-primary-950/40 via-dark-900/60 to-primary-950/40 border border-dark-700/60 glass shadow-xl relative overflow-hidden group">
      {/* Background glow effects */}
      <div className="absolute -left-16 -top-16 w-32 h-32 bg-primary-600/10 rounded-full blur-3xl group-hover:bg-primary-600/15 transition-all duration-500"></div>
      <div className="absolute -right-16 -bottom-16 w-32 h-32 bg-emerald-600/10 rounded-full blur-3xl group-hover:bg-emerald-600/15 transition-all duration-500"></div>

      <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left z-10">
        <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full justify-center sm:justify-start">
          <div className="p-2.5 bg-gradient-to-br from-primary-500/20 to-emerald-500/20 rounded-xl text-primary-400 border border-primary-500/30 shadow-inner shrink-0 animate-pulse-soft">
            <Sparkles className="w-5.5 h-5.5 text-primary-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm md:text-base font-medium text-dark-100 leading-relaxed tracking-wide">
              <span className="inline-block px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 font-extrabold mr-1 hover:scale-105 transition-transform cursor-default">
                Untutma!
              </span>{' '}
              <span className="inline-block px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold mx-1 hover:scale-105 transition-transform cursor-default">
                Kayfiyating
              </span>{' '}
              qanday bo'lishidan qat'iy nazar{' '}
              <span className="inline-block px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold mx-1 hover:scale-105 transition-transform cursor-default">
                reja
              </span>{' '}
              bajarilishi shart
            </h4>
          </div>
        </div>
      </div>
    </div>
  );
}
