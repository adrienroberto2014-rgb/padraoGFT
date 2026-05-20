import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Upload, 
  X, 
  AlertCircle, 
  Download, 
  Database,
  Shield,
  Palette,
  Layout as LayoutIcon,
  FileJson,
  Package,
  CreditCard,
  User as UserIcon,
  ShieldCheck,
  Link
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn, normalizeBeltName } from '../../utils/formatters';
import { Logo } from '../ui/Logo';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { useBelts } from '../../application/hooks/useBelts';
import { useSettings } from '../../application/hooks/useSettings';
import { useBackups } from '../../application/hooks/useBackups';

interface SettingsViewProps {
  allData?: {
    students: any[];
    payments: any[];
    sales: any[];
    expenses: any[];
    products: any[];
    checkIns: any[];
    evaluations: any[];
    plans: any[];
    instructors: any[];
  };
}

export const SettingsView = ({ allData }: SettingsViewProps) => {
  const [activeSubTab, setActiveSubTab] = useState('belts');
  const [isGeneratingBackupLocal, setIsGeneratingBackupLocal] = useState(false);
  
  const { belts, saveBelt, deleteBelt } = useBelts();
  const { settings, secrets, updateSettings, updateSecrets } = useSettings();
  const { backups, saveBackup } = useBackups();

  // Belts State
  const [isBeltModalOpen, setIsBeltModalOpen] = useState(false);
  const [beltForm, setBeltForm] = useState({ 
    name: '', 
    color: '#000000', 
    color2: '', 
    category: 'Adulto', 
    order: 0 
  });
  const [editingBelt, setEditingBelt] = useState<any>(null);

  const [logoPreview, setLogoPreview] = useState<string | null>(settings?.logoUrl || null);
  const [isSavingLogo, setIsSavingLogo] = useState(false);
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    stripePublicKey: settings?.stripePublicKey || '',
    stripeSecretKey: secrets?.stripeSecretKey || '',
    mercadoPagoPublicKey: settings?.mercadoPagoPublicKey || '',
    mercadoPagoAccessToken: secrets?.mercadoPagoAccessToken || '',
    paymentProvider: settings?.paymentProvider || 'None'
  });

  const [isSavingIntegrations, setIsSavingIntegrations] = useState(false);
  const [gympassForm, setGympassForm] = useState({
    clientId: secrets?.gympassClientId || '',
    clientSecret: secrets?.gympassClientSecret || ''
  });

  const { isAdmin, user, linkGoogle, unlinkGoogle } = useAuth();

  useEffect(() => {
    if (settings || secrets) {
      if (settings?.logoUrl) setLogoPreview(settings.logoUrl);
      setPaymentForm({
        stripePublicKey: settings?.stripePublicKey || '',
        stripeSecretKey: secrets?.stripeSecretKey || '',
        mercadoPagoPublicKey: settings?.mercadoPagoPublicKey || '',
        mercadoPagoAccessToken: secrets?.mercadoPagoAccessToken || '',
        paymentProvider: settings?.paymentProvider || 'None'
      });
      setGympassForm({
        clientId: secrets?.gympassClientId || '',
        clientSecret: secrets?.gympassClientSecret || ''
      });
    }
  }, [settings, secrets]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit to 1MB to avoid Firestore document size limits with base64
    if (file.size > 1024 * 1024) {
      toast.error("A imagem deve ter menos de 1MB");
      return;
    }

    setIsSavingLogo(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        await updateSettings({
          logoUrl: base64String,
        });
        setLogoPreview(base64String);
        toast.success("Logo atualizada com sucesso!");
      } catch (error) {
        console.error("Error saving logo:", error);
        toast.error("Erro ao salvar logo.");
      } finally {
        setIsSavingLogo(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBelt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveBelt(editingBelt?.id || null, beltForm);
      setIsBeltModalOpen(false);
    } catch (error) {
      // toast.error is handled in the hook
    }
  };

  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPayment(true);
    try {
      // Split public and private
      const publicData = {
        stripePublicKey: paymentForm.stripePublicKey,
        mercadoPagoPublicKey: paymentForm.mercadoPagoPublicKey,
        paymentProvider: paymentForm.paymentProvider as any,
      };
      
      const privateData = {
        stripeSecretKey: paymentForm.stripeSecretKey,
        mercadoPagoAccessToken: paymentForm.mercadoPagoAccessToken,
      };

      await Promise.all([
        updateSettings(publicData),
        updateSecrets(privateData)
      ]);

      toast.success("Configurações de pagamento atualizadas!");
    } catch (error) {
      console.error("Error saving payment settings:", error);
      toast.error("Erro ao salvar configurações de pagamento.");
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleSaveGympassSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingIntegrations(true);
    try {
      const privateData = {
        gympassClientId: gympassForm.clientId,
        gympassClientSecret: gympassForm.clientSecret,
      };

      await updateSecrets(privateData);
      toast.success("Configurações do Gympass atualizadas!");
    } catch (error) {
      console.error("Error saving Gympass settings:", error);
      toast.error("Erro ao salvar configurações do Gympass.");
    } finally {
      setIsSavingIntegrations(false);
    }
  };

  const handleCloudBackup = async (type: 'Manual' | 'Automatic' = 'Manual') => {
    if (!allData) return;
    setIsGeneratingBackupLocal(true);
    const loadingToast = type === 'Manual' ? toast.loading("Gerando backup na nuvem...") : null;

    try {
      const backupData = JSON.stringify(allData);
      const fileName = `OssManager_Backup_${new Date().toISOString().replace(/:/g, '-')}.json`;
      
      await saveBackup({
        fileName,
        size: new Blob([backupData]).size,
        type,
        collections: Object.keys(allData),
        data: backupData // Storing small stringified JSON for demo, usually one would use storage
      });

      if (loadingToast) toast.success("Backup salvo na nuvem!", { id: loadingToast });
    } catch (error) {
      console.error("Backup error:", error);
      if (loadingToast) toast.error("Erro ao salvar backup.", { id: loadingToast });
    } finally {
      setIsGeneratingBackupLocal(false);
    }
  };

  // Automatic backup check
  useEffect(() => {
    if (activeSubTab === 'data' && backups.length >= 0) {
      const lastAutomatic = backups.find(b => b.type === 'Automatic');
      const shouldBackup = !lastAutomatic || 
        (new Date().getTime() - (lastAutomatic.createdAt?.toDate?.() || new Date()).getTime() > 24 * 60 * 60 * 1000);
      
      if (shouldBackup && !isGeneratingBackupLocal) {
        handleCloudBackup('Automatic');
      }
    }
  }, [activeSubTab, backups]);

  const handleExportAllData = () => {
    if (!allData) return;
    try {
      const wb = XLSX.utils.book_new();
      
      // Add each collection as a sheet
      Object.entries(allData).forEach(([name, data]) => {
        if (Array.isArray(data) && data.length > 0) {
          const ws = XLSX.utils.json_to_sheet(data.map(item => {
            const newItem = { ...item };
            // Flatten timestamps
            Object.keys(newItem).forEach(key => {
              if (newItem[key]?.seconds) {
                newItem[key] = new Date(newItem[key].seconds * 1000).toLocaleString();
              }
            });
            return newItem;
          }));
          XLSX.utils.book_append_sheet(wb, ws, name.charAt(0).toUpperCase() + name.slice(1));
        }
      });

      XLSX.writeFile(wb, `OssManager_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("Exportação concluída!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Erro ao exportar dados.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-black italic uppercase tracking-tighter">Configurações</h1>
          <p className="text-gray-500 font-medium">Gerencie as definições do sistema.</p>
        </div>
      </header>

      <div className="flex gap-4 border-b border-gray-100 pb-4 overflow-x-auto">
        {[
          { id: 'belts', label: 'Faixas', icon: Shield },
          { id: 'logo', label: 'Identidade', icon: Palette },
          { id: 'payments', label: 'Pagamentos', icon: CreditCard },
          { id: 'integrations', label: 'Integrações', icon: Package },
          { id: 'data', label: 'Dados & Backup', icon: Database },
          { id: 'account', label: 'Minha Conta', icon: UserIcon }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap",
              activeSubTab === tab.id ? "bg-black text-white shadow-lg" : "text-gray-400 hover:bg-gray-50"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'belts' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Graduações</h2>
            <button 
              onClick={() => { setEditingBelt(null); setIsBeltModalOpen(true); }}
              className="px-4 py-2 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-all shadow-md text-sm"
            >
              Nova Faixa
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {belts.map((belt, index) => (
              <div key={`settings-belt-${belt.id}-${index}`} className="p-6 bg-white border border-gray-100 rounded-[32px] shadow-sm flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-2xl shadow-inner border border-gray-100 overflow-hidden relative" 
                    style={{ backgroundColor: belt.color }}
                  >
                    {belt.color2 && (
                      <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${belt.color} 50%, ${belt.color2} 50%)` }} />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{normalizeBeltName(belt.name)}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{belt.category || 'Adulto'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setEditingBelt(belt); setBeltForm(belt); setIsBeltModalOpen(true); }}
                  className="p-2 text-gray-400 hover:text-black transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'logo' && (
        <div className="max-w-2xl p-8 bg-white border border-gray-100 rounded-[32px] shadow-sm space-y-8">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Logo da Academia</h2>
            <p className="text-sm text-gray-500">Personalize a identidade visual do seu sistema.</p>
          </div>
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-100 rounded-[32px] bg-gray-50/50 relative">
            {isSavingLogo && (
              <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm flex items-center justify-center rounded-[32px]">
                <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <div className="relative group">
              <div className="max-h-48 rounded-2xl shadow-lg overflow-hidden bg-white p-4">
                <Logo customSrc={logoPreview} size="md" />
              </div>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                <label className="cursor-pointer p-4 bg-white rounded-full shadow-xl hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6 text-gray-900" />
                  <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={isSavingLogo} />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'payments' && (
        <div className="max-w-2xl space-y-6">
          <div className="p-8 bg-white border border-gray-100 rounded-[32px] shadow-sm space-y-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-2xl">
                <CreditCard className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Integração de Pagamentos</h2>
                <p className="text-sm text-gray-500">Configure as APIs para recebimento online.</p>
              </div>
            </div>

            <form onSubmit={handleSavePaymentSettings} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Provedor de Pagamento</label>
                <select 
                  className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none appearance-none font-bold"
                  value={paymentForm.paymentProvider}
                  onChange={e => setPaymentForm({...paymentForm, paymentProvider: e.target.value})}
                >
                  <option value="None">Desativado</option>
                  <option value="Stripe">Stripe (Global)</option>
                  <option value="MercadoPago">Mercado Pago (Brasil)</option>
                </select>
              </div>

              {paymentForm.paymentProvider === 'MercadoPago' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 pt-4 border-t border-gray-100"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Mercado Pago Public Key</label>
                    <input 
                      type="text"
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-mono text-xs"
                      placeholder="APP_USR-..."
                      value={paymentForm.mercadoPagoPublicKey}
                      onChange={e => setPaymentForm({...paymentForm, mercadoPagoPublicKey: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Mercado Pago Access Token</label>
                    <input 
                      type="password"
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-mono text-xs"
                      placeholder="APP_USR-..."
                      value={paymentForm.mercadoPagoAccessToken}
                      onChange={e => setPaymentForm({...paymentForm, mercadoPagoAccessToken: e.target.value})}
                    />
                  </div>
                </motion.div>
              )}

              {paymentForm.paymentProvider === 'Stripe' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 pt-4 border-t border-gray-100"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Stripe Publishable Key</label>
                    <input 
                      type="text"
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-mono text-xs"
                      placeholder="pk_test_..."
                      value={paymentForm.stripePublicKey}
                      onChange={e => setPaymentForm({...paymentForm, stripePublicKey: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Stripe Secret Key</label>
                    <input 
                      type="password"
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-mono text-xs"
                      placeholder="sk_test_..."
                      value={paymentForm.stripeSecretKey}
                      onChange={e => setPaymentForm({...paymentForm, stripeSecretKey: e.target.value})}
                    />
                  </div>
                  <div className="p-4 bg-amber-50 rounded-2xl flex gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                    <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                      Lembre-se: Chaves secretas nunca devem ser compartilhadas. Elas serão salvas de forma segura no seu banco de dados privado.
                    </p>
                  </div>
                </motion.div>
              )}

              <button 
                type="submit" 
                disabled={isSavingPayment}
                className="w-full py-4 bg-black text-white font-black rounded-2xl hover:bg-gray-800 transition-all uppercase italic shadow-lg active:scale-95 flex items-center justify-center gap-2"
              >
                {isSavingPayment ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Salvar Configurações"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeSubTab === 'integrations' && (
        <div className="max-w-2xl space-y-6">
          <div className="p-8 bg-white border border-gray-100 rounded-[32px] shadow-sm space-y-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-2xl">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Integração Wellhub (Gympass)</h2>
                <p className="text-sm text-gray-500">Conecte sua academia ao ecossistema global da Wellhub.</p>
              </div>
            </div>

            <form onSubmit={handleSaveGympassSettings} className="space-y-6">
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="text-xs text-blue-700 leading-relaxed">
                  Para obter suas chaves de API, acesse o <strong>Portal do Parceiro Wellhub</strong> e solicite acesso às <strong>Partner APIs</strong>.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Client ID (API Key)</label>
                  <input 
                    type="text"
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-mono text-xs"
                    placeholder="Seu Client ID fornecido pelo Gympass"
                    value={gympassForm.clientId}
                    onChange={e => setGympassForm({...gympassForm, clientId: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Client Secret</label>
                  <input 
                    type="password"
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-mono text-xs"
                    placeholder="Seu Client Secret (Segredo da API)"
                    value={gympassForm.clientSecret}
                    onChange={e => setGympassForm({...gympassForm, clientSecret: e.target.value})}
                  />
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl flex gap-3">
                <Shield className="w-5 h-5 text-emerald-500 shrink-0" />
                <p className="text-[10px] text-emerald-700 font-medium leading-relaxed">
                  Estes dados são sensíveis e ficarão armazenados em um bando de dados isolado e criptografado, acessível apenas por administradores do sistema.
                </p>
              </div>

              <button 
                type="submit" 
                disabled={isSavingIntegrations}
                className="w-full py-4 bg-black text-white font-black rounded-2xl hover:bg-gray-800 transition-all uppercase italic shadow-lg active:scale-95 flex items-center justify-center gap-2"
              >
                {isSavingIntegrations ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Ativar Integração"
                )}
              </button>
            </form>

            {/* Mercado Pago Section in Integrations */}
            <div className="pt-8 border-t border-gray-100 space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-2xl">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Mercado Pago</h2>
                  <p className="text-sm text-gray-500">Configuração rápida para pagamentos via PIX e Cartão.</p>
                </div>
              </div>

              <form onSubmit={handleSavePaymentSettings} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Public Key</label>
                    <input 
                      type="text"
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-mono text-xs"
                      placeholder="APP_USR-..."
                      value={paymentForm.mercadoPagoPublicKey}
                      onChange={e => setPaymentForm({...paymentForm, mercadoPagoPublicKey: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Access Token</label>
                    <input 
                      type="password"
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-mono text-xs"
                      placeholder="APP_USR-..."
                      value={paymentForm.mercadoPagoAccessToken}
                      onChange={e => setPaymentForm({...paymentForm, mercadoPagoAccessToken: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox"
                    id="enableMP"
                    checked={paymentForm.paymentProvider === 'MercadoPago'}
                    onChange={e => setPaymentForm({...paymentForm, paymentProvider: e.target.checked ? 'MercadoPago' : 'None'})}
                    className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                  />
                  <label htmlFor="enableMP" className="text-sm font-bold text-gray-700">Ativar Mercado Pago como provedor principal</label>
                </div>

                <button 
                  type="submit" 
                  disabled={isSavingPayment}
                  className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all uppercase italic shadow-lg active:scale-95 flex items-center justify-center gap-2"
                >
                  {isSavingPayment ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Salvar Mercado Pago"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'data' && (
        <div className="max-w-4xl space-y-6">
          <div className="p-8 bg-white border border-gray-100 rounded-[32px] shadow-sm space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-2xl">
                    <Database className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Gestão de Backups</h2>
                    <p className="text-sm text-gray-500">Backups automáticos e manuais em nuvem.</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleCloudBackup('Manual')}
                  disabled={isGeneratingBackupLocal}
                  className="px-6 py-3 bg-black text-white font-bold rounded-2xl hover:bg-gray-800 transition-all flex items-center gap-2 italic uppercase tracking-tighter text-xs"
                >
                  <div className={cn("w-2 h-2 rounded-full bg-emerald-400 animate-pulse", isGeneratingBackupLocal && "bg-gray-400")} />
                  {isGeneratingBackupLocal ? 'Gerando...' : 'Backup Instantâneo'}
                </button>
              </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={handleExportAllData}
                className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-[32px] border border-gray-100 hover:bg-gray-100 transition-all group"
              >
                <div className="p-4 bg-white rounded-2xl shadow-sm mb-4 group-hover:scale-110 transition-transform">
                  <Download className="w-6 h-6 text-emerald-600" />
                </div>
                <span className="font-bold text-gray-900">Exportar Excel</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase mt-1">Planilha Local</span>
              </button>

              <button 
                onClick={() => {
                  const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(JSON.stringify(allData, null, 2))}`;
                  const link = document.createElement("a");
                  link.href = jsonString;
                  link.download = `OssManager_Backup_${new Date().toISOString().split('T')[0]}.json`;
                  link.click();
                  toast.success("Backup JSON baixado!");
                }}
                className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-[32px] border border-gray-100 hover:bg-gray-100 transition-all group"
              >
                <div className="p-4 bg-white rounded-2xl shadow-sm mb-4 group-hover:scale-110 transition-transform">
                  <FileJson className="w-6 h-6 text-blue-600" />
                </div>
                <span className="font-bold text-gray-900">Exportar JSON</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase mt-1">Desenvolvedor</span>
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 ml-4">Histórico de Backups na Nuvem</h3>
              <div className="overflow-hidden border border-gray-50 rounded-[28px]">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Data</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Tipo</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Tamanho</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {backups.map(backup => (
                      <tr key={backup.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-xs font-black text-gray-900">
                            {backup.createdAt?.toDate ? format(backup.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : 'Pendente...'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest",
                            backup.type === 'Automatic' ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                          )}>
                            {backup.type === 'Automatic' ? 'Automático' : 'Manual'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-[10px] font-bold text-gray-400">{(backup.size / 1024).toFixed(1)} KB</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => {
                              if (!backup.data) return;
                              const blob = new Blob([backup.data], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = backup.fileName;
                              a.click();
                            }}
                            className="p-2 text-gray-400 hover:text-black transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {backups.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-xs italic">
                          Nenhum backup em nuvem encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeSubTab === 'account' && (
        <div className="max-w-2xl space-y-6">
          <div className="p-8 bg-white border border-gray-100 rounded-[32px] shadow-sm space-y-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-2xl">
                <UserIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Segurança da Conta</h2>
                <p className="text-sm text-gray-500">Gerencie seu acesso e vínculos externos.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-6 bg-gray-50 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">E-mail de Login</p>
                    <p className="font-bold text-gray-900">{user?.email}</p>
                  </div>
                  <div className="px-3 py-1 bg-gray-200 text-gray-600 text-[8px] font-black uppercase rounded-lg tracking-widest">
                    Padrão
                  </div>
                </div>
              </div>

              <div className="p-6 border border-gray-100 rounded-3xl space-y-6">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="p-3 bg-gray-100 rounded-2xl">
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Google Authentication</h3>
                      <p className="text-xs text-gray-500 max-w-xs">Permite que você acesse o sistema sem precisar digitar sua senha.</p>
                    </div>
                  </div>
                  
                  {user?.providerData.some(p => p.providerId === 'google.com') ? (
                    <div className="flex flex-col items-end gap-2">
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded-full tracking-widest">
                        <ShieldCheck className="w-3 h-3" />
                        Vinculado
                      </span>
                      <button 
                        onClick={async () => {
                          if (window.confirm("Deseja realmente desvincular sua conta Google?")) {
                            try {
                              await unlinkGoogle();
                              toast.success("Conta Google desvinculada!");
                            } catch (error) {
                              toast.error("Erro ao desvincular conta.");
                            }
                          }
                        }}
                        className="text-[10px] font-bold text-rose-500 hover:underline"
                      >
                        Desvincular
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={async () => {
                        try {
                          await linkGoogle();
                          toast.success("Conta Google vinculada com sucesso!");
                        } catch (error) {
                          toast.error("Erro ao vincular conta. Tente novamente.");
                        }
                      }}
                      className="flex items-center gap-2 px-6 py-3 bg-black text-white font-black text-xs rounded-2xl hover:bg-gray-800 transition-all uppercase italic tracking-tighter"
                    >
                      <Link className="w-4 h-4" />
                      Vincular Agora
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <AnimatePresence>
        {isBeltModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsBeltModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-8">
              <h2 className="text-2xl font-black text-black italic uppercase tracking-tighter mb-6">{editingBelt ? 'Editar Faixa' : 'Nova Faixa'}</h2>
              <form onSubmit={handleSaveBelt} className="space-y-4">
                <input required placeholder="Nome da Faixa" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none" value={beltForm.name} onChange={e => setBeltForm({...beltForm, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 ml-2">Cor Principal</label>
                    <input type="color" className="w-full h-12 bg-gray-50 rounded-xl outline-none p-1" value={beltForm.color} onChange={e => setBeltForm({...beltForm, color: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 ml-2">Cor Secundária (Opcional)</label>
                    <input type="color" className="w-full h-12 bg-gray-50 rounded-xl outline-none p-1" value={beltForm.color2} onChange={e => setBeltForm({...beltForm, color2: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 ml-2">Categorias</label>
                  <div className="flex gap-2">
                    {['Adulto', 'Infantil'].map(cat => {
                      const isSelected = beltForm.category === cat || beltForm.category === 'Ambas';
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setBeltForm(prev => {
                              const current = prev.category;
                              let next = current;

                              if (current === 'Ambas') {
                                // If already both, deselecting one leaves the other
                                next = cat === 'Adulto' ? 'Infantil' : 'Adulto';
                              } else if (current === cat) {
                                // If specifically this one is selected, we keep it as is 
                                // (must have at least one category selected)
                                next = cat;
                              } else {
                                // If the other one was selected, selecting this one makes it "Ambas"
                                next = 'Ambas';
                              }

                              return { ...prev, category: next };
                            });
                          }}
                          className={cn(
                            "flex-1 py-3 rounded-xl font-bold transition-all text-sm",
                            isSelected ? "bg-black text-white" : "bg-gray-50 text-gray-400"
                          )}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
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
