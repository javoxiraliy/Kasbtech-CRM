import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';
import { Search, Filter, Shield, User, BookOpen, Smartphone, File, Image, ExternalLink, FileText, FileSpreadsheet } from 'lucide-react';

export default function AllReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL'); // ALL, DAILY, WEEKLY
  const [filterRole, setFilterRole] = useState('ALL');
  const [search, setSearch] = useState('');
  const { addNotification } = useNotification();

  const getAttachmentUrl = (path) => {
    if (!path) return '';
    const base = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace('/api', '') 
      : (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);
    return `${base}${path}`;
  };

  const isImageFile = (url) => {
    const ext = url.split('.').pop().toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  };

  const getFileName = (url) => {
    return url.split('/').pop().substring(14); // Remove unique prefix timestamp
  };

  const getFileIcon = (url) => {
    const ext = url.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return <Image className="w-4 h-4 text-pink-400 shrink-0" />;
    }
    if (ext === 'pdf') {
      return <File className="w-4 h-4 text-red-400 shrink-0" />;
    }
    if (['doc', 'docx'].includes(ext)) {
      return <FileText className="w-4 h-4 text-blue-400 shrink-0" />;
    }
    if (['xls', 'xlsx'].includes(ext)) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
    return <File className="w-4 h-4 text-dark-300 shrink-0" />;
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await api.get('/reports/admin');
      setReports(res.data.reports);
    } catch (error) {
      addNotification('error', 'Hisobotlarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter(r => {
    const matchesType = filterType === 'ALL' || r.type === filterType;
    const matchesRole = filterRole === 'ALL' || r.author?.role === filterRole;
    const matchesSearch = r.author?.name?.toLowerCase().includes(search.toLowerCase()) || 
                          r.content?.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesRole && matchesSearch;
  });

  const getRoleIcon = (role) => {
    switch(role) {
      case 'ADMIN': return <Shield className="w-4 h-4 text-purple-400" />;
      case 'TEACHER': return <BookOpen className="w-4 h-4 text-emerald-400" />;
      case 'SMM': return <Smartphone className="w-4 h-4 text-pink-400" />;
      default: return <User className="w-4 h-4 text-blue-400" />;
    }
  };

  const getRoleBadge = (role) => {
    switch(role) {
      case 'ADMIN': return <span className="badge bg-purple-500/20 text-purple-400 border-purple-500/30">Admin</span>;
      case 'TEACHER': return <span className="badge bg-emerald-500/20 text-emerald-400 border-emerald-500/30">O'qituvchi</span>;
      case 'SMM': return <span className="badge bg-pink-500/20 text-pink-400 border-pink-500/30">SMM</span>;
      default: return <span className="badge bg-blue-500/20 text-blue-400 border-blue-500/30">Operator</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Xodimlar Hisobotlari</h1>
          <p className="text-dark-400 text-sm">Barcha xodimlarning kunlik va haftalik hisobotlari</p>
        </div>
      </div>

      <div className="card glass p-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            type="text"
            placeholder="Xodim ismi yoki hisobot matni bo'yicha qidiruv..."
            className="input bg-dark-900/50 pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <div className="relative min-w-[150px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <select
              className="input bg-dark-900/50 pl-9 appearance-none"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="ALL">Barcha Turlar</option>
              <option value="DAILY">Kunlik</option>
              <option value="WEEKLY">Haftalik</option>
            </select>
          </div>
          <div className="relative min-w-[150px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <select
              className="input bg-dark-900/50 pl-9 appearance-none"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="ALL">Barcha Rollar</option>
              <option value="OPERATOR">Operatorlar</option>
              <option value="TEACHER">O'qituvchilar</option>
              <option value="SMM">SMM</option>
              <option value="ADMIN">Adminlar</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-dark-400">Hisobotlar yuklanmoqda...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="card glass p-12 text-center">
          <p className="text-dark-400">Hech qanday hisobot topilmadi.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map(report => (
            <div key={report.id} className="card glass p-5 flex flex-col h-[400px]">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-dark-800 border border-dark-700 flex items-center justify-center">
                    {getRoleIcon(report.author?.role)}
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{report.author?.name || 'Noma\'lum xodim'}</h3>
                    <p className="text-xs text-dark-400">{new Date(report.createdAt).toLocaleString('uz-UZ')}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 mb-4">
                <span className={`badge ${
                  report.type === 'DAILY' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                }`}>
                  {report.type === 'DAILY' ? 'Kunlik Hisobot' : 'Haftalik Hisobot'}
                </span>
                {getRoleBadge(report.author?.role)}
              </div>

              <div className="flex-1 bg-dark-900/50 rounded-xl border border-dark-800 p-4 overflow-y-auto custom-scrollbar font-mono text-sm text-dark-300 whitespace-pre-wrap mb-3">
                {report.content}
              </div>

              {/* Render attachments for this report */}
              {report.attachmentUrls && report.attachmentUrls.length > 0 && (
                <div className="space-y-1.5 shrink-0 border-t border-dark-800/65 pt-3">
                  <p className="text-[10px] text-dark-400 uppercase font-bold tracking-wider mb-1">Biriktirilgan fayllar:</p>
                  <div className="grid grid-cols-1 gap-1 max-h-24 overflow-y-auto custom-scrollbar pr-1">
                    {report.attachmentUrls.map((url, uidx) => {
                      const fileName = getFileName(url);
                      return (
                        <div key={uidx} className="flex items-center justify-between gap-3 p-1.5 bg-dark-900/30 rounded border border-dark-800 text-[11px]">
                          <span className="text-dark-300 truncate flex items-center gap-1.5" title={fileName}>
                            {getFileIcon(url)}
                            {fileName || `Fayl_${uidx + 1}`}
                          </span>
                          <a 
                            href={getAttachmentUrl(url)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary-400 hover:text-white p-1 shrink-0"
                            title="Ko'rish"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
