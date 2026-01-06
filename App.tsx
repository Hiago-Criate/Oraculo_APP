
import React, { useState, useRef, useEffect } from 'react';
// @ts-ignore
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sidebar } from './components/Sidebar';
import { TaskRow } from './components/TaskRow';
import { GraphView } from './components/GraphView';
import { Send, MessageSquare, Plus, Loader2, FileText, Sparkles, Calendar, Sun, Armchair, ArrowRight, Flag, X, AlertCircle, Mail, Lock, LogOut, User, Eye, EyeOff, CheckCircle2, Trash2, Check, Save, Layout as LayoutIcon, Folder, ChevronRight, Hash, FolderPlus, SlidersHorizontal, CalendarRange, Menu, Settings, Key, Globe, ShieldCheck, ArrowUpDown } from 'lucide-react';
import { fetchTasks, updateTaskStatus, createTask, fetchNotes, createNote, signIn, signUp, supabase, signOut, updateTaskDetails, deleteTask, deleteNote, updateNote, fetchProjects, createProject, fetchUserSettings, saveUserSettings, deleteProject } from './services/supabase';
import { sendMessageToGemini } from './services/gemini';
import { ChatMessage, Note, Task, Project } from './types';
import { motion, AnimatePresence } from 'framer-motion';
// @ts-ignore
import { Session } from '@supabase/supabase-js';
import clsx from 'clsx';

// --- ROBUST DATE UTILS ---

const getLocalDateString = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeDate = (dateStr: string | null | undefined): string | null => {
  if (!dateStr) return null;
  if (dateStr.includes('T')) return dateStr.split('T')[0];
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
  return null; 
};

const getToday = () => getLocalDateString(new Date());
const getTomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return getLocalDateString(d);
};
const formatDateDisplay = (dateStr: string | null) => {
  const normalized = normalizeDate(dateStr);
  if (!normalized) return "Data";
  const today = getToday();
  const tomorrow = getTomorrow();
  if (normalized === today) return "Hoje";
  if (normalized === tomorrow) return "Amanhã";
  const [y, m, d] = normalized.split('-');
  return `${d}/${m}`;
};
const formatDateForSection = (dateStr: string) => {
  const normalized = normalizeDate(dateStr);
  if (!normalized) return dateStr;
  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
};

