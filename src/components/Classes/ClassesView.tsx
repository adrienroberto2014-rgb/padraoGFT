import React, { useState, useMemo } from 'react';
import { Plus, Clock, Calendar as CalendarIcon, X, Edit2, Trash2, Users, Check, ChevronLeft, ChevronRight, Grid, List, Eye, UserX, UserCheck } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import { useClasses } from '../../application/hooks/useClasses';
import { cn } from '../../utils/formatters';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

import { useInstructors } from '../../application/hooks/useInstructors';
import { useStudents } from '../../application/hooks/useStudents';

export const ClassesView = () => {
  const { isAdmin, user, permissions } = useAuth();
  const { instructors } = useInstructors(true);
  const { students } = useStudents(true, isAdmin || permissions.students, (isAdmin || permissions.students) ? undefined : user?.email);
  
  const { 
    classes, 
    addBulkClasses, 
    updateClass, 
    updateBulkClasses, 
    deleteClass, 
    deleteBulkClasses,
    saveClass,
    deleteClassByScope
  } = useClasses();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [isPresenceModalOpen, setIsPresenceModalOpen] = useState(false);
  const [selectedClassForPresence, setSelectedClassForPresence] = useState<any>(null);
  const [showUpdateScopeModal, setShowUpdateScopeModal] = useState(false);
  const [showDeleteScopeModal, setShowDeleteScopeModal] = useState(false);
  const [pendingUpdateData, setPendingUpdateData] = useState<any>(null);
  const [classToDelete, setClassToDelete] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'timeline' | 'calendar'>('timeline');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const nextDays = useMemo(() => {
    return Array.from({ length: 14 }).map((_, i) => addDays(startOfDay(new Date()), i));
  }, []);
  
  const [formData, setFormData] = useState({
    title: '',
    instructorIds: [] as string[],
    categories: [] as string[],
    daysOfWeek: [] as string[],
    startTime: '',
    endTime: '',
    capacity: 20,
    checkInOffset: 30,
    isRecurring: true,
    recurrenceWeeks: 4,
    modality: 'Jiu-Jitsu'
  });

  const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const categories = ['Adulto', 'Kids', 'Juvenil', 'No-Gi', 'Competição'];

  const formatTime = (time: any) => {
    if (!time) return '';
    if (typeof time === 'string') return time;
    if (time.seconds) {
      return format(new Date(time.seconds * 1000), 'HH:mm');
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.daysOfWeek.length === 0) {
      toast.error("Selecione pelo menos um dia da semana.");
      return;
    }

    const dataToSave = {
      ...formData,
      startTime: formData.startTime,
      endTime: formData.endTime,
      updatedAt: new Date()
    };

    if (editingClass && editingClass.recurrenceId) {
      setPendingUpdateData(dataToSave);
      setShowUpdateScopeModal(true);
      return;
    }

    await performSave(dataToSave);
  };

  const performSave = async (dataToSave: any, scope: 'single' | 'all' = 'single') => {
    try {
      await saveClass(dataToSave, editingClass, scope);
      setIsModalOpen(false);
      setShowUpdateScopeModal(false);
      setPendingUpdateData(null);
      setEditingClass(null);
    } catch (error) {
      console.error("Error saving class:", error);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Deseja excluir as ${selectedClasses.length} aulas selecionadas?`)) return;
    
    try {
      await deleteBulkClasses(selectedClasses);
      setSelectedClasses([]);
      toast.success("Aulas excluídas com sucesso!");
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast.error("Erro ao excluir aulas.");
    }
  };

  const performDelete = async (scope: 'single' | 'all' = 'single') => {
    if (!classToDelete) return;
    try {
      await deleteClassByScope(classToDelete, scope);
      setShowDeleteScopeModal(false);
      setClassToDelete(null);
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedClasses(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const classesByDate = useMemo(() => {
    const grouped: { [key: string]: any[] } = {};
    
    const relevantClasses = classes.filter(cls => {
      if (!cls.date) return false;
      const classDate = cls.date.seconds ? new Date(cls.date.seconds * 1000) : new Date(cls.date);
      
      if (viewMode === 'timeline') {
        // Show classes from selected date onwards for timeline
        return classDate >= startOfDay(selectedDate);
      }
      if (viewMode === 'calendar') {
        return isSameDay(classDate, selectedDate);
      }
      return true;
    });

    relevantClasses.sort((a, b) => {
      const dateA = a.date.seconds ? a.date.seconds : new Date(a.date).getTime() / 1000;
      const dateB = b.date.seconds ? b.date.seconds : new Date(b.date).getTime() / 1000;
      if (dateA !== dateB) return dateA - dateB;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    relevantClasses.forEach(cls => {
      const dateKey = cls.date.seconds ? format(new Date(cls.date.seconds * 1000), 'yyyy-MM-dd') : format(new Date(cls.date), 'yyyy-MM-dd');
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(cls);
    });

    return grouped;
  }, [classes, viewMode, selectedDate]);

  const filteredClasses = useMemo(() => {
    if (viewMode === 'calendar') {
      return classes.filter(cls => {
        if (!cls.date) return false;
        const classDate = cls.date.seconds ? new Date(cls.date.seconds * 1000) : new Date(cls.date);
        return isSameDay(classDate, selectedDate);
      });
    }
    return classes;
  }, [classes, viewMode, selectedDate]);

  const renderClassCard = (cls: any) => {
    const classInstructors = instructors.filter(i => cls.instructorIds?.includes(i.id));
    const isSelected = selectedClasses.includes(cls.id);

    return (
      <div 
        key={cls.id} 
        className={cn(
          "p-6 bg-white border rounded-[32px] shadow-sm hover:shadow-xl transition-all group relative",
          isSelected ? "border-black ring-1 ring-black" : "border-gray-100"
        )}
      >
        {isAdmin && (
          <div className="absolute top-4 right-4 z-10">
            <button 
              onClick={() => toggleSelection(cls.id)}
              className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                isSelected ? "bg-black border-black text-white" : "border-gray-200 bg-white hover:border-gray-400"
              )}
            >
              {isSelected && <Check className="w-3 h-3" />}
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mb-4 pr-8">
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500">
              {cls.dayOfWeek}
            </div>
            <div className={cn(
              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
              cls.modality === 'Muay Thai' ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"
            )}>
              {cls.modality || 'Jiu-Jitsu'}
            </div>
          </div>
          <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
            <Clock className="w-3 h-3" />
            {formatTime(cls.startTime)} - {formatTime(cls.endTime)}
          </div>
        </div>

        <h3 className="text-xl font-black text-gray-900 mb-2 uppercase italic tracking-tighter">{cls.title || cls.name}</h3>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {cls.categories?.map((cat: string, idx: number) => (
            <span key={`${cls.id}-${cat}-${idx}`} className="px-2 py-0.5 bg-gray-50 text-gray-400 text-[9px] font-bold uppercase tracking-wider rounded-md">
              {cat}
            </span>
          ))}
        </div>

        <div className="flex items-center -space-x-2 mb-6">
          {classInstructors.map((instructor, idx) => (
            <div 
              key={`${cls.id}-${instructor.id}-${idx}`} 
              className="w-8 h-8 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold text-gray-400 overflow-hidden"
              title={instructor.name}
            >
              {instructor.name.charAt(0)}
            </div>
          ))}
          {classInstructors.length === 0 && (
            <span className="text-xs font-medium text-gray-400 ml-2">Sem instrutor</span>
          )}
          {classInstructors.length > 0 && (
            <span className="text-xs font-medium text-gray-500 ml-4">
              {classInstructors.length === 1 ? classInstructors[0].name : `${classInstructors.length} Professores`}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-gray-50">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-gray-900">
              <UserCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-black">{(cls.presence || []).length} Presentes</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Users className="w-4 h-4" />
              <span className="text-[10px] font-bold">{cls.capacity} Vagas Totais</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setSelectedClassForPresence(cls);
                setIsPresenceModalOpen(true);
              }}
              className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all group/btn"
              title="Ver lista de presença"
            >
              <Eye className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
            </button>
            
            {isAdmin && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => { 
                    setEditingClass(cls); 
                    setFormData({
                      title: cls.title || cls.name || '',
                      instructorIds: cls.instructorIds || [],
                      categories: cls.categories || [],
                      daysOfWeek: cls.daysOfWeek || (cls.dayOfWeek ? [cls.dayOfWeek] : []),
                      startTime: cls.startTime || '',
                      endTime: cls.endTime || '',
                      capacity: cls.capacity || 20,
                      checkInOffset: cls.checkInOffset || 30,
                      isRecurring: cls.isRecurring || false,
                      recurrenceWeeks: 4,
                      modality: cls.modality || 'Jiu-Jitsu'
                    }); 
                    setIsModalOpen(true); 
                  }} 
                  className="p-2 text-gray-400 hover:text-black transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (cls.recurrenceId) {
                      setClassToDelete(cls);
                      setShowDeleteScopeModal(true);
                    } else if (confirm("Deseja excluir esta aula?")) {
                      setClassToDelete(cls);
                      performDelete('single');
                    }
                  }}
                  className="p-2 text-gray-400 hover:text-rose-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCalendarTile = ({ date, view }: any) => {
    if (view === 'month') {
      const dayClasses = classes.filter(cls => {
        if (!cls.date) return false;
        const classDate = cls.date.seconds ? new Date(cls.date.seconds * 1000) : new Date(cls.date);
        return isSameDay(classDate, date);
      });
      
      if (dayClasses.length > 0) {
        return (
          <div className="mt-1 flex justify-center gap-0.5">
            {dayClasses.slice(0, 3).map((_, i) => (
              <div key={i} className="w-1 h-1 bg-black rounded-full" />
            ))}
          </div>
        );
      }
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <style>{`
        .react-calendar {
          width: 100%;
          border: none;
          background: white;
          font-family: inherit;
          border-radius: 32px;
          padding: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        }
        .react-calendar__tile--active {
          background: black !important;
          border-radius: 12px;
        }
        .react-calendar__tile--now {
          background: #f3f4f6;
          border-radius: 12px;
        }
        .react-calendar__navigation button {
          font-weight: bold;
          text-transform: uppercase;
          font-style: italic;
        }
      `}</style>

      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-black italic uppercase tracking-tighter">Aulas</h1>
          <p className="text-gray-500 font-medium">Gerencie a grade de horários da academia.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white shadow-sm text-black" : "text-gray-400")}
              title="Grade"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('timeline')}
              className={cn("p-2 rounded-lg transition-all", viewMode === 'timeline' ? "bg-white shadow-sm text-black" : "text-gray-400")}
              title="Linha do Tempo"
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={cn("p-2 rounded-lg transition-all", viewMode === 'calendar' ? "bg-white shadow-sm text-black" : "text-gray-400")}
              title="Calendário"
            >
              <CalendarIcon className="w-4 h-4" />
            </button>
          </div>
          
          {selectedClasses.length > 0 && isAdmin && (
            <button 
              onClick={handleBulkDelete}
              className="flex items-center justify-center px-6 py-3 text-sm font-black text-white bg-rose-500 rounded-xl hover:bg-rose-600 transition-all shadow-lg uppercase italic tracking-wider"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir ({selectedClasses.length})
            </button>
          )}

          {isAdmin && (
            <button 
              onClick={() => { 
                setEditingClass(null); 
                setFormData({ 
                  title: '', 
                  instructorIds: [], 
                  categories: [], 
                  daysOfWeek: [], 
                  startTime: '', 
                  endTime: '', 
                  capacity: 20,
                  checkInOffset: 30,
                  isRecurring: true,
                  recurrenceWeeks: 4
                }); 
                setIsModalOpen(true); 
              }}
              className="flex items-center justify-center px-6 py-3 text-sm font-black text-white bg-black rounded-xl hover:bg-gray-800 transition-all shadow-lg uppercase italic tracking-wider"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Aula
            </button>
          )}
        </div>
      </header>

      {viewMode !== 'grid' && (
        <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6 sm:mx-0 sm:px-0">
          {nextDays.map((date) => {
            const isSelected = isSameDay(date, selectedDate);
            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  "flex flex-col items-center min-w-[70px] p-4 rounded-3xl transition-all border-2",
                  isSelected 
                    ? "bg-black border-black text-white shadow-lg scale-105" 
                    : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                )}
              >
                <span className="text-[10px] font-black uppercase tracking-widest mb-1">
                  {format(date, 'EEE', { locale: ptBR })}
                </span>
                <span className="text-xl font-black italic">
                  {format(date, 'dd')}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {viewMode === 'calendar' && (
          <div className="lg:w-80 shrink-0">
            <Calendar 
              onChange={setSelectedDate} 
              value={selectedDate}
              locale="pt-BR"
              tileContent={renderCalendarTile}
            />
          </div>
        )}

        <div className="flex-1">
          {viewMode === 'calendar' && (
            <div className="mb-6">
              <h2 className="text-xl font-black text-black italic uppercase tracking-tighter">
                Aulas de {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </h2>
            </div>
          )}

          <div className={cn(
            viewMode === 'timeline' ? "space-y-12" : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          )}>
            {viewMode === 'grid' ? (
              classes.map(cls => renderClassCard(cls))
            ) : (
              (Object.entries(classesByDate) as [string, any[]][]).map(([dateKey, dateClasses]) => (
                <div key={dateKey} className="space-y-6">
                  <div className="flex items-center gap-4">
                    <h3 className="text-xl font-black text-black italic uppercase tracking-tighter">
                      {isSameDay(parseISO(dateKey), new Date()) ? 'Hoje' : 
                       isSameDay(parseISO(dateKey), addDays(new Date(), 1)) ? 'Amanhã' :
                       format(parseISO(dateKey), "EEEE, d 'de' MMM", { locale: ptBR })}
                    </h3>
                    <div className="h-px bg-gray-100 flex-1" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{dateClasses.length} Aulas</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {dateClasses.map(cls => renderClassCard(cls))}
                  </div>
                </div>
              ))
            )}

            {Object.keys(classesByDate).length === 0 && viewMode !== 'grid' && (
              <div className="col-span-full py-12 text-center bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200">
                <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Nenhuma aula encontrada para este período.</p>
              </div>
            )}
            
            {classes.length === 0 && viewMode === 'grid' && (
              <div className="col-span-full py-12 text-center bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200">
                <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">A grade de horários está vazia.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isPresenceModalOpen && selectedClassForPresence && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsPresenceModalOpen(false)} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h2 className="text-2xl font-black text-black italic uppercase tracking-tighter">Lista de Presença</h2>
                  <p className="text-sm text-gray-500 font-medium">{selectedClassForPresence.title} • {selectedClassForPresence.dayOfWeek}</p>
                </div>
                <button 
                  onClick={() => setIsPresenceModalOpen(false)}
                  className="p-3 bg-white rounded-2xl shadow-sm text-gray-400 hover:text-black transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Present Students */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h3 className="text-sm font-black text-gray-900 uppercase italic tracking-tighter">Presentes ({(selectedClassForPresence.presence || []).length})</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(selectedClassForPresence.presence || []).length > 0 ? (
                      selectedClassForPresence.presence.map((studentId: string) => {
                        const student = students.find(s => s.id === studentId);
                        return (
                          <div key={studentId} className="flex items-center p-3 bg-emerald-50/50 border border-emerald-100/50 rounded-2xl">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs mr-3">
                              {student?.name?.charAt(0) || '?'}
                            </div>
                            <span className="text-sm font-bold text-gray-900">{student?.name || 'Aluno não encontrado'}</span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-gray-400 italic">Nenhum aluno marcou presença ainda.</p>
                    )}
                  </div>
                </section>

                {/* Absent Students (Registered but not present) */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-rose-100 rounded-lg">
                      <UserX className="w-4 h-4 text-rose-600" />
                    </div>
                    <h3 className="text-sm font-black text-gray-900 uppercase italic tracking-tighter">
                      Ausentes ({(selectedClassForPresence.attendees || []).filter((id: string) => !(selectedClassForPresence.presence || []).includes(id)).length})
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(() => {
                      const absentIds = (selectedClassForPresence.attendees || []).filter((id: string) => !(selectedClassForPresence.presence || []).includes(id));
                      return absentIds.length > 0 ? (
                        absentIds.map((studentId: string) => {
                          const student = students.find(s => s.id === studentId);
                          return (
                            <div key={studentId} className="flex items-center p-3 bg-gray-50 border border-gray-100 rounded-2xl opacity-60">
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs mr-3">
                                {student?.name?.charAt(0) || '?'}
                              </div>
                              <span className="text-sm font-bold text-gray-900">{student?.name || 'Aluno não encontrado'}</span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-gray-400 italic">Todos os alunos agendados estão presentes.</p>
                      );
                    })()}
                  </div>
                </section>
              </div>

              <div className="p-8 border-t border-gray-100 bg-gray-50/30">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-bold uppercase">Total Agendados</span>
                  <span className="text-gray-900 font-black">{(selectedClassForPresence.attendees || []).length} Alunos</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showDeleteScopeModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowDeleteScopeModal(false)} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-8"
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto">
                  <Trash2 className="w-8 h-8 text-rose-500" />
                </div>
                <h2 className="text-2xl font-black text-black italic uppercase tracking-tighter">Excluir Aula Recorrente</h2>
                <p className="text-gray-500 font-medium">Esta aula faz parte de uma série. Como você deseja excluir?</p>
                
                <div className="grid grid-cols-1 gap-3 pt-4">
                  <button 
                    onClick={() => performDelete('single')}
                    className="w-full py-4 bg-gray-100 text-black font-bold rounded-2xl hover:bg-gray-200 transition-all"
                  >
                    Apenas esta aula
                  </button>
                  <button 
                    onClick={() => performDelete('all')}
                    className="w-full py-4 bg-rose-500 text-white font-black rounded-2xl hover:bg-rose-600 transition-all uppercase italic tracking-widest shadow-lg"
                  >
                    Excluir toda a série
                  </button>
                  <button 
                    onClick={() => setShowDeleteScopeModal(false)}
                    className="w-full py-4 text-gray-400 font-bold hover:text-gray-600 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showUpdateScopeModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowUpdateScopeModal(false)} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-8"
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-black text-black italic uppercase tracking-tighter">Aula Recorrente</h2>
                <p className="text-gray-500 font-medium">Esta aula faz parte de uma série recorrente. Como você deseja aplicar as alterações?</p>
                
                <div className="grid grid-cols-1 gap-3 pt-4">
                  <button 
                    onClick={() => performSave(pendingUpdateData, 'single')}
                    className="w-full py-4 bg-gray-100 text-black font-bold rounded-2xl hover:bg-gray-200 transition-all"
                  >
                    Apenas nesta aula
                  </button>
                  <button 
                    onClick={() => performSave(pendingUpdateData, 'all')}
                    className="w-full py-4 bg-black text-white font-black rounded-2xl hover:bg-gray-800 transition-all uppercase italic tracking-widest shadow-lg"
                  >
                    Em todas as aulas da série
                  </button>
                  <button 
                    onClick={() => setShowUpdateScopeModal(false)}
                    className="w-full py-4 text-gray-400 font-bold hover:text-gray-600 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden p-8 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-black text-black italic uppercase tracking-tighter mb-6">{editingClass ? 'Editar Aula' : 'Nova Aula'}</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Título da Aula</label>
                  <input required placeholder="Ex: Jiu-Jitsu Iniciante" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Modalidade</label>
                  <div className="flex gap-2">
                    {['Jiu-Jitsu', 'Muay Thai'].map(mod => (
                      <button
                        key={mod}
                        type="button"
                        onClick={() => setFormData({ ...formData, modality: mod })}
                        className={cn(
                          "flex-1 px-4 py-3 rounded-xl text-xs font-bold transition-all",
                          formData.modality === mod ? "bg-black text-white shadow-lg" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                        )}
                      >
                        {mod}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Professores</label>
                  <div className="grid grid-cols-2 gap-2">
                    {instructors.map(i => (
                      <button
                        key={i.id}
                        type="button"
                        onClick={() => {
                          const ids = (formData.instructorIds || []).includes(i.id)
                            ? (formData.instructorIds || []).filter(id => id !== i.id)
                            : [...(formData.instructorIds || []), i.id];
                          setFormData({...formData, instructorIds: ids});
                        }}
                        className={cn(
                          "px-4 py-3 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between",
                          (formData.instructorIds || []).includes(i.id) ? "bg-black text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                        )}
                      >
                        {i.name}
                        {(formData.instructorIds || []).includes(i.id) && <Check className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Categorias</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          const cats = (formData.categories || []).includes(cat)
                            ? (formData.categories || []).filter(c => c !== cat)
                            : [...(formData.categories || []), cat];
                          setFormData({...formData, categories: cats});
                        }}
                        className={cn(
                          "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                          (formData.categories || []).includes(cat) ? "bg-black text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Dias da Semana</label>
                  <div className="flex flex-wrap gap-2">
                    {days.map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          const selectedDays = (formData.daysOfWeek || []).includes(d)
                            ? (formData.daysOfWeek || []).filter(day => day !== d)
                            : [...(formData.daysOfWeek || []), d];
                          setFormData({...formData, daysOfWeek: selectedDays});
                        }}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          (formData.daysOfWeek || []).includes(d) ? "bg-black text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Capacidade</label>
                    <input type="number" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none" value={formData.capacity || ''} onChange={e => setFormData({...formData, capacity: parseInt(e.target.value) || 0})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Check-in (min antes)</label>
                    <input type="number" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none" value={formData.checkInOffset} onChange={e => setFormData({...formData, checkInOffset: parseInt(e.target.value) || 0})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Início</label>
                    <input required type="time" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Fim</label>
                    <input required type="time" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                  </div>
                </div>

                {!editingClass && (
                  <div className="p-6 bg-gray-50 rounded-[32px] space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900">Aula Recorrente?</span>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, isRecurring: !formData.isRecurring})}
                        className={cn(
                          "w-12 h-6 rounded-full transition-all relative",
                          formData.isRecurring ? "bg-black" : "bg-gray-200"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                          formData.isRecurring ? "right-1" : "left-1"
                        )} />
                      </button>
                    </div>
                    {formData.isRecurring && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Repetir por quantas semanas?</label>
                        <input type="number" min="1" max="52" className="w-full px-4 py-3 bg-white rounded-xl outline-none border border-gray-100" value={formData.recurrenceWeeks} onChange={e => setFormData({...formData, recurrenceWeeks: parseInt(e.target.value)})} />
                      </div>
                    )}
                  </div>
                )}

                <button type="submit" className="w-full py-5 bg-black text-white font-black rounded-[24px] hover:bg-gray-800 transition-all uppercase italic tracking-widest shadow-xl">
                  {editingClass ? 'Atualizar Aula' : 'Criar Aula'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
