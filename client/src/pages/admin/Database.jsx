import { useState, useEffect, useRef } from 'react';
import { Download, Upload, FileSpreadsheet, Search, Loader2, Edit2, Trash2, X, Plus, User, Phone, BookOpen, Briefcase } from 'lucide-react';
import api from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';
import ConfirmModal from '../../components/ConfirmModal';

const STATUS_LABELS = {
  NEW: 'Yangi',
  IN_PROGRESS: 'Jarayonda',
  VOUCHER_CHECK: 'Tekshiruvda',
  SUCCESS: 'Muvaffaqiyatli',
  ARCHIVED: 'Arxiv'
};

const COURSE_LABELS = {
  VIDEOGRAPHY: 'Videomontaj "videografiya"',
  SMM: 'SMM',
  TARGET_PRO: 'Target pro',
  COMPUTER_GRAPHICS: 'Kompyuter grafikasi',
  COMPUTER_LITERACY: 'Kompyuter savodxonligi',
  GRAPHIC_DESIGN: 'Grafik dizayn',
  AUTOCAD: 'AutoCAD',
  THREE_D_MAX: '3D MAX',
  OTHER: 'Boshqa',
  VIDEO_EDITING: 'Video montaj',
  WEB_DEVELOPMENT: 'Web dasturlash',
  PYTHON: 'Python'
};

const EMPLOYMENT_LABELS = {
  UNEMPLOYED: 'Ishsiz',
  EMPLOYED_OFFICIAL: 'Rasmiy band',
  EMPLOYED_UNOFFICIAL: 'Rasmiy band emas',
  STUDENT: 'Talaba',
  STUDENT_EXTERNAL: 'Talaba "sirtqi"',
  SCHOOL_STUDENT: 'Maktab o\'quvchisi',
  HOUSEWIFE: 'Uy bekasi',
  employed: 'Ishlaydi',
  unemployed: 'Ishsiz',
  housewife: 'Uy bekasi',
  student: 'Talaba'
};

