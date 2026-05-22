import { useState, useEffect } from 'react';
import { X, Clock, Phone, User, MessageSquare, Briefcase, Calendar } from 'lucide-react';
import api from '../lib/api';

const STATUS_LABELS = {
  NEW: { label: 'Yangi', color: 'text-blue-400 bg-blue-500/10' },
  IN_PROGRESS: { label: 'Jarayonda', color: 'text-yellow-400 bg-yellow-500/10' },
  VOUCHER_CHECK: { label: 'Vaucher', color: 'text-purple-400 bg-purple-500/10' },
  SUCCESS: { label: 'Muvaffaqiyatli', color: 'text-green-400 bg-green-500/10' },
  ARCHIVED: { label: 'Rad etildi', color: 'text-red-400 bg-red-500/10' },
};

export default function OperatorActivityModal({ operatorId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('leads'); // 'leads' or 'comments'

  useEffect(() => {
    if (operatorId) {
      fetchOperatorData();
    }
  }, [operatorId]);

  const fetchOperatorData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/operators/${operatorId}/activity`);
      setData(res.data);
    } catch (error) {
      console.error('Operator data error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!operatorId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-dark-900 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col border border-dark-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-700 bg-dark-800/50">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              {loading ? 'Yuklanmoqda...' : data?.operator?.name}
            </h2>
            <p className="text-dark-400 text-sm">
              Operator faolligi va mijozlar bilan ishlash tarixi
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-xl transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : data ? (
            <>
              {/* Tabs */}
              <div className="flex px-6 border-b border-dark-700 bg-dark-800/30">
                <button
                  onClick={() => setActiveTab('leads')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'leads' 
                      ? 'border-primary-500 text-primary-400' 
                      : 'border-transparent text-dark-400 hover:text-dark-200'
                  }`}
                >
                  Biriktirilgan Lidlar ({data.leads.length})
                </button>
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'comments' 
                      ? 'border-primary-500 text-primary-400' 
                      : 'border-transparent text-dark-400 hover:text-dark-200'
                  }`}
                >
                  Oxirgi Izohlar ({data.recentComments.length})
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'leads' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.leads.map(lead => (
                      <div key={lead.id} className="bg-dark-800 border border-dark-700 rounded-xl p-4 flex flex-col">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-semibold text-white truncate pr-2">{lead.name}</h4>
                          <span className={`text-[10px] px-2 py-1 rounded-full whitespace-nowrap ${STATUS_LABELS[lead.status]?.color || 'text-dark-300 bg-dark-700'}`}>
                            {STATUS_LABELS[lead.status]?.label || lead.status}
                          </span>
                        </div>
                        
                        <div className="space-y-2 mb-4 flex-1">
                          <div className="flex items-center text-xs text-dark-300 gap-2">
                            <Phone className="w-3.5 h-3.5 text-dark-400" />
                            <a 
                               href={`tel:${lead.phone}`} 
                               className="hover:text-primary-400 hover:underline transition-colors font-medium text-primary-400"
                             >
                               {lead.phone}
                             </a>
                          </div>
                          <div className="flex items-center text-xs text-dark-300 gap-2">
                            <Briefcase className="w-3.5 h-3.5 text-dark-400" />
                            {lead.courseInterest.replace(/_/g, ' ')}
                          </div>
                          {lead.nextContactDate && (
                            <div className="flex items-center text-xs text-yellow-400/80 gap-2">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(lead.nextContactDate).toLocaleDateString('uz-UZ')}
                            </div>
                          )}
                        </div>

                        {(lead.notes || lead.comments.length > 0) && (
                          <div className="pt-3 border-t border-dark-700/50 mt-auto">
                            {lead.notes && (
                              <p className="text-xs text-dark-300 line-clamp-2 mb-2" title={lead.notes}>
                                <span className="text-dark-400 font-medium">Umumiy izoh:</span> {lead.notes}
                              </p>
                            )}
                            {lead.comments.length > 0 && (
                              <div className="bg-dark-900/50 rounded-lg p-2.5">
                                <p className="text-[11px] text-dark-400 mb-1 flex items-center justify-between">
                                  <span>Oxirgi kament:</span>
                                  <span>{new Date(lead.comments[0].createdAt).toLocaleDateString('uz-UZ')}</span>
                                </p>
                                <p className="text-xs text-dark-200 line-clamp-3" title={lead.comments[0].content}>
                                  "{lead.comments[0].content}"
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {data.leads.length === 0 && (
                      <div className="col-span-full py-12 text-center text-dark-500">
                        Bu operatorga biriktirilgan lidlar yo'q
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'comments' && (
                  <div className="space-y-4 max-w-4xl mx-auto">
                    {data.recentComments.map(comment => (
                      <div key={comment.id} className="bg-dark-800 border border-dark-700 rounded-xl p-4 flex gap-4">
                        <div className="mt-1">
                          <div className="w-8 h-8 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center">
                            <MessageSquare className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-medium text-white text-sm">
                              Mijoz: <span className="text-primary-400">{comment.lead.name}</span>
                            </h4>
                            <span className="text-xs text-dark-400">
                              {new Date(comment.createdAt).toLocaleString('uz-UZ')}
                            </span>
                          </div>
                          <p className="text-xs text-dark-300 mb-2">
                             Telefon: <a href={`tel:${comment.lead.phone}`} className="text-primary-400 hover:text-primary-300 hover:underline transition-colors font-medium">{comment.lead.phone}</a>
                           </p>
                          <div className="bg-dark-900/50 rounded-lg p-3 text-sm text-dark-200">
                            {comment.content}
                          </div>
                        </div>
                      </div>
                    ))}
                    {data.recentComments.length === 0 && (
                      <div className="py-12 text-center text-dark-500">
                        Operator hozircha hech qanday kamentariya qoldirmagan
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-dark-400">
              Ma'lumot topilmadi
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
