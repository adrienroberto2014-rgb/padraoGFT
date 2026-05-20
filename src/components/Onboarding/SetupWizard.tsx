import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLicenses } from '../../application/hooks/useLicenses';
import { Database, ShieldCheck, Rocket, ChevronRight, AlertCircle, CheckCircle2, Palette, Terminal, Copy, ExternalLink, Info, Sparkles, Wand2, Send, Bot, HelpCircle, Eye, EyeOff, Activity } from 'lucide-react';
import { cn } from '../../utils/formatters';
import toast from 'react-hot-toast';
import { GoogleGenAI, Type } from "@google/genai";
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

export const SetupWizard = () => {
  const { user } = useAuth();
  const { saveLicense } = useLicenses();
  const [step, setStep] = useState(1);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [aiInput, setAiInput] = useState('');
  const [config, setConfig] = useState({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  });
  const [branding, setBranding] = useState({
    primaryColor: '#10b981',
    logoUrl: ''
  });
  const [loading, setLoading] = useState(false);

  const ai = new GoogleGenAI({ apiKey: (process.env as any).GEMINI_API_KEY });

  const testConfig = async () => {
    setTestingConnection(true);
    setConnectionStatus('idle');
    const testAppName = `test-app-${Date.now()}`;
    let testApp;
    try {
      testApp = initializeApp(config, testAppName);
      const db = getFirestore(testApp);
      // We don't try to read a doc because rules might not be set yet.
      // Just confirming initialization and basic structure.
      if (config.apiKey && config.projectId && config.appId) {
        setConnectionStatus('success');
        toast.success("Configuração validada com sucesso!");
      } else {
        throw new Error("Campos obrigatórios faltando.");
      }
    } catch (err: any) {
      console.error(err);
      setConnectionStatus('error');
      toast.error("Erro na validação: " + (err.message || "Verifique os campos."));
    } finally {
      if (testApp) await deleteApp(testApp);
      setTestingConnection(false);
    }
  };

  const handleAIAssist = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analise o texto abaixo e extraia as chaves de configuração do Firebase. 
          O usuário pode ter colado o objeto 'firebaseConfig' completo ou apenas partes.
          Retorne um JSON com: apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId.
          Se um campo não for encontrado, deixe em branco.
          IMPORTANTE: Não invente dados. Se o texto for inválido, retorne um erro amigável em JSON.
          
          Texto para analisar:
          ${aiInput}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              apiKey: { type: Type.STRING },
              authDomain: { type: Type.STRING },
              projectId: { type: Type.STRING },
              storageBucket: { type: Type.STRING },
              messagingSenderId: { type: Type.STRING },
              appId: { type: Type.STRING },
              error: { type: Type.STRING }
            }
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      if (result.error) {
        toast.error(result.error);
      } else {
        setConfig({
          apiKey: result.apiKey || '',
          authDomain: result.authDomain || '',
          projectId: result.projectId || '',
          storageBucket: result.storageBucket || '',
          messagingSenderId: result.messagingSenderId || '',
          appId: result.appId || ''
        });
        toast.success("Dados extraídos com sucesso!");
        setShowAIAssistant(false);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar. Tente colar apenas o bloco de código do Config.");
    } finally {
      setAiLoading(false);
    }
  };

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
    toast.success("Regras copiadas! Cole no console do Firebase.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final Validation
    if (!config.apiKey || !config.projectId || !config.appId) {
      toast.error("Configurações incompletas! Use o assistente ou preencha os campos obrigatórios.");
      return;
    }

    setLoading(true);
    try {
      if (!user?.email) throw new Error("Usuário não logado");
      const licenseId = user.email.toLowerCase().trim();

      await saveLicense(licenseId, {
        externalFirebaseConfig: config,
        branding,
        status: 'active'
      });
      setStep(4);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar configurações.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Sidebar */}
        <div className="md:w-64 bg-black p-8 text-white flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-8">
              <Rocket className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="space-y-6">
              <StepIndicator num={1} title="Boas-vindas" active={step === 1} done={step > 1} />
              <StepIndicator num={2} title="Branding" active={step === 2} done={step > 2} />
              <StepIndicator num={3} title="Configuração" active={step === 3} done={step > 3} />
              <StepIndicator num={4} title="Concluído" active={step === 4} done={step > 4} />
            </div>
          </div>
          <div className="text-[10px] uppercase font-black tracking-widest text-white/40">
            SaaS Setup v2.0
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-12">
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-3xl font-black text-black italic uppercase tracking-tighter mb-4">Bem-vindo ao Next Level</h2>
              <p className="text-gray-500 font-medium mb-8 leading-relaxed">
                Estamos felizes em ter você conosco! Para começar, precisamos conectar o sistema ao seu próprio banco de dados Firebase.
              </p>
              <div className="space-y-4 mb-10">
                <FeatureItem icon={<Database className="w-4 h-4" />} text="Seus dados, seu controle" desc="Toda a informação da sua academia fica no seu projeto." />
                <FeatureItem icon={<ShieldCheck className="w-4 h-4" />} text="Segurança Total" desc="Você mantém as chaves de acesso do seu banco." />
              </div>
              <button 
                onClick={() => setStep(2)}
                className="w-full py-4 bg-black text-white font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-800 transition-all uppercase italic tracking-tighter shadow-xl shadow-black/10"
              >
                Começar Configuração
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-3xl font-black text-black italic uppercase tracking-tighter mb-4">Sua Marca</h2>
              <p className="text-gray-500 font-medium mb-8 leading-relaxed">
                Personalize o sistema com as cores e o logo da sua academia.
              </p>
              
              <div className="space-y-6 mb-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                    <Palette className="w-3 h-3" /> Cor Principal
                  </label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="color" 
                      className="w-12 h-12 rounded-xl border-none outline-none cursor-pointer"
                      value={branding.primaryColor}
                      onChange={e => setBranding({ ...branding, primaryColor: e.target.value })}
                    />
                    <span className="font-mono text-sm font-bold text-gray-400">{branding.primaryColor}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                    URL do Logo (Opcional)
                  </label>
                  <input 
                    type="url"
                    placeholder="https://sua-academia.com/logo.png"
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black/5 outline-none transition-all font-bold placeholder:text-gray-300"
                    value={branding.logoUrl}
                    onChange={e => setBranding({ ...branding, logoUrl: e.target.value })}
                  />
                  <p className="text-[10px] text-gray-400">Recomendado: PNG transparente, 512x512px.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setStep(1)}
                  className="flex-1 py-4 text-gray-400 font-bold hover:text-black transition-all uppercase tracking-tighter italic"
                >
                  Voltar
                </button>
                <button 
                  onClick={() => setStep(3)}
                  className="flex-1 py-4 bg-black text-white font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-800 transition-all uppercase italic tracking-tighter shadow-xl shadow-black/10"
                >
                  Próximo Passo
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 overflow-y-auto max-h-[60vh] pr-4 custom-scrollbar">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <h2 className="text-3xl font-black text-black italic uppercase tracking-tighter leading-none">Configurar Firebase</h2>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowHelp(!showHelp)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 rounded-2xl transition-all shadow-sm border font-black uppercase text-[10px] tracking-tighter",
                      showHelp ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-400 hover:text-black border-gray-100"
                    )}
                    title="Ajuda"
                  >
                    <HelpCircle className="w-4 h-4" />
                    Ajuda
                  </button>
                  <button 
                    onClick={() => setShowAIAssistant(!showAIAssistant)}
                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-2xl text-[11px] font-black uppercase shadow-lg shadow-indigo-200 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    {showAIAssistant ? "Manual" : "Desejo usar IA"}
                  </button>
                </div>
              </div>

              {showHelp && (
                <div className="mb-6 p-6 bg-blue-50/50 rounded-3xl border border-blue-100 space-y-4 animate-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg">
                      <HelpCircle className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="text-sm font-black text-blue-900 uppercase italic">Guia Rápido Firebase</h4>
                  </div>
                  <div className="space-y-3 text-[11px] text-blue-700 font-medium">
                    <p>1. No seu console, vá em <b>Configurações do Projeto</b> (Engrenagem).</p>
                    <p>2. Role até a seção <b>Seus Aplicativos</b>.</p>
                    <p>3. Clique no ícone <b>{"</>"} (Web)</b> se não tiver um app criado.</p>
                    <p>4. Procure pelo objeto <code className="bg-blue-100 px-1 rounded">firebaseConfig</code>.</p>
                    <p className="font-black">DICA: Use o Assistente IA para preencher tudo de uma vez!</p>
                  </div>
                  <button 
                    onClick={() => setShowHelp(false)}
                    className="w-full py-2 text-[10px] uppercase font-black text-blue-400 hover:text-blue-600 transition-all"
                  >
                    Fechar Guia
                  </button>
                </div>
              )}

              {showAIAssistant ? (
                <div className="mb-8 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 animate-in zoom-in duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-indigo-900 uppercase italic tracking-tight">Magia com Gemini</h4>
                      <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">Cole o bloco de código do Firebase aqui</p>
                    </div>
                  </div>
                  <textarea 
                    className="w-full h-32 p-4 bg-white border-2 border-indigo-100 rounded-2xl outline-none focus:border-indigo-400 transition-all font-mono text-[10px] leading-relaxed mb-4 resize-none"
                    placeholder={`Ex: const firebaseConfig = {
  apiKey: "AIzaSyB...",
  ...
};`}
                    value={aiInput}
                    onChange={e => setAiInput(e.target.value)}
                  />
                  <button 
                    onClick={handleAIAssist}
                    disabled={aiLoading}
                    className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase italic tracking-tighter"
                  >
                    {aiLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        Autocompletar Campos
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-gray-400 mt-4 text-center">
                    Corte e cole todo o bloco <code className="bg-gray-100 px-1 rounded">firebaseConfig</code> que você vê no console.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-8 p-4 bg-amber-50 rounded-2xl border border-amber-100 space-y-4">
                    <div className="flex items-start gap-3">
                      <Terminal className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-black text-amber-900 uppercase italic">Passos Obrigatórios:</h4>
                        <ol className="text-[11px] text-amber-700 font-medium list-decimal ml-4 mt-2 space-y-1">
                          <li>No Firebase Console, ative o <b>Google Auth</b>.</li>
                          <li>Adicione seu domínio (Netlify) em <b>Domínios Autorizados</b>.</li>
                          <li>Ative o <b>Cloud Firestore</b> (Modo Produção).</li>
                        </ol>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-amber-200/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-amber-900 uppercase">Regras de Segurança</span>
                        <button 
                          onClick={copyRules}
                          className="flex items-center gap-1.5 px-2 py-1 bg-amber-600 text-white rounded-lg text-[9px] font-black uppercase hover:bg-amber-700 transition-all"
                        >
                          <Copy className="w-3 h-3" /> Copiar Regras
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                {Object.keys(config).map((key) => (
                  <div key={key} className={cn("space-y-1", key === 'apiKey' || key === 'authDomain' ? "col-span-2" : "")}>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{key}</label>
                    <input 
                      required
                      type="text"
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 outline-none transition-all font-mono text-xs"
                      value={(config as any)[key]}
                      onChange={e => setConfig({ ...config, [key]: e.target.value })}
                    />
                  </div>
                ))}

                <div className="col-span-2 pt-2">
                  <button 
                    type="button"
                    onClick={testConfig}
                    disabled={testingConnection}
                    className={cn(
                      "w-full py-3 rounded-xl border-2 flex items-center justify-center gap-2 text-[10px] font-black uppercase transition-all",
                      connectionStatus === 'success' ? "border-emerald-500 text-emerald-500 bg-emerald-50" :
                      connectionStatus === 'error' ? "border-rose-500 text-rose-500 bg-rose-50" :
                      "border-gray-100 text-gray-400 hover:border-black hover:text-black"
                    )}
                  >
                    {testingConnection ? (
                      <Activity className="w-3 h-3 animate-pulse" />
                    ) : connectionStatus === 'success' ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : connectionStatus === 'error' ? (
                      <AlertCircle className="w-3 h-3" />
                    ) : (
                      <Activity className="w-3 h-3" />
                    )}
                    {testingConnection ? 'Testando...' : 
                     connectionStatus === 'success' ? 'Conexão OK' :
                     connectionStatus === 'error' ? 'Falha no Teste' :
                     'Testar Configuração'}
                  </button>
                </div>
                
                <div className="col-span-2 pt-6 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 py-4 text-gray-400 font-bold hover:text-black transition-all uppercase tracking-tighter italic"
                  >
                    Voltar
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-[2] py-4 bg-black text-white font-black rounded-2xl hover:bg-gray-800 transition-all shadow-xl uppercase italic tracking-tighter disabled:opacity-50"
                  >
                    {loading ? 'Salvando...' : 'Finalizar Setup'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === 4 && (
            <div className="text-center animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-3xl font-black text-black italic uppercase tracking-tighter mb-4">Tudo Pronto!</h2>
              <p className="text-gray-500 font-medium mb-10 leading-relaxed">
                Suas configurações foram salvas com sucesso. O sistema agora está conectado ao seu banco de dados.
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="w-full py-4 bg-emerald-500 text-white font-black rounded-2xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 uppercase tracking-tighter italic"
              >
                Acessar Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StepIndicator = ({ num, title, active, done }: any) => (
  <div className="flex items-center gap-4">
    <div className={cn(
      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all",
      active ? "bg-emerald-400 text-black scale-110 shadow-lg shadow-emerald-400/20" : 
      done ? "bg-emerald-400/20 text-emerald-400 border border-emerald-400/30" : 
      "bg-white/5 text-white/30 border border-white/10"
    )}>
      {num}
    </div>
    <span className={cn(
      "text-sm font-bold transition-all",
      active ? "text-white opacity-100" : "text-white/30"
    )}>{title}</span>
  </div>
);

const FeatureItem = ({ icon, text, desc }: any) => (
  <div className="flex gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 group hover:border-black/10 transition-all">
    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-black shadow-sm group-hover:bg-black group-hover:text-white transition-all">
      {icon}
    </div>
    <div>
      <h4 className="text-sm font-black text-black uppercase tracking-tight">{text}</h4>
      <p className="text-xs text-gray-400 font-medium">{desc}</p>
    </div>
  </div>
);
