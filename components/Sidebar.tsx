
import React from 'react';
// @ts-ignore
import { NavLink } from 'react-router-dom';
import { Sparkles, Inbox, Calendar, CalendarRange, Brain, Plus, Layout, X } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { fetchTasks } from '../services/supabase';

interface SidebarProps {
  onItemClick?: () => void;
  onClose?: () => void;
}

const NavItem = ({ to, icon: Icon, label, badge, onClick }: { to: string, icon: any, label: string, badge?: number, onClick?: () => void }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }: { isActive: boolean }) =>
      clsx(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 group",
        isActive 
          ? "bg-[#FF4500]/10 text-[#FF4500]" 
          : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
      )
    }
  >
    <Icon size={18} className="group-hover:scale-110 transition-transform" />
    <span className="flex-1">{label}</span>
    {badge !== undefined && badge > 0 && (
      <span className="bg-[#FF4500] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
        {badge}
      </span>
    )}
  </NavLink>
);

export const Sidebar: React.FC<SidebarProps> = ({ onItemClick, onClose }) => {
  const { data: tasks } = useQuery({ queryKey: ['tasks'], queryFn: fetchTasks });
  
  const pendingCount = tasks?.filter(t => !t.is_completed).length || 0;

  // Strict Date Logic for Badge
  const todayCount = tasks?.filter(t => {
    if (t.is_completed || !t.due_date) return false;
    const taskDate = t.due_date.includes('T') ? t.due_date.split('T')[0] : t.due_date;
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    return taskDate === todayStr;
  }).length || 0;

  return (
    // @ts-ignore
    <motion.aside 
      initial={{ x: -20 }}
      animate={{ x: 0 }}
      className="w-full h-full flex flex-col bg-surface"
    >
      <div className="h-14 flex-none flex items-center px-4 border-b border-surfaceBorder gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center border border-zinc-700">
           <span className="text-xs font-bold text-white">OR</span>
        </div>
        <h1 className="text-white font-semibold tracking-tight flex items-center gap-1 flex-1">
          Oráculo<span className="text-primary text-xl leading-none">.</span>
        </h1>
        {/* Mobile Close Button */}
        {onClose && (
          <button onClick={onClose} className="md:hidden p-1 text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        )}
      </div>

      <div className="p-4 flex-none">
        <button className="w-full flex items-center justify-center gap-2 bg-transparent border border-primary/30 text-primary hover:bg-primary hover:text-white transition-colors rounded-md py-2 text-sm font-semibold">
          <Plus size={16} />
          Adicionar
          <span className="ml-auto text-[10px] opacity-60 border border-current px-1 rounded">Q</span>
        </button>
      </div>

      <nav className="flex-1 px-2 space-y-1 overflow-y-auto custom-scrollbar">
        <NavItem to="/" icon={Sparkles} label="Chat AI" onClick={onItemClick} />
        <div className="pt-4 pb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
          Produtividade
        </div>
        <NavItem to="/tasks" icon={Inbox} label="Entrada" badge={pendingCount} onClick={onItemClick} />
        <NavItem to="/today" icon={Calendar} label="Hoje" badge={todayCount} onClick={onItemClick} />
        <NavItem to="/upcoming" icon={CalendarRange} label="Em Breve" onClick={onItemClick} />
        
        <div className="pt-4 pb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
          Conhecimento
        </div>
        <NavItem to="/brain" icon={Brain} label="Segundo Cérebro" onClick={onItemClick} />
        <NavItem to="/projects" icon={Layout} label="Projetos" onClick={onItemClick} />
      </nav>

      <div className="p-4 border-t border-surfaceBorder flex-none mb-16 md:mb-0">
        <div className="flex items-center gap-3">
          <img 
            src="https://picsum.photos/32/32" 
            alt="User" 
            className="w-8 h-8 rounded-full border border-zinc-700"
          />
          <div className="flex flex-col">
            <span className="text-sm text-zinc-200 font-medium">Usuário Demo</span>
            <span className="text-xs text-zinc-500">Pro Plan</span>
          </div>
        </div>
      </div>
    </motion.aside>
  );
};