// --- AUTH PAGE ---
const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        if (password !== confirmPassword) throw new Error("As senhas não coincidem.");
        if (password.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");
        const data = await signUp(email, password);
        if (data.user && !data.session) {
          setSuccessMessage("Conta criada com sucesso! Verifique seu e-mail.");
          setIsLogin(true);
          setPassword('');
          setConfirmPassword('');
        }
      }
    } catch (err: any) { setError(err.message || "Erro na autenticação."); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-black flex items-center justify-center p-4 z-[9999]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-surface border border-surfaceBorder rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8"><div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-800 to-black border border-surfaceBorder mx-auto mb-4 flex items-center justify-center"><span className="text-primary font-bold text-xl">OR</span></div><h1 className="text-2xl font-bold text-white mb-2">Oráculo.</h1><p className="text-zinc-500 text-sm">Sua segunda mente, organizada por IA.</p></div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1"><label className="text-xs font-medium text-zinc-400 ml-1">Email</label><div className="relative group"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} /><input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-black border border-surfaceBorder rounded-lg py-2.5 pl-10 pr-4 text-white outline-none focus:border-primary transition-colors placeholder:text-zinc-700" placeholder="seu@email.com" /></div></div>
          <div className="space-y-1"><label className="text-xs font-medium text-zinc-400 ml-1">Senha</label><div className="relative group"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} /><input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-black border border-surfaceBorder rounded-lg py-2.5 pl-10 pr-10 text-white outline-none focus:border-primary transition-colors placeholder:text-zinc-700" placeholder="••••••••" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
          {!isLogin && (<div className="space-y-1 animate-in slide-in-from-top-2 fade-in"><label className="text-xs font-medium text-zinc-400 ml-1">Confirmar Senha</label><div className="relative group"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} /><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full bg-black border border-surfaceBorder rounded-lg py-2.5 pl-10 pr-4 text-white outline-none focus:border-primary transition-colors placeholder:text-zinc-700" placeholder="••••••••" /></div></div>)}
          {successMessage && (<div className="bg-green-500/10 border border-green-500/20 p-3 rounded-lg flex items-start gap-3 text-green-400 text-xs"><CheckCircle2 size={16} /><span>{successMessage}</span></div>)}
          {error && (<div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-start gap-3 text-red-400 text-xs"><AlertCircle size={16} /><span>{error}</span></div>)}
          <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2">{loading ? <Loader2 className="animate-spin" size={20} /> : (isLogin ? 'Entrar' : 'Criar Conta')}</button>
        </form>
        <div className="mt-6 text-center"><button onClick={() => { setIsLogin(!isLogin); setError(null); setSuccessMessage(null); }} className="text-zinc-500 hover:text-primary text-sm transition-colors">{isLogin ? "Não tem uma conta? Cadastre-se" : "Já tem uma conta? Entre"}</button></div>
      </motion.div>
    </div>
  );
};

// --- CHAT PAGE ---
const ChatPage = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: '1', role: 'model', content: 'Olá. Eu sou o Oráculo. Como posso ajudar a organizar sua mente hoje?', timestamp: Date.now() }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Settings States
  const [customPrompt, setCustomPrompt] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'prompt' | 'api'>('prompt');

  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { data: userSettings } = useQuery({ queryKey: ['userSettings'], queryFn: fetchUserSettings, staleTime: Infinity });

  useEffect(() => {
    if (userSettings) {
      setCustomPrompt(userSettings.custom_prompt || '');
      setGeminiApiKey(userSettings.gemini_api_key || '');
    }
  }, [userSettings]);

  const saveSettingsMutation = useMutation({ 
    mutationFn: () => saveUserSettings({ prompt: customPrompt, apiKey: geminiApiKey }), 
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['userSettings'] }); 
      setIsPromptModalOpen(false); 
    } 
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const responseText = await sendMessageToGemini(messages, userMsg.content, customPrompt, geminiApiKey);
      const botMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', content: responseText, timestamp: Date.now() };
      setMessages(prev => [...prev, botMsg]);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  return (
    <div className="flex-1 flex flex-col bg-black relative min-h-0">
      <div className="absolute top-4 right-6 z-20">
         <button onClick={() => setIsPromptModalOpen(true)} className="p-2 bg-zinc-900 border border-surfaceBorder rounded-full text-zinc-400 hover:text-primary transition-all shadow-lg hover:scale-110 active:scale-95"><SlidersHorizontal size={18} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24 custom-scrollbar">
        <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-zinc-800' : 'bg-primary/20 text-primary border border-primary/30'}`}>{msg.role === 'user' ? <div className="w-full h-full rounded-full bg-zinc-700" /> : <Sparkles size={16} />}</div>
                <div className={`rounded-2xl px-5 py-3 text-sm leading-relaxed max-w-[80%] ${msg.role === 'user' ? 'bg-zinc-800 text-white shadow-xl shadow-zinc-900/50' : 'bg-transparent border border-zinc-800 text-zinc-300'}`}>{msg.content}</div>
            </motion.div>
            ))}
            {loading && <div className="flex gap-4"><div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={16} /></div><div className="text-zinc-500 text-sm py-2 italic">Oráculo está sintonizando...</div></div>}
            <div ref={bottomRef} />
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black to-transparent">
        <form onSubmit={handleSend} className="max-w-3xl mx-auto relative bg-surface border border-surfaceBorder rounded-xl overflow-hidden shadow-2xl focus-within:border-primary/50 transition-colors">
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="Descreva uma tarefa, ideia ou pergunte algo..." className="w-full bg-transparent text-white p-4 pr-12 outline-none placeholder:text-zinc-700" />
          <button type="submit" disabled={loading} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-primary text-white rounded-lg hover:bg-orange-600 transition-all disabled:opacity-30 active:scale-95"><Send size={16} /></button>
        </form>
      </div>

      <AnimatePresence>
         {isPromptModalOpen && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-surface border border-surfaceBorder rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
                  <div className="flex items-center justify-between mb-6">
                     <h3 className="text-white text-lg font-bold flex items-center gap-2">
                        {settingsTab === 'prompt' ? <Sparkles size={20} className="text-primary" /> : <Key size={20} className="text-primary" />}
                        {settingsTab === 'prompt' ? 'Personalizar IA' : 'Configurações de Conexão'}
                     </h3>
                     <button onClick={() => setIsPromptModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors p-1 hover:bg-white/5 rounded"><X size={20} /></button>
                  </div>
                  
                  <div className="min-h-[220px]">
                    {settingsTab === 'prompt' ? (
                      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                        <label className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2 block">Instrução Mestra</label>
                        <p className="text-zinc-600 text-[11px] mb-3">Defina as regras de comportamento e informações que o Oráculo deve carregar.</p>
                        <textarea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} className="w-full h-40 bg-black border border-zinc-700 rounded-xl p-4 text-sm text-white outline-none focus:border-primary resize-none mb-4 custom-scrollbar" placeholder="Ex: Meu nome é Hiago. Seja sempre sarcástico e breve..." />
                      </motion.div>
                    ) : (
                      <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 mb-4">
                          <div className="flex items-start gap-4 mb-5">
                            <div className={clsx("p-2.5 rounded-lg shrink-0", geminiApiKey ? "bg-green-500/20 text-green-400" : "bg-orange-500/20 text-orange-400")}>
                              {geminiApiKey ? <ShieldCheck size={24} /> : <AlertCircle size={24} />}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white mb-1">Gerenciamento de API</h4>
                              <p className="text-[11px] text-zinc-500 leading-relaxed">Insira sua chave do Google Gemini abaixo. Ela é salva de forma criptografada em seu perfil para uso seguro em todas as suas sessões.</p>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest ml-1">Chave de API do Gemini</label>
                            <div className="relative group">
                              <input 
                                type={showApiKey ? "text" : "password"} 
                                value={geminiApiKey} 
                                onChange={(e) => setGeminiApiKey(e.target.value)} 
                                className="w-full bg-black border border-zinc-700 rounded-lg py-3 pl-4 pr-12 text-sm text-white outline-none focus:border-primary transition-colors placeholder:text-zinc-800" 
                                placeholder="AIzaSy..."
                              />
                              <button 
                                type="button" 
                                onClick={() => setShowApiKey(!showApiKey)} 
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
                              >
                                {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 flex gap-3 items-start">
                           <Globe size={16} className="text-blue-400 mt-0.5 shrink-0" />
                           <p className="text-[10px] text-zinc-400 leading-relaxed">Utilizamos esta chave estritamente para requisições à IA do Google em seu nome. Suporta chaves da camada gratuita (Free Tier).</p>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-800 pt-5 mt-4">
                     <button 
                        onClick={() => setSettingsTab(prev => prev === 'prompt' ? 'api' : 'prompt')}
                        className="flex items-center gap-2.5 p-2.5 text-zinc-500 hover:text-primary transition-all hover:bg-primary/5 rounded-xl text-xs font-bold"
                     >
                        {settingsTab === 'prompt' ? (
                          <>
                            <Settings size={18} className="animate-spin-slow" />
                            <span>Configurar API Key</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={18} />
                            <span>Voltar para Prompt</span>
                          </>
                        )}
                     </button>
                     
                     <button onClick={() => saveSettingsMutation.mutate()} disabled={saveSettingsMutation.isPending} className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-orange-600 transition-all disabled:opacity-50 shadow-xl shadow-primary/30 flex items-center gap-2 active:scale-95">
                      {saveSettingsMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Salvar Tudo</>}
                     </button>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </div>
  );
};

interface TasksPageProps {
  title: string;
  icon?: React.ElementType;
  filterFn?: (task: Task) => boolean;
  isUpcoming?: boolean;
}

// --- TASKS PAGE ---
const TasksPage: React.FC<TasksPageProps> = ({ title, icon: Icon, filterFn, isUpcoming }) => {
  const { data: tasks, isLoading } = useQuery({ queryKey: ['tasks'], queryFn: fetchTasks });
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: fetchProjects });
  const queryClient = useQueryClient();
  
  const toggleMutation = useMutation({ mutationFn: ({ id, status }: any) => updateTaskStatus(id, status), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }) });
  const deleteMutation = useMutation({ mutationFn: (id: string) => deleteTask(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }) });
  const createMutation = useMutation({ mutationFn: (newTask: any) => createTask(newTask), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); closeModal(); } });
  const updateMutation = useMutation({ mutationFn: (v: any) => updateTaskDetails(v.id, v.updates), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); closeModal(); } });

  const [isModalOpen, setModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<1 | 2 | 3 | 4>(4);
  const [dueDate, setDueDate] = useState<string | null>(getToday());
  const [projectId, setProjectId] = useState<string | null>(null);
  
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showCustomDate, setShowCustomDate] = useState(false);

  // Sorting States
  const [sortBy, setSortBy] = useState<'default' | 'priority' | 'project'>('default');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const openNewTaskModal = () => { setEditingTaskId(null); setContent(''); setDescription(''); setPriority(4); setDueDate(getToday()); setProjectId(null); setModalOpen(true); };
  const openEditModal = (task: Task) => { setEditingTaskId(task.id); setContent(task.content); setDescription(task.description || ''); setPriority(task.priority); setDueDate(normalizeDate(task.due_date)); setProjectId(task.project_id || null); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditingTaskId(null); setShowDateMenu(false); setShowPriorityMenu(false); setShowProjectMenu(false); setShowCustomDate(false); };
  
  const handleSubmit = () => { 
    if (!content.trim()) return; 
    if (editingTaskId) { 
      updateMutation.mutate({ id: editingTaskId, updates: { content, description, priority, due_date: dueDate, project_id: projectId } }); 
    } else { 
      createMutation.mutate({ content, description, priority, due_date: dueDate, project_id: projectId }); 
    } 
  };

  const getSortedTasks = (list: Task[]) => {
    const copy = [...list];
    if (sortBy === 'priority') {
      return copy.sort((a, b) => a.priority - b.priority);
    }
    if (sortBy === 'project') {
      return copy.sort((a, b) => {
        const pA = projects?.find(p => p.id === a.project_id)?.name || 'Inbox';
        const pB = projects?.find(p => p.id === b.project_id)?.name || 'Inbox';
        return pA.localeCompare(pB);
      });
    }
    return copy;
  };

  const filteredTasks = tasks?.filter(t => filterFn ? filterFn(t) : true) || [];
  const sortedFilteredTasks = getSortedTasks(filteredTasks);

  const groupedTasks: Record<string, Task[]> = {};
  if (isUpcoming) {
     const upcomingTasks = [...sortedFilteredTasks].sort((a, b) => (normalizeDate(a.due_date) || '9999').localeCompare(normalizeDate(b.due_date) || '9999'));
     upcomingTasks.forEach(t => { 
       const d = normalizeDate(t.due_date) || 'Sem Data'; 
       if (!groupedTasks[d]) groupedTasks[d] = []; 
       groupedTasks[d].push(t); 
     });
     // Re-sort within groups if sortBy is active
     if (sortBy !== 'default') {
        Object.keys(groupedTasks).forEach(k => {
          groupedTasks[k] = getSortedTasks(groupedTasks[k]);
        });
     }
  }

  const priorities = [
    { value: 1, label: 'Prioridade 1', color: 'text-[#FF4500]' },
    { value: 2, label: 'Prioridade 2', color: 'text-orange-400' },
    { value: 3, label: 'Prioridade 3', color: 'text-blue-500' },
    { value: 4, label: 'Prioridade 4', color: 'text-zinc-400' }
  ] as const;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      <div className="flex-none pt-10 px-6 pb-8 max-w-3xl mx-auto w-full flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
          {Icon && <Icon className="text-primary" />}
          {!Icon && <span className="text-primary">#</span>}
          {title}
        </h2>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <button 
              onClick={() => setShowSortMenu(!showSortMenu)} 
              className={clsx(
                "p-2 rounded-lg border transition-all hover:bg-zinc-900 active:scale-95",
                sortBy !== 'default' ? "border-primary text-primary bg-primary/5" : "border-zinc-800 text-zinc-500"
              )}
              title="Ordenar tarefas"
            >
              <ArrowUpDown size={18} />
            </button>
            <AnimatePresence>
              {showSortMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full mt-2 right-0 bg-surface border border-surfaceBorder rounded-xl shadow-2xl z-50 py-1 min-w-[160px]"
                >
                  <button onClick={() => { setSortBy('default'); setShowSortMenu(false); }} className={clsx("w-full text-left px-4 py-2 text-xs flex items-center gap-2", sortBy === 'default' ? "text-primary bg-primary/5" : "text-zinc-400 hover:bg-zinc-800")}>Padrão</button>
                  <button onClick={() => { setSortBy('priority'); setShowSortMenu(false); }} className={clsx("w-full text-left px-4 py-2 text-xs flex items-center gap-2", sortBy === 'priority' ? "text-primary bg-primary/5" : "text-zinc-400 hover:bg-zinc-800")}>Prioridade</button>
                  <button onClick={() => { setSortBy('project'); setShowSortMenu(false); }} className={clsx("w-full text-left px-4 py-2 text-xs flex items-center gap-2", sortBy === 'project' ? "text-primary bg-primary/5" : "text-zinc-400 hover:bg-zinc-800")}>Projeto</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button onClick={openNewTaskModal} className="bg-primary text-white px-3 py-1.5 rounded text-xs md:text-sm font-bold hover:bg-orange-600 flex items-center gap-1 shadow-lg shadow-primary/20 transition-all active:scale-95">
            <Plus size={14} /> Nova Tarefa
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-24 custom-scrollbar min-h-0">
        <div className="max-w-3xl mx-auto w-full space-y-1">
          {isLoading ? (
            <div className="text-zinc-500">Carregando...</div>
          ) : (sortedFilteredTasks.length === 0) ? (
            <div className="text-center py-20 text-zinc-600">
              <Sparkles size={24} className="opacity-50 mx-auto mb-4" />
              <p>Tudo limpo.</p>
            </div>
          ) : isUpcoming ? (
              Object.entries(groupedTasks).map(([date, gt]) => (
                <div key={date} className="mb-8">
                  <div className="sticky top-0 bg-black z-10 py-2 border-b border-surfaceBorder mb-2 text-sm font-bold text-white capitalize">
                    {date === 'Sem Data' ? 'Sem Data' : formatDateForSection(date)}
                  </div>
                  <div className="space-y-1">
                    {gt.map(t => <TaskRow key={t.id} task={t} projectName={projects?.find(p => p.id === t.project_id)?.name} onToggle={(id, s) => toggleMutation.mutate({ id, status: s })} onDelete={id => deleteMutation.mutate(id)} onEdit={openEditModal} />)}
                  </div>
                </div>
              ))
          ) : (
            sortedFilteredTasks.map(t => <TaskRow key={t.id} task={t} projectName={projects?.find(p => p.id === t.project_id)?.name} onToggle={(id, s) => toggleMutation.mutate({ id, status: s })} onDelete={id => deleteMutation.mutate(id)} onEdit={openEditModal} />)
          )}
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-surface border border-surfaceBorder rounded-xl w-full max-w-lg shadow-2xl relative overflow-visible">
              <div className="p-5">
                <input autoFocus className="w-full bg-transparent text-lg font-semibold text-white outline-none mb-3 placeholder:text-zinc-700" placeholder="Nome da tarefa" value={content} onChange={e => setContent(e.target.value)} />
                <textarea className="w-full bg-transparent text-sm text-zinc-400 outline-none mb-4 placeholder:text-zinc-800 resize-none h-16" placeholder="Adicionar descrição..." value={description} onChange={e => setDescription(e.target.value)} />
                
                <div className="flex flex-wrap gap-2 relative">
                  <div className="relative">
                    <button onClick={() => { setShowDateMenu(!showDateMenu); setShowPriorityMenu(false); setShowProjectMenu(false); }} className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all", dueDate === getToday() ? 'text-primary border-primary/30 bg-primary/10' : 'text-zinc-400 border-zinc-700 hover:bg-zinc-800')}>
                      <Calendar size={12} /> {formatDateDisplay(dueDate)}
                    </button>
                    {showDateMenu && (
                      <div className="absolute bottom-full mb-2 left-0 bg-surface border border-surfaceBorder rounded-xl shadow-2xl z-[110] py-2 min-w-[200px] animate-in slide-in-from-bottom-2 fade-in">
                        {!showCustomDate ? (
                          <>
                            <button onClick={() => { setDueDate(getToday()); setShowDateMenu(false); }} className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-900 w-full text-left text-sm text-zinc-200"><Calendar size={16} className="text-green-500" /> Hoje</button>
                            <button onClick={() => { setDueDate(getTomorrow()); setShowDateMenu(false); }} className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-900 w-full text-left text-sm text-zinc-200"><Sun size={16} className="text-orange-400" /> Amanhã</button>
                            <button onClick={() => setShowCustomDate(true)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-900 w-full text-left text-sm text-zinc-400 border-t border-zinc-800 mt-1 pt-3"><CalendarRange size={16} /> Escolher no calendário...</button>
                          </>
                        ) : (
                          <div className="p-3">
                            <div className="text-[10px] text-zinc-500 uppercase font-bold mb-2 flex items-center justify-between">Seletor de Data <button onClick={() => setShowCustomDate(false)} className="text-zinc-600 hover:text-white"><X size={12} /></button></div>
                            <div className="relative group">
                              <input 
                                type="date" 
                                value={dueDate || ''} 
                                onChange={(e) => { setDueDate(e.target.value); setShowDateMenu(false); setShowCustomDate(false); }} 
                                onClick={(e) => (e.target as any).showPicker?.()}
                                className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-sm text-white outline-none focus:border-primary transition-colors cursor-pointer" 
                              />
                              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none group-hover:text-primary" size={14} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button onClick={() => { setShowPriorityMenu(!showPriorityMenu); setShowDateMenu(false); setShowProjectMenu(false); }} className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all", priority === 4 ? 'text-zinc-400 border-zinc-700 hover:bg-zinc-800' : `${priorities.find(p => p.value === priority)?.color} border-current bg-current/10 font-bold`)}>
                      <Flag size={12} /> P{priority}
                    </button>
                    {showPriorityMenu && (
                      <div className="absolute bottom-full mb-2 left-0 bg-surface border border-surfaceBorder rounded-xl shadow-2xl z-[110] py-1 min-w-[160px] animate-in slide-in-from-bottom-2 fade-in">
                        {priorities.map(p => (
                          <button key={p.value} onClick={() => { setPriority(p.value as any); setShowPriorityMenu(false); }} className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-900 w-full text-left text-sm text-zinc-200">
                            <Flag size={16} className={p.color} /> {p.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button onClick={() => { setShowProjectMenu(!showProjectMenu); setShowDateMenu(false); setShowPriorityMenu(false); }} className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all", projectId ? 'text-primary border-primary/30 bg-primary/10' : 'text-zinc-400 border-zinc-700 hover:bg-zinc-800')}>
                      <Folder size={12} /> {projectId ? projects?.find(p => p.id === projectId)?.name : 'Projeto'}
                    </button>
                    {showProjectMenu && (
                      <div className="absolute bottom-full mb-2 left-0 bg-surface border border-surfaceBorder rounded-xl shadow-2xl z-[110] py-1 min-w-[200px] max-h-56 overflow-y-auto custom-scrollbar animate-in slide-in-from-bottom-2 fade-in">
                        <button onClick={() => { setProjectId(null); setShowProjectMenu(false); }} className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-900 w-full text-left text-sm text-zinc-500 italic">Nenhum projeto</button>
                        {projects?.map(p => (
                          <button key={p.id} onClick={() => { setProjectId(p.id); setShowProjectMenu(false); }} className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-900 w-full text-left text-sm text-zinc-200">
                            <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_5px_rgba(255,69,0,0.4)]" /> {p.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {(showDateMenu || showPriorityMenu || showProjectMenu) && (
                <div className="fixed inset-0 z-[105]" onClick={() => { setShowDateMenu(false); setShowPriorityMenu(false); setShowProjectMenu(false); setShowCustomDate(false); }} />
              )}

              <div className="flex items-center justify-end p-4 border-t border-surfaceBorder gap-3 bg-black/20 rounded-b-xl">
                <button onClick={closeModal} className="px-4 py-2 text-zinc-400 text-sm hover:text-white transition-colors font-medium">Cancelar</button>
                <button onClick={handleSubmit} disabled={!content.trim()} className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-xl shadow-primary/20 hover:bg-orange-600 active:scale-95 disabled:opacity-30 disabled:grayscale transition-all flex items-center gap-2"><Check size={18} /> Salvar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- BRAIN PAGE ---
const BrainPage = () => {
  const { data: notes } = useQuery({ queryKey: ['notes'], queryFn: fetchNotes });
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: fetchProjects });
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const createNoteMutation = useMutation({ mutationFn: createNote, onSuccess: (data) => { queryClient.invalidateQueries({ queryKey: ['notes'] }); setIsCreating(false); setSelectedNote(data); } });
  const updateNoteMutation = useMutation({ mutationFn: (v: any) => updateNote(v.id, v.updates), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }) });
  const handleSave = () => { if (isCreating) { createNoteMutation.mutate({ title, content, project_id: projectId }); } else if (selectedNote) { updateNoteMutation.mutate({ id: selectedNote.id, updates: { title, content, project_id: projectId } }); } };

  return (
    <div className="flex h-full bg-black overflow-hidden relative">
      <div className="w-full md:w-72 flex-shrink-0 border-r border-surfaceBorder flex flex-col min-h-0">
        <div className="p-4 border-b border-surfaceBorder flex justify-between items-center"><h2 className="font-semibold text-zinc-200">Notas</h2><button onClick={() => { setIsCreating(true); setSelectedNote(null); setTitle(''); setContent(''); }} className="p-1 text-zinc-400"><Plus size={18} /></button></div>
        <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">{notes?.map(n => (<div key={n.id} onClick={() => { setSelectedNote(n); setIsCreating(false); setTitle(n.title); setContent(n.content); setProjectId(n.project_id || null); }} className={clsx("p-3 rounded cursor-pointer transition-colors", selectedNote?.id === n.id ? "bg-surface border border-surfaceBorder" : "hover:bg-zinc-900")}><div className="text-sm font-medium text-zinc-200 truncate">{n.title}</div><div className="text-xs text-zinc-500 truncate">{n.content}</div></div>))}</div>
      </div>
      <div className={clsx("absolute inset-0 md:relative md:flex-1 bg-black z-20 transition-transform md:translate-x-0", (selectedNote || isCreating) ? "translate-x-0" : "translate-x-full md:translate-x-0")}>
        {(selectedNote || isCreating) ? (
          <div className="h-full flex flex-col p-6 md:p-12 relative">
            <button onClick={() => { setSelectedNote(null); setIsCreating(false); }} className="md:hidden absolute top-4 left-4 p-2 text-zinc-500"><ArrowRight className="rotate-180" size={20} /></button>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título" className="text-3xl font-bold bg-transparent outline-none text-white mb-6 mt-10 md:mt-0" />
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Escreva..." className="flex-1 bg-transparent resize-none outline-none text-zinc-300 text-lg leading-relaxed" />
            <button onClick={handleSave} className="absolute bottom-8 right-8 h-14 px-6 bg-primary text-white rounded-full font-bold shadow-xl flex items-center gap-2"><Save size={20} /> Salvar</button>
          </div>
        ) : (<div className="hidden md:flex flex-1 flex-col items-center justify-center text-zinc-600"><FileText size={48} className="opacity-20 mb-4" /><p>Selecione ou crie uma nota</p></div>)}
      </div>
    </div>
  );
};

// --- PROJECTS PAGE ---
const ProjectsPage = () => {
  const { data: projects, isLoading } = useQuery({ queryKey: ['projects'], queryFn: fetchProjects });
  const { data: tasks } = useQuery({ queryKey: ['tasks'], queryFn: fetchTasks });
  const { data: notes } = useQuery({ queryKey: ['notes'], queryFn: fetchNotes });
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const createMutation = useMutation({ mutationFn: createProject, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projects'] }); setIsModalOpen(false); setNewProjectName(''); } });
  const deleteProjectMutation = useMutation({ mutationFn: deleteProject, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projects'] }); setConfirmDeleteId(null); } });

  if (selectedProject) {
    const pt = tasks?.filter(t => t.project_id === selectedProject.id) || [];
    const pn = notes?.filter(n => n.project_id === selectedProject.id) || [];
    return (
      <div className="h-full flex flex-col bg-black overflow-hidden animate-in fade-in">
        <div className="p-6 border-b border-surfaceBorder flex items-center gap-4 bg-surface/50"><button onClick={() => setSelectedProject(null)} className="p-2 text-zinc-400"><ArrowRight className="rotate-180" size={20} /></button><h1 className="text-xl font-bold text-white flex items-center gap-2"><Folder className="text-primary" size={24} />{selectedProject.name}</h1></div>
        <div className="w-full h-[35vh] md:h-[45vh] p-4 md:p-6 pb-0 flex-shrink-0"><GraphView project={selectedProject} tasks={pt} notes={pn} /></div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 pb-24 custom-scrollbar">
           <div className="bg-surface border border-surfaceBorder rounded-xl p-4 h-fit"><h3 className="text-zinc-400 text-xs font-bold uppercase mb-4 flex items-center gap-2"><CheckCircle2 size={14} /> Tarefas</h3><div className="space-y-2">{pt.map(t => (<div key={t.id} className="p-3 rounded-lg bg-zinc-900/50 flex items-center gap-3 text-sm text-zinc-300"><div className={`w-2 h-2 rounded-full ${t.is_completed ? 'bg-green-500' : 'bg-orange-500'}`} /><span className="flex-1">{t.content}</span></div>))}</div></div>
           <div className="bg-surface border border-surfaceBorder rounded-xl p-4 h-fit"><h3 className="text-zinc-400 text-xs font-bold uppercase mb-4 flex items-center gap-2"><FileText size={14} /> Notas</h3><div className="space-y-2">{pn.map(n => (<div key={n.id} className="p-3 rounded-lg bg-zinc-900/50 text-sm text-zinc-300 font-medium text-white">{n.title}</div>))}</div></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-black overflow-hidden">
      <div className="h-20 p-6 md:p-8 pb-4 flex items-center justify-between"><h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3"><LayoutIcon className="text-primary" size={32} /> Projetos</h1><button onClick={() => setIsModalOpen(true)} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-all active:scale-95"><FolderPlus size={18} /> Novo</button></div>
      <div className="flex-1 overflow-y-auto p-6 pt-4 custom-scrollbar">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
          {projects?.map(p => (
            <motion.div key={p.id} onClick={() => setSelectedProject(p)} className="bg-surface border border-surfaceBorder p-6 rounded-2xl cursor-pointer group relative overflow-hidden h-40 flex flex-col justify-between hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between relative z-10"><div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all"><Folder size={20} /></div><div className="md:opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight size={16} className="text-zinc-400" /></div></div>
              <div className="relative z-10"><h3 className="text-lg font-bold text-white mb-2 truncate">{p.name}</h3></div>
              <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
                {confirmDeleteId === p.id ? (
                  <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 p-1 rounded animate-in fade-in">
                    <button onClick={(e) => { e.stopPropagation(); deleteProjectMutation.mutate(p.id); }} className="text-red-500 p-1 hover:bg-red-500/20 rounded"><Check size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }} className="text-zinc-400 p-1 hover:bg-zinc-800 rounded"><X size={14} /></button>
                  </div>
                ) : (<button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(p.id); }} className="p-2 text-zinc-500 hover:text-red-500 md:opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>)}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      <AnimatePresence>{isModalOpen && (<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"><motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-surface border border-surfaceBorder rounded-xl w-full max-w-md p-6"><h3 className="text-white text-xl font-bold mb-6">Novo Projeto</h3><input autoFocus value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Nome do projeto" className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white outline-none focus:border-primary mb-4" /><div className="flex gap-3"><button onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 bg-zinc-800 text-zinc-300 rounded-lg font-medium">Cancelar</button><button onClick={() => createMutation.mutate(newProjectName)} className="flex-1 px-4 py-3 bg-primary text-white font-bold rounded-lg hover:bg-orange-600 transition-all">Criar</button></div></motion.div></div>)}</AnimatePresence>
    </div>
  );
};

// --- APP LAYOUT ---
const AppLayout = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setSidebarOpen(false); }, [location]);

  const handleLogout = async () => { await (supabase.auth as any).signOut(); };

  return (
    <div className="fixed inset-0 flex bg-background text-textMuted overflow-hidden">
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-surface border-b border-surfaceBorder z-40 flex items-center px-4 gap-3">
        <button onClick={() => setSidebarOpen(true)} className="p-1 text-zinc-400 hover:text-white transition-colors"><Menu size={24} /></button>
        <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white">OR</div><span className="text-white font-semibold text-sm">Oráculo</span></div>
      </div>

      <div className={clsx("fixed md:relative inset-y-0 left-0 w-[260px] z-[100] md:z-50 border-r border-surfaceBorder bg-surface transition-transform duration-300 md:translate-x-0", isSidebarOpen ? "translate-x-0" : "-translate-x-full")}>
         <Sidebar onItemClick={() => setSidebarOpen(false)} onClose={() => setSidebarOpen(false)} />
         <div className="absolute bottom-4 left-4 w-[228px] z-50"><button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 rounded-lg text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors text-sm"><LogOut size={16} /> Sair da conta</button></div>
      </div>

      <AnimatePresence>{isSidebarOpen && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]" />)}</AnimatePresence>
      
      <main className="flex-1 flex flex-col bg-black min-w-0 h-full pt-14 md:pt-0">
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/tasks" element={<TasksPage title="Entrada" />} />
          <Route path="/today" element={<TasksPage title="Hoje" icon={Calendar} filterFn={(t) => normalizeDate(t.due_date) === getToday()} />} />
          <Route path="/upcoming" element={<TasksPage title="Em Breve" icon={CalendarRange} isUpcoming={true} filterFn={(t) => { const n = normalizeDate(t.due_date); return n !== null && n > getToday(); }} />} />
          <Route path="/brain" element={<BrainPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="*" element={<div className="p-10">Página não encontrada</div>} />
        </Routes>
      </main>
    </div>
  );
};

const App = () => {
  const [session, setSession] = useState<any | null>(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    (supabase.auth as any).getSession().then(({ data: { session } }: any) => { setSession(session); setChecking(false); });
    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange((_event: any, session: any) => { setSession(session); });
    return () => subscription.unsubscribe();
  }, []);

  if (checking) return <div className="h-screen w-full bg-black flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  if (!session) return <AuthPage />;
  return <Router><AppLayout /></Router>;
};

export default App;
