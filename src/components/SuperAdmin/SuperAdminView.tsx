import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Search, 
  UserPlus, 
  Edit2,
  X, 
  MoreVertical, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Database,
  Building2,
  Mail,
  Trash2,
  Lock,
  Unlock,
  ExternalLink,
  Copy,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, cn } from '../../utils/formatters';
import toast from 'react-hot-toast';
import { useLicenses } from '../../application/hooks/useLicenses';
import { authService } from '../../application/services/AuthService';

export const SuperAdminView = () => {
  const { sendResetEmail } = useAuth();
  const { 
    licenses, 
    saveLicense, 
    deleteLicense, 
    updateLicenseStatus, 
    updateFirebaseConfig 
  } = useLicenses();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    academyName: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    plan: 'enterprise',
    expiresAt: format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), 'yyyy-MM-dd')
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editingLicenseId, setEditingLicenseId] = useState<string | null>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteLicense(deleteConfirmId);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const filteredLicenses = licenses.filter(l => 
    l.academyName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.ownerEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading(isEditing ? "Atualizando academia..." : "Criando academia e conta de administrador...");
    try {
      const email = formData.ownerEmail.toLowerCase().trim();
      
      // If a password is provided (required for create, optional for edit)
      if (formData.ownerPassword) {
        try {
          await authService.createUserWithoutLogout(email, formData.ownerPassword);
        } catch (authErr: any) {
          if (authErr.code === 'auth/email-already-in-use') {
            toast.error("Nota: Este e-mail já possui uma conta no sistema. A senha definida aqui NÃO foi aplicada. Use a opção de recuperar senha ou 'Enviar Redefinição' na tabela.", { duration: 8000 });
          } else {
            console.error("Auth creation error:", authErr);
            if (!isEditing) {
              toast.error("Erro ao criar conta de acesso: " + authErr.message, { id: loadingToast });
              return;
            }
          }
        }
      }

      const slug = formData.academyName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      const licenseData: any = {
        academyName: formData.academyName,
        ownerName: formData.ownerName,
        ownerEmail: email,
        slug: slug,
        plan: formData.plan,
        status: isEditing ? (licenses.find(l => l.id === editingLicenseId)?.status || 'active') : 'active',
        expiresAt: new Date(formData.expiresAt)
      };

      if (!isEditing) {
        licenseData.createdAt = new Date(); // Hook will handle serverTimestamp if we want, or we pass Date
      }

      const licenseId = isEditing && editingLicenseId ? editingLicenseId : email;
      await saveLicense(licenseId, licenseData);

      toast.success(isEditing ? "Academia atualizada!" : "Academia cadastrada com sucesso!", { id: loadingToast });
      setIsModalOpen(false);
      setIsEditing(false);
      setEditingLicenseId(null);
      setFormData({
        academyName: '',
        ownerName: '',
        ownerEmail: '',
        ownerPassword: '',
        plan: 'enterprise',
        expiresAt: format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), 'yyyy-MM-dd')
      });
    } catch (err) {
      console.error("Save license error:", err);
      toast.error("Erro ao salvar academia.", { id: loadingToast });
    }
  };

  const handleEditClick = (license: any) => {
    setIsEditing(true);
    setEditingLicenseId(license.id);
    setFormData({
      academyName: license.academyName || '',
      ownerName: license.ownerName || '',
      ownerEmail: license.ownerEmail || '',
      ownerPassword: '', // Don't show existing password
      plan: license.plan || 'enterprise',
      expiresAt: license.expiresAt?.seconds 
        ? format(new Date(license.expiresAt.seconds * 1000), 'yyyy-MM-dd')
        : format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), 'yyyy-MM-dd')
    });
    setIsModalOpen(true);
  };

  const toggleLicenseStatus = async (license: any) => {
    try {
      const newStatus = license.status === 'active' ? 'blocked' : 'active';
      await updateLicenseStatus(license.id, newStatus);
      toast.success(`Licença ${newStatus === 'active' ? 'ativada' : 'bloqueada'}!`);
    } catch (err) {
      // toast.error handled in hook
    }
  };

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<any>(null);
  const [configFormData, setConfigFormData] = useState({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  });

  const handleOpenConfig = (license: any) => {
    setEditingLicense(license);
    const existingConfig = license.externalFirebaseConfig || {};
    setConfigFormData({
      apiKey: existingConfig.apiKey || '',
      authDomain: existingConfig.authDomain || '',
      projectId: existingConfig.projectId || '',
      storageBucket: existingConfig.storageBucket || '',
      messagingSenderId: existingConfig.messagingSenderId || '',
      appId: existingConfig.appId || ''
    });
    setIsConfigModalOpen(true);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLicense) return;

    try {
      await updateFirebaseConfig(editingLicense.id, configFormData);
      toast.success("Configuração de banco de dados atualizada!");
      setIsConfigModalOpen(false);
    } catch (err) {
      // toast.error handled in hook
    }
  };

  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  const securityRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`;

  const copyRules = () => {
    navigator.clipboard.writeText(securityRules);
    toast.success("Regras copiadas!");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-black rounded-lg">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Super Admin</span>
          </div>
          <h1 className="text-4xl font-black text-black italic uppercase tracking-tighter leading-none">Gestão de Licenças</h1>
          <p className="text-gray-500 font-medium">Controle de academias parceiras e assinaturas.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsSupportModalOpen(true)}
            className="flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all italic uppercase tracking-tighter text-xs gap-2"
          >
            <Database className="w-4 h-4" />
            Configurações Técnicas
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center px-6 py-3 bg-black text-white font-bold rounded-2xl hover:bg-gray-800 transition-all shadow-xl shadow-black/10 italic uppercase tracking-tighter text-xs gap-2"
          >
            <Plus className="w-5 h-5" />
            Nova Academia
          </button>
        </div>
      </header>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white border border-gray-100 rounded-[32px] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Ativas</span>
          </div>
          <p className="text-3xl font-black text-gray-900 italic tracking-tighter">
            {licenses.filter(l => l.status === 'active').length}
          </p>
          <p className="text-xs text-gray-400 font-bold uppercase mt-1">Academias Operando</p>
        </div>
        <div className="p-6 bg-white border border-gray-100 rounded-[32px] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-rose-50 rounded-xl">
              <Lock className="w-5 h-5 text-rose-600" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-600">Bloqueadas</span>
          </div>
          <p className="text-3xl font-black text-gray-900 italic tracking-tighter">
            {licenses.filter(l => l.status === 'blocked').length}
          </p>
          <p className="text-xs text-gray-400 font-bold uppercase mt-1">Acesso Suspenso</p>
        </div>
        <div className="p-6 bg-white border border-gray-100 rounded-[32px] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-50 rounded-xl">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Vencendo</span>
          </div>
          <p className="text-3xl font-black text-gray-900 italic tracking-tighter">
            {licenses.filter(l => l.expiresAt?.seconds && new Date(l.expiresAt.seconds * 1000) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length}
          </p>
          <p className="text-xs text-gray-400 font-bold uppercase mt-1">Próximos 30 dias</p>
        </div>
      </div>

      {/* Licenses Table */}
      <div className="bg-white border border-gray-100 rounded-[40px] shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-gray-900">Total de Academias</h3>
          <div className="relative w-full sm:w-80">
            <Search className="absolute w-4 h-4 text-gray-400 left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar por academia ou e-mail..." 
              className="w-full pl-12 pr-6 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-gray-200 outline-none transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Academia / Dono</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Alunos</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Link de Acesso</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Plano</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Expira em</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Banco</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLicenses.map(license => {
                const gymLink = `${window.location.origin}/?gym=${license.slug || license.id.split('@')[0]}`;
                const studentCount = license.stats?.studentCount || 0;
                
                return (
                  <tr key={license.id} className="group hover:bg-gray-50/50 transition-all text-sm">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 overflow-hidden">
                          {license.branding?.logoUrl ? (
                            <img src={license.branding.logoUrl} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <Building2 className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-black text-gray-900 leading-none mb-1 uppercase italic tracking-tighter">{license.academyName}</p>
                          <div className="flex items-center gap-1 text-gray-400">
                            <Mail className="w-3 h-3" />
                            <span className="text-[10px] font-bold">{license.ownerEmail}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="inline-flex flex-col">
                        <span className="text-lg font-black text-black leading-none">{studentCount}</span>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Ativos</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-gray-100 rounded text-[10px] font-mono text-gray-500 max-w-[150px] truncate">
                          {gymLink}
                        </code>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(gymLink);
                            toast.success("Link copiado!");
                          }}
                          className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-all"
                          title="Copiar Link"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <a 
                          href={gymLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1.5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Abrir Unidade"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-black uppercase rounded-lg tracking-widest">
                      {license.plan}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className={cn(
                      "font-bold",
                      license.expiresAt?.seconds && new Date(license.expiresAt.seconds * 1000) < new Date() ? "text-rose-500" : "text-gray-500"
                    )}>
                      {license.expiresAt?.seconds ? format(new Date(license.expiresAt.seconds * 1000), 'dd/MM/yyyy') : 'N/A'}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      license.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                      <div className={cn("w-1.5 h-1.5 rounded-full", license.status === 'active' ? "bg-emerald-500" : "bg-rose-500")} />
                      {license.status === 'active' ? 'Ativa' : 'Bloqueada'}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <button 
                      onClick={() => handleOpenConfig(license)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all shadow-sm border",
                        license.externalFirebaseConfig?.apiKey 
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                          : "bg-indigo-50 text-indigo-600 border-indigo-100"
                      )}
                    >
                      <Database className="w-3 h-3" />
                      {license.externalFirebaseConfig?.apiKey ? "Ajustar DB" : "Configurar DB"}
                    </button>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleEditClick(license)}
                        className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-xl transition-all"
                        title="Editar Academia"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => toggleLicenseStatus(license)}
                        className={cn(
                          "p-2 rounded-xl transition-all",
                          license.status === 'active' ? "text-rose-400 hover:bg-rose-50" : "text-emerald-400 hover:bg-emerald-50"
                        )}
                        title={license.status === 'active' ? 'Bloquear Acesso' : 'Ativar Acesso'}
                      >
                        {license.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>
                      <button 
                        onClick={async () => {
                          if (window.confirm(`Deseja enviar um e-mail de redefinição de senha para ${license.ownerEmail}?`)) {
                            try {
                              await sendResetEmail(license.ownerEmail);
                              toast.success("E-mail de redefinição enviado!");
                            } catch (e) {
                              toast.error("Erro ao enviar e-mail.");
                            }
                          }
                        }}
                        className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="Enviar Redefinição de Senha"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(license.id)}
                        className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          {filteredLicenses.length === 0 && (
            <div className="p-20 text-center">
              <p className="text-gray-400 font-bold uppercase tracking-widest">Nenhuma academia encontrada.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nova Academia */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div onClick={() => { setIsModalOpen(false); setIsEditing(false); }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden p-8 animate-in fade-in zoom-in duration-300 text-left">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-black italic uppercase tracking-tighter">
                {isEditing ? 'Editar Academia' : 'Cadastrar Academia'}
              </h2>
              <button onClick={() => { setIsModalOpen(false); setIsEditing(false); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateLicense} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Nome da Academia</label>
                <input 
                  required type="text"
                  className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all font-bold"
                  value={formData.academyName}
                  onChange={e => setFormData({ ...formData, academyName: e.target.value })}
                  placeholder="Ex: Dojo Central"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Nome do Responsável</label>
                  <input 
                    required type="text"
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all font-bold text-sm"
                    value={formData.ownerName}
                    onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">E-mail (Login)</label>
                  <input 
                    required type="email"
                    disabled={isEditing}
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all font-bold text-sm disabled:opacity-50"
                    value={formData.ownerEmail}
                    onChange={e => setFormData({ ...formData, ownerEmail: e.target.value })}
                    placeholder="email@escola.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">
                  {isEditing ? 'Nova Senha (deixe vazio para manter)' : 'Senha de Acesso'}
                </label>
                <input 
                  required={!isEditing}
                  type="text"
                  className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all font-mono text-sm"
                  value={formData.ownerPassword}
                  onChange={e => setFormData({ ...formData, ownerPassword: e.target.value })}
                  placeholder={isEditing ? "Alterar senha..." : "Senha inicial"}
                />
                {isEditing && (
                  <p className="text-[10px] text-gray-400 italic px-2">
                    Nota: O Super Admin não pode redefinir senhas de contas já criadas via Web SDK. Caso a conta já exista, este campo não terá efeito. Solicite ao usuário o uso de "Esqueci minha senha".
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Plano Inicial</label>
                  <select 
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all font-bold appearance-none"
                    value={formData.plan}
                    onChange={e => setFormData({ ...formData, plan: e.target.value })}
                  >
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Expiração</label>
                  <input 
                    type="date"
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all font-bold"
                    value={formData.expiresAt}
                    onChange={e => setFormData({ ...formData, expiresAt: e.target.value })}
                  />
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl flex items-center gap-4 text-emerald-600">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-[10px] font-bold uppercase leading-tight">
                  Após o cadastro, o dono da academia deverá vincular o Firebase dele ao logar pela primeira vez.
                </p>
              </div>

              <button type="submit" className="w-full py-5 bg-black text-white font-black text-lg rounded-2xl hover:bg-gray-800 transition-all shadow-xl uppercase italic tracking-tighter">
                Cadastrar e Liberar Acesso
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Modal Confirmação de Exclusão */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div onClick={() => setDeleteConfirmId(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl p-8 animate-in fade-in zoom-in duration-300 text-center">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight italic">Excluir Licença?</h2>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              Esta ação removerá o acesso da academia permanentemente. Esta ação não pode ser desfeita.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={confirmDelete}
                className="w-full py-4 bg-rose-500 text-white font-black rounded-2xl hover:bg-rose-600 transition-all uppercase tracking-tighter italic"
              >
                Sim, Excluir Agora
              </button>
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="w-full py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all uppercase tracking-tighter"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Configuração Firebase */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <div onClick={() => setIsConfigModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl p-10 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 rounded-2xl">
                  <Database className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-black italic uppercase tracking-tighter">Database Config</h2>
                  <p className="text-indigo-600 text-[10px] font-black uppercase tracking-widest">{editingLicense?.academyName}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsConfigModalOpen(false)}
                className="p-2 hover:bg-gray-50 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="grid grid-cols-2 gap-4">
              {Object.keys(configFormData).map((key) => (
                <div key={key} className={cn("space-y-1", key === 'apiKey' || key === 'authDomain' ? "col-span-2" : "")}>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{key}</label>
                  <input 
                    required
                    type="text"
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-mono text-xs"
                    value={(configFormData as any)[key]}
                    onChange={e => setConfigFormData({ ...configFormData, [key]: e.target.value })}
                  />
                </div>
              ))}

              <div className="col-span-2 pt-6">
                <button 
                  type="submit"
                  className="w-full py-4 bg-black text-white font-black rounded-2xl hover:bg-gray-800 transition-all shadow-xl uppercase italic tracking-tighter"
                >
                  Salvar Configuração Master
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Suporte Técnico / Configurações */}
      {isSupportModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div onClick={() => setIsSupportModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl p-10 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-black rounded-2xl">
                  <Database className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-black italic uppercase tracking-tighter">Central Técnica</h2>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Recursos para suporte ao cliente</p>
                </div>
              </div>
              <button onClick={() => setIsSupportModalOpen(false)} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-8">
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Regras do Firestore</h3>
                  <button 
                    onClick={copyRules}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase hover:bg-gray-800 transition-all active:scale-95"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copiar Regras
                  </button>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <pre className="text-[10px] font-mono text-gray-500 leading-relaxed overflow-x-auto">
                    {securityRules}
                  </pre>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-4">
                  <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  <p className="text-[10px] text-blue-700 font-medium leading-relaxed">
                    Instrua seu cliente a colar estas regras na aba <b>Rules</b> do Firestore Console dele. Isso garante que apenas usuários autenticados possam ler/escrever dados.
                  </p>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Domínios Autorizados</h3>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                  <code className="text-[11px] font-mono font-bold text-gray-600">
                    {window.location.hostname}
                  </code>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.hostname);
                      toast.success("Domínio copiado!");
                    }}
                    className="p-2 text-gray-400 hover:text-black hover:bg-white rounded-lg transition-all shadow-sm"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 font-medium">
                  Este domínio deve ser adicionado em <b>Authentication {'>'} Settings {'>'} Authorized Domains</b> no projeto Firebase da academia cliente.
                </p>
              </section>
            </div>

            <div className="mt-10 pt-6 border-t border-gray-50">
              <button 
                onClick={() => setIsSupportModalOpen(false)}
                className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl hover:bg-black transition-all uppercase tracking-tighter italic shadow-xl"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
