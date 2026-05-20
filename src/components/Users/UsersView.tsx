import React, { useState } from 'react';
import { Shield, Mail, User as UserIcon, CheckCircle2, XCircle, Edit2, Trash2, Search, Settings as SettingsIcon, Plus, X, Lock, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUsers } from '../../application/hooks/useUsers';
import { useRoles } from '../../application/hooks/useRoles';
import { useStudents } from '../../application/hooks/useStudents';
import { cn } from '../../utils/formatters';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

const AVAILABLE_PERMISSIONS = [
  { id: 'dashboard', label: 'Dashboard', description: 'Acesso ao painel principal e estatísticas' },
  { id: 'students', label: 'Alunos', description: 'Gestão de alunos, matrículas e graduações' },
  { id: 'instructors', label: 'Professores', description: 'Gestão de professores e instrutores' },
  { id: 'classes', label: 'Aulas', description: 'Criação e gestão de horários de aulas' },
  { id: 'mensalidades', label: 'Mensalidades', description: 'Controle de pagamentos de alunos' },
  { id: 'finance', label: 'Financeiro', description: 'Gestão de despesas e fluxo de caixa completo' },
  { id: 'inventory', label: 'Estoque', icon: 'ShoppingCart', description: 'Controle de produtos e vendas' },
  { id: 'users', label: 'Usuários', description: 'Gestão de acessos e cargos do sistema' },
  { id: 'settings', label: 'Configurações', description: 'Configurações gerais da academia' },
  { id: 'checkin', label: 'Check-in', description: 'Acesso ao módulo de check-in' },
  { id: 'reports', label: 'Relatórios', description: 'Visualização de relatórios detalhados' }
];

const DEFAULT_ROLES = [
  { id: 'admin', name: 'Administrador', isStandard: true, defaultPermissions: { dashboard: true, students: true, finance: true, inventory: true, classes: true, settings: true, users: true, checkin: true, reports: true } },
  { id: 'tenant_admin', name: 'Admin do Sistema', isStandard: true, defaultPermissions: { dashboard: true, students: true, finance: true, inventory: true, classes: true, settings: true, users: true, checkin: true, reports: true } },
  { id: 'receptionist', name: 'Recepção', isStandard: true, defaultPermissions: { dashboard: true, students: true, finance: true, inventory: true, classes: true, settings: false, users: false, checkin: true, reports: true } },
  { id: 'professor', name: 'Professor', isStandard: true, defaultPermissions: { dashboard: true, students: true, finance: false, inventory: false, classes: true, settings: false, users: false, checkin: true, reports: false } },
  { id: 'user', name: 'Aluno', isStandard: true, defaultPermissions: { dashboard: false, students: false, finance: false, inventory: false, classes: false, settings: false, users: false, checkin: false, reports: false } },
  { id: 'checkin_tablet', name: 'Tablet Check-in', isStandard: true, defaultPermissions: { dashboard: false, students: false, finance: false, inventory: false, classes: false, settings: false, users: false, checkin: true, reports: false } }
];

