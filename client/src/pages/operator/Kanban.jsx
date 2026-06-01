import { useState, useEffect } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core';
import { 
  SortableContext, 
  arrayMove, 
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, Phone, User, Calendar, MessageSquare, Search, Download, Loader2 } from 'lucide-react';
import { formatDistanceToNow, isPast } from 'date-fns';
import { uz } from 'date-fns/locale';
import api from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';
import LeadModal from '../../components/LeadModal';

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

const COLUMNS = [
  { id: 'NEW', title: 'Yangi', color: 'border-blue-500' },
  { id: 'IN_PROGRESS', title: 'Jarayonda', color: 'border-yellow-500' },
  { id: 'VOUCHER_CHECK', title: 'Vaucher tekshiruvi', color: 'border-purple-500' },
  { id: 'SUCCESS', title: 'Muvaffaqiyatli', color: 'border-green-500' },
  { id: 'ARCHIVED', title: 'Rad etildi', color: 'border-red-500' },
];

// Sortable Lead Card Component
function SortableLeadCard({ lead, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id, data: { ...lead } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  // Determine SLA color
  let slaClass = '';
  if (lead.status === 'NEW' && lead.slaDeadline) {
    const deadline = new Date(lead.slaDeadline);
    const now = new Date();
    const diffMins = (deadline - now) / 1000 / 60;
    
    if (lead.slaBreached || diffMins < 0) slaClass = 'sla-red';
    else if (diffMins < 5) slaClass = 'sla-yellow';
    else slaClass = 'sla-green';
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(lead)}
      className={`bg-dark-800 p-3 rounded-lg border border-dark-700 cursor-grab active:cursor-grabbing hover:border-dark-500 transition-colors ${slaClass}`}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-white text-sm">{lead.name}</h4>
        <div className="flex flex-col gap-1 items-end">
          <span className="text-[10px] text-primary-400 bg-primary-500/10 px-1.5 py-0.5 rounded leading-none">
            {COURSE_LABELS[lead.courseInterest] || lead.courseInterest}
          </span>
          <span className="text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded leading-none">
            {EMPLOYMENT_LABELS[lead.employmentStatus] || lead.employmentStatus}
          </span>
        </div>
      </div>
      
      <div className="space-y-1.5 mt-3">
        <div className="flex items-center text-xs text-dark-300 gap-2">
          <Phone className="w-3 h-3 text-primary-400" />
          <a 
            href={`tel:${lead.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="hover:text-primary-400 hover:underline transition-colors font-medium"
          >
            {lead.phone}
          </a>
        </div>
        
        <div className="flex items-center text-xs text-dark-400 gap-2">
          <Clock className="w-3 h-3" />
          Qo'shildi: {new Date(lead.createdAt).toLocaleString('uz-UZ', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
        </div>
        
        {lead.status === 'NEW' && lead.slaDeadline && (
          <div className={`flex items-center text-xs gap-2 ${lead.slaBreached ? 'text-red-400' : 'text-dark-300'}`}>
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(lead.slaDeadline), { addSuffix: true, locale: uz })}
          </div>
        )}

        {lead.nextContactDate && (
          <div className="flex items-center text-xs text-yellow-400 gap-2">
            <Calendar className="w-3 h-3" />
            Keyingi: {new Date(lead.nextContactDate).toLocaleDateString('uz-UZ')}
          </div>
        )}
      </div>

      {(lead.notes || (lead.comments && lead.comments.length > 0)) && (
        <div className="mt-3 pt-2 border-t border-dark-700/50">
          {lead.notes && (
            <p className="text-xs text-dark-300 line-clamp-2 mb-1.5" title={lead.notes}>
              <span className="text-dark-400">Izoh:</span> {lead.notes}
            </p>
          )}
          {lead.comments && lead.comments.length > 0 && (
            <div className="flex items-start gap-1.5 text-xs text-dark-300">
              <MessageSquare className="w-3 h-3 mt-0.5 shrink-0 text-primary-500/70" />
              <p className="line-clamp-2" title={lead.comments[0].content}>
                <span className="text-primary-400/80 mr-1">{lead.comments[0].author?.name || 'Operator'}:</span> 
                {lead.comments[0].content}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Kanban() {
  const [leads, setLeads] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [exporting, setExporting] = useState(false);
  const { addNotification } = useNotification();

  const handleExport = async () => {
    setExporting(true);
    try {
      let url = '/leads/export/excel';
      if (searchTerm) {
        url += `?search=${encodeURIComponent(searchTerm)}`;
      }
      const response = await api.get(url, {
        responseType: 'blob',
      });
      const urlBlob = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = urlBlob;
      link.setAttribute('download', 'mening_lidlarim.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      addNotification('success', "Sizga biriktirilgan lidlar Excel fayl bo'lib yuklab olindi");
    } catch (error) {
      addNotification('error', "Eksport qilishda xatolik");
    } finally {
      setExporting(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async (search = '') => {
    try {
      const res = await api.get(`/leads?search=${encodeURIComponent(search)}`);
      setLeads(res.data.leads);
    } catch (error) {
      addNotification('error', "Lidlarni yuklashda xatolik");
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLeads(searchTerm);
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeLeadId = active.id;
    const overId = over.id; // Could be a column ID or another lead ID

    const activeLead = leads.find(l => l.id === activeLeadId);
    if (!activeLead) return;

    let newStatus = activeLead.status;

    // Check if dropped over a column
    if (COLUMNS.find(c => c.id === overId)) {
      newStatus = overId;
    } else {
      // Dropped over another lead
      const overLead = leads.find(l => l.id === overId);
      if (overLead) {
        newStatus = overLead.status;
      }
    }

    if (activeLead.status === newStatus) return;

    // Optimistic UI update
    setLeads(leads.map(l => l.id === activeLeadId ? { ...l, status: newStatus } : l));

    try {
      // In a real app, we might want to force a comment modal here
      await api.patch(`/leads/${activeLeadId}`, { status: newStatus });
      addNotification('success', "Lid holati o'zgardi");
    } catch (error) {
      addNotification('error', "Xatolik yuz berdi");
      fetchLeads(); // Revert
    }
  };

  // Organize leads by status
  const columns = COLUMNS.reduce((acc, col) => {
    acc[col.id] = leads.filter(l => l.status === col.id);
    return acc;
  }, {});

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Ish stoli</h1>
          <p className="text-dark-400 text-sm">Lidlarni boshqarish (Kanban)</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <form onSubmit={handleSearch} className="relative flex-1 sm:flex-initial sm:max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-dark-500" />
            </div>
            <input
              type="text"
              className="input pl-10 h-10 text-sm bg-dark-900/50 border-dark-800"
              placeholder="Ism yoki telefon..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>
          <button 
            onClick={handleExport}
            disabled={exporting}
            className="btn-primary h-10 px-4 text-sm font-semibold justify-center bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 shrink-0 shadow-lg shadow-green-500/10 border-none"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>Excelga yuklash</span>
          </button>
        </div>
      </div>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1 h-full">
          {COLUMNS.map(column => (
            <div key={column.id} className="kanban-column flex-1 min-w-[300px]">
              <div className={`border-b-2 ${column.color} pb-2 mb-3 flex justify-between items-center px-1`}>
                <h3 className="font-semibold text-white">{column.title}</h3>
                <span className="bg-dark-800 text-dark-300 text-xs px-2 py-1 rounded-full">
                  {columns[column.id]?.length || 0}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                <SortableContext 
                  id={column.id}
                  items={columns[column.id]?.map(l => l.id) || []}
                  strategy={verticalListSortingStrategy}
                >
                  {columns[column.id]?.map(lead => (
                    <SortableLeadCard 
                      key={lead.id} 
                      lead={lead} 
                      onClick={(l) => setSelectedLeadId(l.id)} 
                    />
                  ))}
                  {/* Drop zone for empty column */}
                  {(!columns[column.id] || columns[column.id].length === 0) && (
                    <div className="h-full min-h-[100px] border-2 border-dashed border-dark-800 rounded-lg flex items-center justify-center text-dark-500 text-sm">
                      Lidlar yo'q
                    </div>
                  )}
                </SortableContext>
              </div>
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="drag-overlay bg-dark-800 p-3 rounded-lg border border-primary-500 w-[280px]">
              <div className="font-medium text-white mb-2">
                {leads.find(l => l.id === activeId)?.name}
              </div>
              <div className="text-xs text-dark-300">Drag in progress...</div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {selectedLeadId && (
        <LeadModal 
          leadId={selectedLeadId} 
          onClose={() => setSelectedLeadId(null)} 
          onUpdate={fetchLeads} 
        />
      )}
    </div>
  );
}
