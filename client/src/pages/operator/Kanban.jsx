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
import { Clock, Phone, User, Calendar, MessageSquare } from 'lucide-react';
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
          <Phone className="w-3 h-3" />
          {lead.phone}
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
    </div>
  );
}

export default function Kanban() {
  const [leads, setLeads] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const { addNotification } = useNotification();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const res = await api.get('/leads');
      setLeads(res.data.leads);
    } catch (error) {
      addNotification('error', "Lidlarni yuklashda xatolik");
    }
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Ish stoli</h1>
          <p className="text-dark-400 text-sm">Lidlarni boshqarish (Kanban)</p>
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
