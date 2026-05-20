import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Package, 
  ShoppingCart, 
  AlertTriangle, 
  TrendingUp,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Edit2,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useInventory } from '../../application/hooks/useInventory';
import { useStudents } from '../../application/hooks/useStudents';
import { formatCurrency, cn } from '../../utils/formatters';
import { StatCard } from '../ui/StatCard';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

export const InventoryView = () => {
  const { isAdmin, permissions, user } = useAuth();
  const { 
    products, 
    sales, 
    addProduct, 
    updateProduct, 
    deleteProduct,
    processSale 
  } = useInventory();
  
  const { students } = useStudents(true, isAdmin || permissions?.students, (isAdmin || permissions?.students) ? undefined : user?.email);

  const [activeSubTab, setActiveSubTab] = useState('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productFormData, setProductFormData] = useState({
    name: '',
    category: '',
    price: 0,
    stock: 0,
    minStock: 5
  });
  const [saleFormData, setSaleFormData] = useState({
    productId: '',
    studentId: '',
    amount: 0,
    installments: 1,
    method: 'Dinheiro',
    date: format(new Date(), 'yyyy-MM-dd'),
    firstPaymentDate: format(new Date(), 'yyyy-MM-dd')
  });

  const lowStockCount = products.filter(p => p.stock <= (p.minStock || 5)).length;
  const totalStockCount = products.reduce((acc, curr) => acc + (curr.stock || 0), 0);

  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await processSale({
        ...saleFormData,
        studentId: saleFormData.studentId || null
      });
      setIsSaleModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar venda.");
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, productFormData);
        toast.success("Produto atualizado!");
      } else {
        await addProduct(productFormData);
        toast.success("Produto cadastrado!");
      }
      setIsModalOpen(false);
    } catch (err) {
      toast.error("Erro ao salvar produto.");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm("Deseja realmente excluir este produto?")) {
      try {
        await deleteProduct(id);
        toast.success("Produto excluído!");
      } catch (err) {
        toast.error("Erro ao excluir produto.");
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-black italic uppercase tracking-tighter">Estoque</h1>
          <p className="text-gray-500 font-medium">Controle de produtos e vendas.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              setSaleFormData({
                productId: '',
                studentId: '',
                amount: 0,
                installments: 1,
                method: 'Dinheiro',
                date: format(new Date(), 'yyyy-MM-dd'),
                firstPaymentDate: format(new Date(), 'yyyy-MM-dd')
              });
              setIsSaleModalOpen(true);
            }}
            className="flex items-center justify-center px-6 py-2 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-all shadow-lg"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Nova Venda
          </button>
          <button 
            onClick={() => {
              setEditingProduct(null);
              setProductFormData({ name: '', category: '', price: 0, stock: 0, minStock: 5 });
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center px-6 py-2 text-sm font-bold text-white bg-black rounded-xl hover:bg-gray-800 transition-all shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Produto
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total em Estoque" value={totalStockCount} icon={Package} color="bg-blue-600 text-white" />
        <StatCard title="Alertas de Estoque" value={lowStockCount} icon={AlertTriangle} color="bg-amber-600 text-white" />
        <StatCard title="Vendas do Mês" value={sales.length} icon={ShoppingCart} color="bg-emerald-600 text-white" />
      </div>

      <div className="bg-white border border-gray-100 shadow-sm rounded-[32px] overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveSubTab('products')}
              className={cn(
                "px-6 py-2 rounded-xl font-bold text-sm transition-all",
                activeSubTab === 'products' ? "bg-black text-white" : "text-gray-400 hover:bg-gray-50"
              )}
            >
              Produtos
            </button>
            <button 
              onClick={() => setActiveSubTab('sales')}
              className={cn(
                "px-6 py-2 rounded-xl font-bold text-sm transition-all",
                activeSubTab === 'sales' ? "bg-black text-white" : "text-gray-400 hover:bg-gray-50"
              )}
            >
              Vendas
            </button>
          </div>
          <div className="relative">
            <Search className="absolute w-4 h-4 text-gray-400 left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar..." 
              className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-gray-200 outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                {activeSubTab === 'products' ? (
                  <>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Produto</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Categoria</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Preço</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Ações</th>
                  </>
                ) : (
                  <>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Produto</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Data</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Valor</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Parcelas</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cliente</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {activeSubTab === 'products' ? (
                products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                  <tr key={`product-${p.id}`} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-gray-900">{p.name}</p>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs text-gray-500 font-medium uppercase">{p.category}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-sm font-black text-gray-900">{formatCurrency(p.price)}</span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-sm font-black",
                          p.stock <= (p.minStock || 5) ? "text-rose-600" : "text-emerald-600"
                        )}>{p.stock}</span>
                        {p.stock <= (p.minStock || 5) && <AlertTriangle className="w-3 h-3 text-rose-500" />}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setEditingProduct(p);
                            setProductFormData({
                              name: p.name,
                              category: p.category,
                              price: p.price,
                              stock: p.stock,
                              minStock: p.minStock || 5
                            });
                            setIsModalOpen(true);
                          }}
                          className="p-2 bg-gray-50 text-gray-400 hover:text-black rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(p.id!)}
                          className="p-2 bg-gray-50 text-gray-400 hover:text-rose-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                sales.filter(s => s.productName?.toLowerCase().includes(searchTerm.toLowerCase()) || s.studentName?.toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
                  <tr key={`sale-${s.id}`} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-gray-900">{s.productName}</p>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs text-gray-500 font-medium uppercase">
                        {s.date ? format(s.date.toDate ? s.date.toDate() : new Date(s.date), 'dd/MM/yyyy HH:mm') : 'N/A'}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-sm font-black text-emerald-600">{formatCurrency(s.amount)}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs font-bold text-gray-500">{s.installments || 1}x</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-sm font-medium text-gray-900">{s.studentName || 'Venda Avulsa'}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <AnimatePresence>
        {isSaleModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSaleModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-8">
              <h2 className="text-2xl font-black text-black italic uppercase tracking-tighter mb-6">Nova Venda</h2>
              <form onSubmit={handleSaleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Produto</label>
                  <select 
                    required
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-bold appearance-none"
                    value={saleFormData.productId}
                    onChange={e => {
                      const p = products.find(prod => prod.id === e.target.value);
                      setSaleFormData({...saleFormData, productId: e.target.value, amount: p?.price || 0});
                    }}
                  >
                    <option value="">Selecionar Produto</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price)} ({p.stock} em estoque)</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Cliente (Opcional)</label>
                  <select 
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-bold appearance-none"
                    value={saleFormData.studentId}
                    onChange={e => setSaleFormData({...saleFormData, studentId: e.target.value})}
                  >
                    <option value="">Venda Avulsa</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Valor Total</label>
                    <input required type="number" step="0.01" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-bold" value={saleFormData.amount} onChange={e => setSaleFormData({...saleFormData, amount: parseFloat(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Parcelas (Academia)</label>
                    <input required type="number" min="1" max="12" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-bold" value={saleFormData.installments} onChange={e => setSaleFormData({...saleFormData, installments: parseInt(e.target.value)})} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Forma de Pagamento</label>
                  <select 
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-bold appearance-none"
                    value={saleFormData.method}
                    onChange={e => setSaleFormData({...saleFormData, method: e.target.value})}
                  >
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Pix">Pix</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Parcelado Academia">Parcelado Academia (Direto)</option>
                  </select>
                </div>

                {saleFormData.method === 'Parcelado Academia' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Data do Primeiro Pagamento</label>
                    <input 
                      type="date"
                      required
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-bold"
                      value={saleFormData.firstPaymentDate}
                      onChange={e => setSaleFormData({...saleFormData, firstPaymentDate: e.target.value})}
                    />
                  </div>
                )}

                <button type="submit" className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 transition-all uppercase italic">Finalizar Venda</button>
              </form>
            </motion.div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-8">
              <h2 className="text-2xl font-black text-black italic uppercase tracking-tighter mb-6">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
              <form onSubmit={handleProductSubmit} className="space-y-4">
                <input required placeholder="Nome do Produto" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none" value={productFormData.name} onChange={e => setProductFormData({...productFormData, name: e.target.value})} />
                <input required placeholder="Categoria" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none" value={productFormData.category} onChange={e => setProductFormData({...productFormData, category: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <input required type="number" step="0.01" placeholder="Preço" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none" value={productFormData.price} onChange={e => setProductFormData({...productFormData, price: parseFloat(e.target.value)})} />
                  <input required type="number" placeholder="Estoque" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none" value={productFormData.stock} onChange={e => setProductFormData({...productFormData, stock: parseInt(e.target.value)})} />
                </div>
                <button type="submit" className="w-full py-4 bg-black text-white font-black rounded-2xl hover:bg-gray-800 transition-all uppercase italic">Salvar</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
