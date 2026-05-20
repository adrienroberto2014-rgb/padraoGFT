import React, { useState } from 'react';
import { Plus, X, Edit2, Trash2, Phone, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useInstructors } from '../../application/hooks/useInstructors';
import { motion, AnimatePresence } from 'motion/react';

export const InstructorsView = () => {
  const { instructors, addInstructor, updateInstructor, deleteInstructor } = useInstructors();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState<any>(null);
  const { isAdmin } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialty: '',
    bio: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingInstructor) {
        await updateInstructor(editingInstructor.id, formData);
      } else {
        await addInstructor(formData);
      }
      setIsModalOpen(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-black italic uppercase tracking-tighter">Professores</h1>
          <p className="text-gray-500 font-medium">Gerencie a equipe técnica da academia.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => { setEditingInstructor(null); setFormData({ name: '', email: '', phone: '', specialty: '', bio: '' }); setIsModalOpen(true); }}
            className="flex items-center justify-center px-6 py-3 text-sm font-black text-white bg-black rounded-xl hover:bg-gray-800 transition-all shadow-lg uppercase italic tracking-wider"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Professor
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {instructors.map(instructor => (
          <div key={instructor.id} className="p-6 bg-white border border-gray-100 rounded-[32px] shadow-sm hover:shadow-xl transition-all group">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl font-black text-gray-400 overflow-hidden">
                {instructor.photoURL ? <img src={instructor.photoURL} className="w-full h-full object-cover" alt="" /> : instructor.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 leading-tight">{instructor.name}</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{instructor.specialty || 'Professor'}</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-gray-500">
                <Phone className="w-4 h-4" />
                <span className="text-xs font-medium">{instructor.phone || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-500">
                <Mail className="w-4 h-4" />
                <span className="text-xs font-medium truncate">{instructor.email}</span>
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2 pt-6 border-t border-gray-50">
                <button 
                  onClick={() => { setEditingInstructor(instructor); setFormData(instructor); setIsModalOpen(true); }}
                  className="flex-1 py-2 bg-gray-50 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-100 transition-all"
                >
                  Editar
                </button>
                <button 
                  onClick={() => deleteInstructor(instructor.id)}
                  className="p-2 text-gray-400 hover:text-rose-500 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-8">
              <h2 className="text-2xl font-black text-black italic uppercase tracking-tighter mb-6">{editingInstructor ? 'Editar Professor' : 'Novo Professor'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input required placeholder="Nome" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                <input required type="email" placeholder="Email" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                <input placeholder="Telefone" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                <input placeholder="Especialidade (ex: Jiu-Jitsu, Judô)" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} />
                <button type="submit" className="w-full py-4 bg-black text-white font-black rounded-2xl hover:bg-gray-800 transition-all uppercase italic">Salvar</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
