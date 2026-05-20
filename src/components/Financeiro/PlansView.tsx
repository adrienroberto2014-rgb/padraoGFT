import React, { useState } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Package, 
  X,
  AlertCircle
} from 'lucide-react';
import { usePlans } from '../../application/hooks/usePlans';
import { cn } from '../../utils/formatters';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

export const PlansView = () => {
  const { plans, addPlan, updatePlan, deletePlan } = usePlans(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    price: 0,
    durationMonths: 1,
    description: '',
    status: 'Active',
    allowedModalities: ['Jiu-Jitsu'] as string[]
  });

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        await updatePlan(editingPlan.id, planForm);
        toast.success("Plano atualizado!");
      } else {
        await addPlan(planForm);
        toast.success("Plano criado!");
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving plan:", error);
      toast.error("Erro ao salvar plano.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-black italic uppercase tracking-tighter">Planos</h1>
          <p className="text-gray-500 font-medium">Gerencie as opções de assinatura e mensalidades.</p>
        </div>
        <button 
          onClick={() => {
            setEditingPlan(null);
            setPlanForm({ name: '', price: 0, durationMonths: 1, description: '', status: 'Active', allowedModalities: ['Jiu-Jitsu'] });
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center px-6 py-2 text-sm font-bold text-white bg-black rounded-xl hover:bg-gray-800 transition-all shadow-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Plano
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.length > 0 ? plans.map((plan) => (
          <div key={`plan-${plan.id}`} className="group relative bg-white border border-gray-100 rounded-[40px] p-8 shadow-sm hover:shadow-xl hover:shadow-black/5 transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-gray-50 rounded-2xl group-hover:bg-black group-hover:text-white transition-colors">
                <Package className="w-6 h-6" />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setEditingPlan(plan); setPlanForm(plan); setIsModalOpen(true); }}
                  className="p-2 text-gray-400 hover:text-black bg-gray-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={async () => {
                    if (confirm("Deseja excluir este plano? Isso não afetará alunos já vinculados.")) {
                      await deletePlan(plan.id);
                      toast.success("Plano removido");
                    }
                  }}
                  className="p-2 text-gray-400 hover:text-rose-500 bg-gray-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-black uppercase italic tracking-tighter">{plan.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-black">R$ {plan.price}</span>
                <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">/ {plan.durationMonths} {plan.durationMonths === 1 ? 'Mês' : 'Meses'}</span>
              </div>
            </div>

            {plan.description && (
              <p className="mt-4 text-sm text-gray-500 leading-relaxed font-medium">{plan.description}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {(plan.allowedModalities || ['Jiu-Jitsu']).map((mod: string) => (
                <span key={mod} className={cn(
                  "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest",
                  mod === 'Muay Thai' ? "bg-rose-50 text-rose-500 border border-rose-100" : "bg-blue-50 text-blue-500 border border-blue-100"
                )}>
                  {mod}
                </span>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                plan.status === 'Active' ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-500"
              )}>
                {plan.status === 'Active' ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-20 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center">
            <Package className="w-12 h-12 text-gray-200 mb-4" />
            <h3 className="text-lg font-bold text-gray-400">Nenhum plano cadastrado</h3>
            <p className="text-sm text-gray-400">Comece criando seu primeiro plano de mensalidade.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-black italic uppercase tracking-tighter">{editingPlan ? 'Editar Plano' : 'Novo Plano'}</h2>
                  <p className="text-gray-500 font-medium text-sm">Configure as condições do plano.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSavePlan} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Nome do Plano</label>
                  <input 
                    required 
                    placeholder="Ex: Mensal Adulto" 
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-gray-200 font-bold" 
                    value={planForm.name} 
                    onChange={e => setPlanForm({...planForm, name: e.target.value})} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Valor (R$)</label>
                    <input 
                      required 
                      type="number"
                      step="0.01"
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-gray-200 font-bold" 
                      value={planForm.price} 
                      onChange={e => setPlanForm({...planForm, price: parseFloat(e.target.value)})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Duração (Meses)</label>
                    <input 
                      required 
                      type="number"
                      min="1"
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-gray-200 font-bold" 
                      value={planForm.durationMonths} 
                      onChange={e => setPlanForm({...planForm, durationMonths: parseInt(e.target.value)})} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Descrição</label>
                  <textarea 
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-gray-200 min-h-[100px] resize-none text-sm transition-all" 
                    placeholder="Opcional: Detalhes do plano..."
                    value={planForm.description} 
                    onChange={e => setPlanForm({...planForm, description: e.target.value})} 
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Modalidades Incluídas</label>
                  <div className="flex flex-wrap gap-2">
                    {['Jiu-Jitsu', 'Muay Thai'].map(mod => {
                      const isSelected = (planForm.allowedModalities || []).includes(mod);
                      return (
                        <button
                          key={mod}
                          type="button"
                          onClick={() => {
                            const current = planForm.allowedModalities || [];
                            const next = isSelected 
                              ? current.filter(m => m !== mod)
                              : [...current, mod];
                            setPlanForm({ ...planForm, allowedModalities: next });
                          }}
                          className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold transition-all border-2",
                            isSelected 
                              ? "bg-black text-white border-black" 
                              : "bg-white text-gray-400 border-gray-100 hover:border-gray-200"
                          )}
                        >
                          {mod}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Status</label>
                  <select 
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none appearance-none font-bold italic" 
                    value={planForm.status} 
                    onChange={e => setPlanForm({...planForm, status: e.target.value})}
                  >
                    <option value="Active">Ativo</option>
                    <option value="Inactive">Inativo</option>
                  </select>
                </div>

                <button 
                  type="submit" 
                  className="w-full py-5 bg-black text-white font-black rounded-2xl hover:bg-gray-800 transition-all uppercase italic shadow-xl active:scale-95"
                >
                  Salvar Plano
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
