import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((type, message, duration = 4000) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  }, []);

  const remove = (id) => setNotifications(prev => prev.filter(n => n.id !== id));

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-400" />,
    error: <AlertTriangle className="w-5 h-5 text-red-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
  };

  const colors = {
    success: 'border-green-500/50 bg-green-500/10',
    error: 'border-red-500/50 bg-red-500/10',
    info: 'border-blue-500/50 bg-blue-500/10',
    warning: 'border-yellow-500/50 bg-yellow-500/10',
  };

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
        {notifications.map(n => (
          <div
            key={n.id}
            className={`flex items-start gap-3 p-4 rounded-xl border glass animate-slide-in ${colors[n.type]}`}
          >
            {icons[n.type]}
            <p className="text-sm text-dark-100 flex-1">{n.message}</p>
            <button onClick={() => remove(n.id)} className="text-dark-400 hover:text-dark-200 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export const useNotification = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be inside NotificationProvider');
  return ctx;
};