export default function Database() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger',
    confirmText: '',
    cancelText: 'Bekor qilish'
  });
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newLead, setNewLead] = useState({
    name: '',
    phone: '',
    courseInterest: '',
    employmentStatus: '',
    source: 'Admin (Manual)'
  });
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [editingLead, setEditingLead] = useState(null);
  const [operators, setOperators] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  
  const fileInputRef = useRef(null);
  const { addNotification } = useNotification();

  useEffect(() => {
    fetchLeads();
    fetchOperators();
  }, []);

  // Fetch leads automatically when dates change
  useEffect(() => {
    fetchLeads(searchTerm, startDate, endDate);
  }, [startDate, endDate]);

  const fetchOperators = async () => {
    try {
      const res = await api.get('/admin/users');
      setOperators(res.data.users.filter(u => u.role === 'OPERATOR'));
    } catch (error) {
      console.error('Fetch operators error:', error);
    }
  };

  const fetchLeads = async (search = '', start = '', end = '') => {
    setLoading(true);
    setCurrentPage(1);
    try {
      let url = `/leads?search=${encodeURIComponent(search)}`;
      if (start) url += `&startDate=${start}`;
      if (end) url += `&endDate=${end}`;
      const res = await api.get(url);
      setLeads(res.data.leads);
    } catch (error) {
      addNotification('error', "Lidlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const getDelayWarning = (lead) => {
    if (lead.status === 'SUCCESS' || lead.status === 'ARCHIVED') return false;
    if (lead.comments && lead.comments.length > 0) {
      const lastCommentDate = new Date(lead.comments[0].createdAt);
      const now = new Date();
      const diffTime = Math.abs(now - lastCommentDate);
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays >= 3;
    }
    return false;
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    fetchLeads(searchTerm, startDate, endDate);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      let url = '/leads/export/excel';
      const params = [];
      if (searchTerm) params.push(`search=${encodeURIComponent(searchTerm)}`);
      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);
      if (params.length > 0) {
        url += '?' + params.join('&');
      }

      const response = await api.get(url, {
        responseType: 'blob',
      });
      const urlBlob = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = urlBlob;
      link.setAttribute('download', 'lidlar.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      addNotification('success', "Excel fayl yuklab olindi");
    } catch (error) {
      addNotification('error', "Eksport qilishda xatolik");
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setImporting(true);
    try {
      const res = await api.post('/leads/import/excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      addNotification('success', res.data.message);
      fetchLeads();
    } catch (error) {
      const errorMsg = error.response?.data?.details || error.response?.data?.error || "Import qilishda xatolik yuz berdi";
      addNotification('error', errorMsg);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      title: "Lidni o'chirish",
      message: "Haqiqatan ham ushbu lidni o'chirib tashlamoqchimisiz?",
      type: 'danger',
      confirmText: "Ha, o'chirish",
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await api.delete(`/leads/${id}`);
          addNotification('success', "Lid o'chirib tashlandi");
          fetchLeads();
        } catch (error) {
          addNotification('error', "O'chirishda xatolik yuz berdi");
        }
      }
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch(`/leads/${editingLead.id}`, editingLead);
      addNotification('success', "Lid ma'lumotlari yangilandi");
      setEditingLead(null);
      fetchLeads();
    } catch (error) {
      addNotification('error', "Yangilashda xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const leadData = { ...newLead };
      if (!leadData.assignedToId) delete leadData.assignedToId;
      
      await api.post('/leads', leadData);
      addNotification('success', "Lid muvaffaqiyatli qo'shildi");
      setIsAddModalOpen(false);
      setNewLead({
        name: '', phone: '', phone2: '',
        courseInterest: 'COMPUTER_LITERACY', employmentStatus: 'Ishsiz',
        status: 'NEW', assignedToId: '', isGrantEligible: false,
        source: 'Admin (Manual)'
      });
      fetchLeads();
    } catch (error) {
      addNotification('error', error.response?.data?.error || "Xatolik yuz berdi");
    } finally {
      setCreating(false);
    }
  };

  const COURSE_OPTIONS = [
    { value: 'COMPUTER_LITERACY', label: 'Kompyuter Savodxonligi' },
    { value: 'GRAPHIC_DESIGN', label: 'Grafik Dizayn' },
    { value: 'SMM', label: 'SMM' },
    { value: 'TARGET_PRO', label: 'Target Pro' },
    { value: 'VIDEOGRAPHY', label: 'Videomontaj "videografiya"' },
    { value: 'WEB_DEVELOPMENT', label: 'Web Dasturlash' },
    { value: 'PYTHON', label: 'Python Dasturlash' },
    { value: 'AUTOCAD', label: 'AutoCAD' },
    { value: 'THREE_D_MAX', label: '3D MAX' },
  ];

  const EMPLOYMENT_OPTIONS = [
    'Ishsiz', 'Talaba', 'Maktab o\'quvchisi', 'Rasmiy band', 'Davlat ishida', 'Uy bekasi'
  ];

  const toggleSelectAll = () => {
    if (selectedIds.length === leads.length && leads.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leads.map(l => l.id));
    }
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = () => {
    setConfirmModal({
      isOpen: true,
      title: "Tanlangan lidlarni o'chirish",
      message: `Haqiqatan ham tanlangan ${selectedIds.length} ta lidni o'chirib tashlamoqchimisiz?`,
      type: 'danger',
      confirmText: "Ha, o'chirish",
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setLoading(true);
        try {
          await api.post('/leads/bulk-delete', { ids: selectedIds });
          addNotification('success', "Tanlangan lidlar o'chirildi");
          setSelectedIds([]);
          fetchLeads();
        } catch (error) {
          addNotification('error', "Xatolik yuz berdi");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleDeleteAll = () => {
    setConfirmModal({
      isOpen: true,
      title: "Barcha lidlarni o'chirish",
      message: "DIQQAT! Barcha lidlarni butunlay o'chirib tashlamoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi!",
      type: 'danger',
      confirmText: "Ha, barchasini o'chirish",
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        const confirmText = window.prompt("Tasdiqlash uchun 'OCHIRISH' so'zini yozing:");
        if (confirmText !== 'OCHIRISH') return;

        setLoading(true);
        try {
          await api.delete('/leads/delete-all/confirmed');
          addNotification('success', "Barcha lidlar o'chirildi");
          setSelectedIds([]);
          fetchLeads();
        } catch (error) {
          addNotification('error', "Xatolik yuz berdi");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const itemsPerPage = 50;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLeads = leads.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(leads.length / itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Global Lidlar Bazasi</h1>
          <p className="text-dark-400 text-sm">Barcha lidlarni boshqarish va Excel bilan ishlash</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input
            type="file"
            accept=".xlsx, .xls"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImport}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="btn-secondary flex-1 sm:flex-none justify-center"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Import (Excel)
          </button>
          <button 
            onClick={handleExport}
            disabled={exporting}
            className="btn-primary flex-1 sm:flex-none justify-center bg-green-600 hover:bg-green-700"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export (Excel)
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary flex-1 sm:flex-none justify-center"
          >
            <Plus className="w-4 h-4" />
            Yangi Lid
          </button>
          <button 
            onClick={handleDeleteAll}
            className="btn-secondary border-red-500/50 text-red-400 hover:bg-red-500/10 px-3"
            title="Barchasini o'chirish"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="card glass p-0 overflow-hidden flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
        {/* Toolbar */}
        <div className="p-4 border-b border-dark-800 bg-dark-900/30 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative min-w-[200px] flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-dark-500" />
              </div>
              <input
                type="text"
                className="input pl-10 h-10 text-sm bg-dark-800"
                placeholder="Qidirish (Ism/Tel)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-dark-400 font-medium whitespace-nowrap">Dan:</span>
              <input
                type="date"
                className="input h-10 text-sm w-36 px-2 bg-dark-800 text-white border-dark-700"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-dark-400 font-medium whitespace-nowrap">Gacha:</span>
              <input
                type="date"
                className="input h-10 text-sm w-36 px-2 bg-dark-800 text-white border-dark-700"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary h-10 px-4 text-sm font-semibold justify-center">
              Filtrlash
            </button>
            
            {(searchTerm || startDate || endDate) && (
              <button 
                type="button" 
                onClick={() => {
                  setSearchTerm('');
                  setStartDate('');
                  setEndDate('');
                  fetchLeads('', '', '');
                }}
                className="btn-secondary h-10 px-3 text-sm text-dark-400 hover:text-white"
              >
                Tozalash
              </button>
            )}
          </form>
          
          <div className="text-sm text-dark-400 font-medium flex items-center justify-between lg:justify-end gap-4 shrink-0">
            {selectedIds.length > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="text-red-400 hover:text-red-300 flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Tanlanganlarni o'chirish ({selectedIds.length})
              </button>
            )}
            <div>Saralangan: <span className="text-white">{leads.length}</span> ta</div>
          </div>
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-auto responsive-table-container">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="sticky top-0 bg-dark-900 shadow-sm z-10">
              <tr className="border-b border-dark-800 text-dark-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 w-10">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-dark-700 bg-dark-800 text-primary-500 focus:ring-primary-500"
                    checked={leads.length > 0 && selectedIds.length === leads.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Lid ma'lumotlari</th>
                <th className="px-4 py-3 font-medium">Kurs & Bandlik</th>
                <th className="px-4 py-3 font-medium">Holat</th>
                <th className="px-4 py-3 font-medium">Operator</th>
                <th className="px-4 py-3 font-medium">Sana</th>
                <th className="px-4 py-3 font-medium text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-dark-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Yuklanmoqda...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-dark-400 flex flex-col items-center">
                    <FileSpreadsheet className="w-12 h-12 text-dark-600 mb-3" />
                    <p>Ma'lumot topilmadi</p>
                  </td>
                </tr>
              ) : paginatedLeads.map((l) => (
                <tr 
                  key={l.id} 
                  className={`border-b border-dark-800/50 hover:bg-dark-800/30 transition-colors ${selectedIds.includes(l.id) ? 'bg-primary-500/5' : ''} ${getDelayWarning(l) ? 'border-l-4 border-l-red-500 bg-red-500/5' : ''}`}
                >
                  <td className="px-4 py-3">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-dark-700 bg-dark-800 text-primary-500 focus:ring-primary-500"
                      checked={selectedIds.includes(l.id)}
                      onChange={() => toggleSelect(l.id)}
                    />
                  </td>
                  <td className="px-4 py-3 text-dark-500 text-xs font-mono">{l.id.slice(-6)}</td>
                  <td className="px-4 py-3">
                    <p className="text-white font-medium flex items-center gap-2">
                      {l.name}
                      {getDelayWarning(l) && (
                        <span className="relative flex h-2 w-2" title="Kechikish: 3 kundan beri aloqaga chiqilmagan!">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-dark-400">{l.phone}</p>
                    {l.phone2 && <p className="text-xs text-dark-400">{l.phone2}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-white font-medium">
                        {COURSE_LABELS[l.courseInterest] || l.courseInterest}
                      </span>
                      <span className="text-xs text-dark-400">
                        {EMPLOYMENT_LABELS[l.employmentStatus] || l.employmentStatus} {l.isGrantEligible && '(Grant)'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge badge-${l.status.toLowerCase().replace('_', '-')}`}>
                      {STATUS_LABELS[l.status] || l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-dark-300">
                    {l.assignedTo?.name || <span className="text-dark-500 italic">Biriktirilmagan</span>}
                  </td>
                  <td className="px-4 py-3 text-dark-400 text-xs">
                    {new Date(l.createdAt).toLocaleString('uz-UZ', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setEditingLead({
                          ...l,
                          assignedToId: l.assignedToId || ''
                        })}
                        className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-md transition-colors"
                        title="Tahrirlash"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(l.id)}
                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                        title="O'chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-dark-800 bg-dark-900/30">
            <div className="text-xs text-dark-400">
              Jami <span className="font-semibold text-white">{leads.length}</span> tadan 
              <span className="font-semibold text-white"> {startIndex + 1}-{Math.min(startIndex + itemsPerPage, leads.length)}</span> ko'rsatilmoqda
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 border border-dark-750 text-xs font-semibold text-white disabled:opacity-50 disabled:pointer-events-none transition-all active:scale-95"
              >
                Oldingi
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                let pageNum = currentPage - 2 + idx;
                if (pageNum < 1) pageNum = idx + 1;
                if (pageNum > totalPages) return null;
                
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all active:scale-95 ${
                      currentPage === pageNum
                        ? 'bg-primary-600 border-primary-500 text-white shadow-md shadow-primary-600/20'
                        : 'bg-dark-850 border-dark-750 text-dark-300 hover:text-white hover:bg-dark-800'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 border border-dark-750 text-xs font-semibold text-white disabled:opacity-50 disabled:pointer-events-none transition-all active:scale-95"
              >
                Keyingi
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Edit Modal */}
      {editingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in">
          <div className="card glass w-full max-w-2xl overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-4 border-b border-dark-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Lidni tahrirlash</h3>
              <button onClick={() => setEditingLead(null)} className="p-2 text-dark-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-dark-400">Ism</label>
                  <input
                    type="text"
                    required
                    className="input h-10 text-sm"
                    value={editingLead.name}
                    onChange={e => setEditingLead({...editingLead, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-dark-400">Telefon</label>
                  <input
                    type="text"
                    required
                    className="input h-10 text-sm"
                    value={editingLead.phone}
                    onChange={e => setEditingLead({...editingLead, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-dark-400">Qo'shimcha telefon</label>
                  <input
                    type="text"
                    className="input h-10 text-sm"
                    value={editingLead.phone2 || ''}
                    onChange={e => setEditingLead({...editingLead, phone2: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-dark-400">Kurs</label>
                  <select
                    className="input h-10 text-sm"
                    value={editingLead.courseInterest}
                    onChange={e => setEditingLead({...editingLead, courseInterest: e.target.value})}
                  >
                    <option value="VIDEOGRAPHY">Videomontaj "videografiya"</option>
                    <option value="SMM">SMM</option>
                    <option value="TARGET_PRO">Target pro</option>
                    <option value="COMPUTER_GRAPHICS">Kompyuter grafikasi</option>
                    <option value="COMPUTER_LITERACY">Kompyuter savodxonligi</option>
                    <option value="GRAPHIC_DESIGN">Grafik dizayn</option>
                    <option value="AUTOCAD">AutoCAD</option>
                    <option value="THREE_D_MAX">3D MAX</option>
                    <option value="OTHER">Boshqa</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-dark-400">Bandlik</label>
                  <select
                    className="input h-10 text-sm"
                    value={editingLead.employmentStatus}
                    onChange={e => setEditingLead({...editingLead, employmentStatus: e.target.value})}
                  >
                    <option value="UNEMPLOYED">Ishsiz</option>
                    <option value="EMPLOYED_OFFICIAL">Rasmiy band</option>
                    <option value="EMPLOYED_UNOFFICIAL">Rasmiy band emas</option>
                    <option value="STUDENT">Talaba</option>
                    <option value="STUDENT_EXTERNAL">Talaba "sirtqi"</option>
                    <option value="SCHOOL_STUDENT">Maktab o'quvchisi</option>
                    <option value="HOUSEWIFE">Uy bekasi</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-dark-400">Holat</label>
                  <select
                    className="input h-10 text-sm"
                    value={editingLead.status}
                    onChange={e => setEditingLead({...editingLead, status: e.target.value})}
                  >
                    <option value="NEW">Yangi</option>
                    <option value="IN_PROGRESS">Jarayonda</option>
                    <option value="VOUCHER_CHECK">Vaucher tekshiruvi</option>
                    <option value="SUCCESS">Muvaffaqiyatli</option>
                    <option value="ARCHIVED">Arxiv</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-dark-400">Operatorga biriktirish</label>
                  <select
                    className="input h-10 text-sm"
                    value={editingLead.assignedToId || ''}
                    onChange={e => setEditingLead({...editingLead, assignedToId: e.target.value || null})}
                  >
                    <option value="">Biriktirilmagan</option>
                    {operators.map(op => (
                      <option key={op.id} value={op.id}>{op.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="grant"
                    className="w-4 h-4 rounded border-dark-700 bg-dark-800 text-primary-500 focus:ring-primary-500"
                    checked={editingLead.isGrantEligible}
                    onChange={e => setEditingLead({...editingLead, isGrantEligible: e.target.checked})}
                  />
                  <label htmlFor="grant" className="text-sm text-dark-200">Grant uchun da'vogar</label>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-dark-400">Izohlar</label>
                <textarea
                  className="input min-h-[80px] py-2 text-sm"
                  value={editingLead.notes || ''}
                  onChange={e => setEditingLead({...editingLead, notes: e.target.value})}
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingLead(null)}
                  className="btn-secondary flex-1"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex-1"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Add Lead Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 modal-backdrop animate-fade-in">
          <div className="card glass w-full max-w-2xl p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 border-b border-dark-800 pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary-400" />
                Yangi Lid Qo'shish
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-dark-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Ism */}
                <div>
                  <label className="label">Ism</label>
                  <input
                    type="text"
                    required
                    className="input bg-dark-800"
                    value={newLead.name}
                    onChange={e => setNewLead({...newLead, name: e.target.value})}
                    placeholder="Mashxura"
                  />
                </div>
                
                {/* Telefon */}
                <div>
                  <label className="label">Telefon</label>
                  <input
                    type="text"
                    required
                    className="input bg-dark-800"
                    value={newLead.phone}
                    onChange={e => setNewLead({...newLead, phone: e.target.value})}
                    placeholder="+998931263991"
                  />
                </div>

                {/* Qo'shimcha telefon */}
                <div>
                  <label className="label">Qo'shimcha telefon</label>
                  <input
                    type="text"
                    className="input bg-dark-800"
                    value={newLead.phone2}
                    onChange={e => setNewLead({...newLead, phone2: e.target.value})}
                    placeholder="+998931263991"
                  />
                </div>

                {/* Kurs */}
                <div>
                  <label className="label">Kurs</label>
                  <select
                    className="input bg-dark-800"
                    value={newLead.courseInterest}
                    onChange={e => setNewLead({...newLead, courseInterest: e.target.value})}
                  >
                    {COURSE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                    <option value="Boshqa">Boshqa</option>
                  </select>
                </div>

                {/* Bandlik */}
                <div>
                  <label className="label">Bandlik</label>
                  <select
                    className="input bg-dark-800"
                    value={newLead.employmentStatus}
                    onChange={e => setNewLead({...newLead, employmentStatus: e.target.value})}
                  >
                    {EMPLOYMENT_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Holat */}
                <div>
                  <label className="label">Holat</label>
                  <select
                    className="input bg-dark-800"
                    value={newLead.status}
                    onChange={e => setNewLead({...newLead, status: e.target.value})}
                  >
                    <option value="NEW">Yangi</option>
                    <option value="IN_PROGRESS">Jarayonda</option>
                    <option value="VOUCHER_CHECK">Tekshiruvda</option>
                    <option value="SUCCESS">Muvaffaqiyatli</option>
                  </select>
                </div>

                {/* Operator */}
                <div>
                  <label className="label">Operatorga biriktirish</label>
                  <select
                    className="input bg-dark-800"
                    value={newLead.assignedToId}
                    onChange={e => setNewLead({...newLead, assignedToId: e.target.value})}
                  >
                    <option value="">Avtomatik biriktirish</option>
                    {operators.map(op => (
                      <option key={op.id} value={op.id}>{op.name}</option>
                    ))}
                  </select>
                </div>

                {/* Grant Checkbox */}
                <div className="flex items-center gap-3 pt-8">
                  <input
                    type="checkbox"
                    id="grant-eligible"
                    className="w-5 h-5 rounded border-dark-700 bg-dark-800 text-primary-500 focus:ring-primary-500"
                    checked={newLead.isGrantEligible}
                    onChange={e => setNewLead({...newLead, isGrantEligible: e.target.checked})}
                  />
                  <label htmlFor="grant-eligible" className="text-white font-medium cursor-pointer">
                    Grant uchun da'vogar
                  </label>
                </div>
              </div>

              <div className="pt-6 flex gap-3 border-t border-dark-800">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 btn-secondary justify-center py-3">
                  Bekor qilish
                </button>
                <button type="submit" disabled={creating} className="flex-1 btn-primary justify-center py-3">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lidni Saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