export const UsersView = () => {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'roles' | 'pre-register'>('users');
  const [searchTerm, setSearchTerm] = useState("");
  const { isAdmin } = useAuth();
  const { users, updateUser, deleteUser, addUser, updatePassword } = useUsers(true);
  const { roles, addRole, updateRole, deleteRole } = useRoles(isAdmin);
  const { students } = useStudents(true, true);

  const displayRoles = React.useMemo(() => {
    return [
      ...DEFAULT_ROLES.map(defRole => {
        const dbRole = roles.find((r: any) => r.id === defRole.id);
        if (dbRole) {
          return {
            ...dbRole,
            isStandard: true
          };
        }
        return {
          id: defRole.id,
          name: defRole.name,
          permissions: defRole.defaultPermissions,
          isStandard: true
        };
      }),
      ...roles.filter((r: any) => !DEFAULT_ROLES.some(def => def.id === r.id))
    ];
  }, [roles]);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  
  const [editingRole, setEditingRole] = useState<any>(null);
  const [roleFormData, setRoleFormData] = useState({
    name: '',
    permissions: AVAILABLE_PERMISSIONS.reduce((acc, curr) => ({ ...acc, [curr.id]: false }), {} as any)
  });
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    approved: true,
    studentId: '',
    googleOnly: false
  });

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await updateUser(userId, { role: newRole });
      toast.success("Cargo atualizado!");
    } catch (error: any) {
      console.error("Error updating role:", error);
      const detail = error.message?.includes('{') ? JSON.parse(error.message) : null;
      toast.error(`Erro ao atualizar cargo: ${detail?.error || error.message || 'Permissão negada'}`);
    }
  };

  const handleToggleApproval = async (userId: string, currentStatus: boolean) => {
    try {
      await updateUser(userId, { approved: !currentStatus });
      toast.success(!currentStatus ? "Usuário aprovado!" : "Acesso revogado!");
    } catch (error: any) {
      console.error("Error toggling approval:", error);
      const detail = error.message?.includes('{') ? JSON.parse(error.message) : null;
      toast.error(`Erro ao alterar status: ${detail?.error || error.message || 'Permissão negada'}`);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userId = userFormData.email.toLowerCase().trim();
      const payload = { ...userFormData, id: userId };
      
      if (userFormData.googleOnly) {
        delete (payload as any).password;
      }
      
      await addUser(payload as any);
      toast.success(userFormData.googleOnly ? "Usuário cadastrado para Google Login!" : "Usuário criado com sucesso!");
      setIsUserModalOpen(false);
      setUserFormData({
        name: '',
        email: '',
        password: '',
        role: 'user',
        approved: true,
        studentId: '',
        googleOnly: false
      });
    } catch (error: any) {
      console.error("Error creating user:", error);
      
      if (error.message?.includes('Identity Toolkit')) {
        const confirmGoogleOnly = confirm(
          "A API de criação de contas com senha está desativada no seu Firebase.\n\n" +
          "Deseja cadastrar este usuário apenas para 'Entrar com Google'? (Ele não terá senha manual, mas poderá entrar usando a conta Google dele)."
        );
        
        if (confirmGoogleOnly) {
          try {
            const userId = userFormData.email.toLowerCase().trim();
            // Remove password to trigger Firestore-only creation
            const { password, ...rest } = userFormData;
            await addUser({ ...rest, id: userId } as any);
            toast.success("Usuário cadastrado para acesso via Google!");
            setIsUserModalOpen(false);
            return;
          } catch (innerError: any) {
            toast.error("Erro no cadastro alternativo: " + innerError.message);
            return;
          }
        }
      }

      toast.error(error.message || "Erro ao criar usuário.", {
        duration: 10000 // Show link for longer
      });
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPassword || !newPassword) return;
    
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    try {
      await updatePassword(selectedUserForPassword.id, newPassword);
      toast.success("Senha atualizada com sucesso!");
      setIsPasswordModalOpen(false);
      setNewPassword("");
      setSelectedUserForPassword(null);
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar senha.");
      if (error.message?.includes('PERMISSION_DENIED') || error.message?.includes('Identity Toolkit')) {
        toast.error("A API de gerenciamento de senhas está desativada. Considere usar o Pré-cadastro Google.", { duration: 6000 });
      }
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRole) {
        await updateRole(editingRole.id, roleFormData);
        toast.success("Cargo atualizado!");
      } else {
        await addRole(roleFormData);
        toast.success("Cargo criado!");
      }
      setIsRoleModalOpen(false);
      setEditingRole(null);
      setRoleFormData({
        name: '',
        permissions: AVAILABLE_PERMISSIONS.reduce((acc, curr) => ({ ...acc, [curr.id]: false }), {} as any)
      });
    } catch (error) {
      toast.error("Erro ao salvar cargo.");
    }
  };

  const handleEditRole = (role: any) => {
    setEditingRole(role);
    setRoleFormData({
      name: role.name,
      permissions: {
        ...AVAILABLE_PERMISSIONS.reduce((acc, curr) => ({ ...acc, [curr.id]: false }), {} as any),
        ...(role.permissions || {})
      }
    });
    setIsRoleModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-black italic uppercase tracking-tighter">Acessos</h1>
          <p className="text-gray-500 font-medium">Gerencie usuários, cargos e permissões do sistema.</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveSubTab('users')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeSubTab === 'users' ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-gray-600"
            )}
          >
            Usuários
          </button>
          <button 
            onClick={() => setActiveSubTab('roles')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeSubTab === 'roles' ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-gray-600"
            )}
          >
            Cargos
          </button>
          <button 
            onClick={() => setActiveSubTab('pre-register')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeSubTab === 'pre-register' ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-gray-600"
            )}
          >
            Pré-cadastro
          </button>
        </div>
      </header>

      {activeSubTab === 'users' ? (
        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-[32px]">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute w-5 h-5 text-gray-400 left-4 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Buscar usuários..." 
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setIsUserModalOpen(true)}
              className="px-8 py-4 bg-black text-white rounded-2xl font-black uppercase italic tracking-widest hover:bg-gray-800 transition-all shadow-xl flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Novo Usuário
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-50">
                  <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Usuário</th>
                  <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Cargo</th>
                  <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                  <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.map(user => (
                  <tr key={`user-row-${user.id}`} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 font-bold overflow-hidden">
                          {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" alt="" /> : user.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{user.name}</p>
                          <p className="text-[10px] text-gray-400 font-medium">
                            {user.email}
                            {user.studentId && (
                              <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-bold">
                                Aluno: {students.find(s => s.id === user.studentId)?.name || 'Perfil Vinculado'}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <select 
                        className="bg-transparent border-none text-xs font-bold text-gray-600 focus:ring-0 cursor-pointer"
                        value={user.role || 'user'}
                        onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                      >
                        <optgroup label="Cargos Padrão">
                          <option value="admin">Administrador</option>
                          <option value="receptionist">Recepção</option>
                          <option value="professor">Professor</option>
                          <option value="user">Aluno</option>
                          <option value="checkin_tablet">Tablet Check-in</option>
                        </optgroup>
                        {roles.length > 0 && (
                          <optgroup label="Cargos Personalizados">
                            {roles.map(r => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </td>
                    <td className="py-4 px-4">
                      <button 
                        onClick={() => handleToggleApproval(user.id, user.approved)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                          user.approved ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        )}
                      >
                        {user.approved ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {user.approved ? 'Aprovado' : 'Pendente'}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setSelectedUserForPassword(user);
                            setIsPasswordModalOpen(true);
                          }}
                          className="p-2 text-gray-300 hover:text-black transition-colors"
                          title="Alterar Senha"
                        >
                          <Lock className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={async () => {
                            if (confirm("Excluir este usuário permanentemente?")) {
                              try {
                                await deleteUser(user.id);
                                toast.success("Usuário removido");
                              } catch (error: any) {
                                console.error("Error deleting user:", error);
                                const detail = error.message?.includes('{') ? JSON.parse(error.message) : null;
                                toast.error(`Erro ao excluir: ${detail?.error || error.message || 'Permissão negada'}`);
                              }
                            }
                          }}
                          className="p-2 text-gray-300 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeSubTab === 'roles' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <button 
              onClick={() => {
                setEditingRole(null);
                setRoleFormData({
                  name: '',
                  permissions: AVAILABLE_PERMISSIONS.reduce((acc, curr) => ({ ...acc, [curr.id]: false }), {} as any)
                });
                setIsRoleModalOpen(true);
              }}
              className="p-8 border-2 border-dashed border-gray-200 rounded-[32px] flex flex-col items-center justify-center gap-4 hover:border-black hover:bg-gray-50 transition-all group"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-black group-hover:text-white transition-all">
                <Plus className="w-6 h-6" />
              </div>
              <p className="text-sm font-black uppercase italic tracking-widest">Novo Cargo</p>
            </button>

            {displayRoles.map(role => (
              <div key={role.id} className="p-8 bg-white border border-gray-100 rounded-[32px] shadow-sm hover:shadow-xl transition-all relative group">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-black">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEditRole(role)}
                      className="p-2 text-gray-400 hover:text-black transition-colors"
                      title="Editar permissões"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {!role.isStandard && (
                      <button 
                        onClick={async () => {
                          if (confirm(`Excluir o cargo "${role.name}"?`)) {
                            await deleteRole(role.id);
                            toast.success("Cargo excluído");
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-rose-500 transition-colors"
                        title="Excluir cargo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-black text-black italic uppercase tracking-tighter">{role.name}</h3>
                  {role.isStandard && (
                    <span className="text-[9px] font-extrabold bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Padrão
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                  {Object.values(role.permissions || {}).filter(v => v === true).length} Permissões Ativas
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto p-12 bg-white border border-gray-100 shadow-sm rounded-[40px] animate-in slide-in-from-bottom-8 duration-700">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-blue-50 rounded-[24px] flex items-center justify-center text-blue-600 mx-auto mb-6">
              <Shield className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black text-black italic uppercase tracking-tighter">Pré-cadastro Google</h2>
            <p className="text-gray-500 font-medium max-w-md mx-auto mt-2">
              Cadastre usuários para acesso simplificado via conta Google. Ideal para contornar problemas de senha manual.
            </p>
          </div>

          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const userId = userFormData.email.toLowerCase().trim();
                const { password, ...rest } = userFormData;
                await addUser({ ...rest, id: userId, googleOnly: true } as any);
                toast.success("Usuário pré-cadastrado com sucesso!");
                setUserFormData({
                  name: '',
                  email: '',
                  password: '',
                  role: 'user',
                  approved: true,
                  studentId: '',
                  googleOnly: false
                });
              } catch (error: any) {
                toast.error(error.message || "Erro no pré-cadastro");
              }
            }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Nome Completo</label>
              <input 
                required
                type="text" 
                placeholder="Nome do colaborador ou aluno"
                className="w-full px-8 py-5 bg-gray-50 border-none rounded-3xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                value={userFormData.name}
                onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">E-mail Google</label>
              <input 
                required
                type="email" 
                placeholder="Ex: usuario@gmail.com"
                className="w-full px-8 py-5 bg-gray-50 border-none rounded-3xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                value={userFormData.email}
                onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Cargo</label>
                <select 
                  className="w-full px-8 py-5 bg-gray-50 border-none rounded-3xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold appearance-none cursor-pointer"
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                >
                  <option value="admin">Administrador</option>
                  <option value="receptionist">Recepção</option>
                  <option value="professor">Professor</option>
                  <option value="user">Aluno</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Vincular Aluno</label>
                <select 
                  className="w-full px-8 py-5 bg-gray-50 border-none rounded-3xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold appearance-none cursor-pointer"
                  value={userFormData.studentId}
                  onChange={(e) => setUserFormData({ ...userFormData, studentId: e.target.value })}
                >
                  <option value="">Opcional</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-6 bg-blue-50 rounded-[32px] border border-blue-100 flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-700">Fluxo Moderno</p>
                <p className="text-[10px] text-blue-600 leading-relaxed mt-1">
                  Ao salvar, o usuário já poderá logar usando o botão <strong>"Entrar com Google"</strong>. 
                  Não há necessidade de gerenciar senhas manuais.
                </p>
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full py-6 bg-black text-white font-black rounded-[32px] hover:bg-gray-800 transition-all uppercase italic tracking-widest shadow-xl flex items-center justify-center gap-3"
            >
              <Plus className="w-6 h-6" />
              Finalizar Pré-cadastro
            </button>
          </form>
        </div>
      )}

      <AnimatePresence>
        {isRoleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsRoleModalOpen(false)} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h2 className="text-2xl font-black text-black italic uppercase tracking-tighter">
                    {editingRole ? 'Editar Cargo' : 'Novo Cargo'}
                  </h2>
                  <p className="text-sm text-gray-500 font-medium">Defina o nome e as permissões de acesso.</p>
                </div>
                <button 
                  onClick={() => setIsRoleModalOpen(false)}
                  className="p-3 bg-white rounded-2xl shadow-sm text-gray-400 hover:text-black transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSaveRole} className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Nome do Cargo</label>
                  <input 
                    required
                    disabled={editingRole?.isStandard}
                    type="text" 
                    placeholder="Ex: Consultor Técnico"
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                    value={roleFormData.name}
                    onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Permissões de Módulo</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {AVAILABLE_PERMISSIONS.map(permission => (
                      <button
                        key={permission.id}
                        type="button"
                        onClick={() => setRoleFormData({
                          ...roleFormData,
                          permissions: {
                            ...roleFormData.permissions,
                            [permission.id]: !roleFormData.permissions[permission.id]
                          }
                        })}
                        className={cn(
                          "flex items-start gap-4 p-4 rounded-3xl border-2 transition-all text-left group",
                          roleFormData.permissions[permission.id] 
                            ? "bg-black border-black text-white shadow-lg" 
                            : "bg-white border-gray-50 text-gray-900 hover:border-gray-200"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                          roleFormData.permissions[permission.id] ? "bg-white/10" : "bg-gray-50 text-gray-400"
                        )}>
                          {roleFormData.permissions[permission.id] ? <Check className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-black uppercase italic tracking-tighter leading-tight">{permission.label}</p>
                          <p className={cn(
                            "text-[10px] font-bold mt-1 leading-snug",
                            roleFormData.permissions[permission.id] ? "text-gray-400" : "text-gray-400"
                          )}>
                            {permission.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full py-5 bg-black text-white font-black rounded-[24px] hover:bg-gray-800 transition-all uppercase italic tracking-widest shadow-xl flex items-center justify-center gap-3"
                >
                  <Check className="w-6 h-6" />
                  {editingRole ? 'Atualizar Cargo' : 'Criar Cargo'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isUserModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsUserModalOpen(false)} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h2 className="text-2xl font-black text-black italic uppercase tracking-tighter">Novo Usuário</h2>
                  <p className="text-sm text-gray-500 font-medium">Cadastre um novo colaborador ou aluno.</p>
                </div>
                <button 
                  onClick={() => setIsUserModalOpen(false)}
                  className="p-3 bg-white rounded-2xl shadow-sm text-gray-400 hover:text-black transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Nome Completo</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Nome do usuário"
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all font-bold"
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">E-mail</label>
                  <input 
                    required
                    type="email" 
                    placeholder="Email para acesso"
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all font-bold"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Cargo</label>
                  <select 
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all font-bold appearance-none cursor-pointer"
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                  >
                    <option value="admin">Administrador</option>
                    <option value="receptionist">Recepção</option>
                    <option value="professor">Professor</option>
                    <option value="user">Aluno</option>
                    <option value="checkin_tablet">Tablet Check-in</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Vincular a Aluno (Opcional)</label>
                  <select 
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all font-bold appearance-none cursor-pointer"
                    value={userFormData.studentId}
                    onChange={(e) => {
                      const sid = e.target.value;
                      const student = students.find(s => s.id === sid);
                      setUserFormData({ 
                        ...userFormData, 
                        studentId: sid,
                        // Auto-fill if empty
                        name: !userFormData.name && student ? student.name : userFormData.name,
                        email: !userFormData.email && student ? student.email : userFormData.email
                      });
                    }}
                  >
                    <option value="">Nenhum aluno selecionado</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400 ml-4">Isso vinculará este usuário ao perfil de um aluno existente.</p>
                </div>

                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <button
                    type="button"
                    onClick={() => setUserFormData({ ...userFormData, googleOnly: !userFormData.googleOnly })}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      userFormData.googleOnly ? "bg-blue-500" : "bg-gray-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      userFormData.googleOnly ? "left-7" : "left-1"
                    )} />
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-blue-700">Acesso apenas via Google</p>
                    <p className="text-[10px] text-blue-600">Não exige senha. Recomendado se a API do Firebase estiver desativada.</p>
                  </div>
                </div>

                {!userFormData.googleOnly && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between ml-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Senha</label>
                      <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">Requer Auth API</span>
                    </div>
                    <input 
                      required
                      type="password" 
                      placeholder="Defina uma senha"
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all font-bold"
                      value={userFormData.password}
                      onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    />
                  </div>
                )}

                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <p className="text-[10px] font-bold text-amber-700 leading-relaxed">
                    <Shield className="w-3 h-3 inline mr-1" />
                    <strong>Nota:</strong> O usuário já poderá acessar o sistema usando este e-mail e a senha definida acima.
                  </p>
                </div>

                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border-2 border-transparent">
                  <button
                    type="button"
                    onClick={() => setUserFormData({ ...userFormData, approved: !userFormData.approved })}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      userFormData.approved ? "bg-emerald-500" : "bg-gray-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      userFormData.approved ? "left-7" : "left-1"
                    )} />
                  </button>
                  <span className="text-xs font-bold text-gray-600">Acesso já aprovado</span>
                </div>

                <button 
                  type="submit" 
                  className="w-full py-5 bg-black text-white font-black rounded-[24px] hover:bg-gray-800 transition-all uppercase italic tracking-widest shadow-xl flex items-center justify-center gap-3"
                >
                  <Plus className="w-6 h-6" />
                  Criar Usuário
                </button>
              </form>
            </motion.div>
          </div>
        )}
        {isPasswordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsPasswordModalOpen(false)} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h2 className="text-2xl font-black text-black italic uppercase tracking-tighter whitespace-nowrap">Alterar Senha</h2>
                  <p className="text-sm text-gray-500 font-medium">Defina uma nova senha para o usuário.</p>
                </div>
                <button 
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="p-3 bg-white rounded-2xl shadow-sm text-gray-400 hover:text-black transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleUpdatePassword} className="p-8 space-y-6">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Usuário</p>
                  <p className="text-sm font-black text-black">{selectedUserForPassword?.name}</p>
                  <p className="text-[10px] text-gray-400 font-medium">{selectedUserForPassword?.email}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Nova Senha</label>
                  <input 
                    required
                    type="password" 
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all font-bold"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoFocus
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full py-5 bg-black text-white font-black rounded-[24px] hover:bg-gray-800 transition-all uppercase italic tracking-widest shadow-xl flex items-center justify-center gap-3"
                >
                  <Check className="w-6 h-6" />
                  Salvar Nova Senha
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
