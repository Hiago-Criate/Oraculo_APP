import React, { useState } from 'react';
import { Check, Calendar as CalendarIcon, Hash, Trash2, Edit2, AlertCircle, X, Folder } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '../types';

interface TaskRowProps {
  task: Task;
  projectName?: string;
  onToggle: (id: string, status: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

export const TaskRow: React.FC<TaskRowProps> = ({ task, projectName, onToggle, onDelete, onEdit }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const priorityColor = {
    1: 'border-primary text-primary', 
    2: 'border-yellow-500 text-yellow-500',
    3: 'border-blue-500 text-blue-500',
    4: 'border-zinc-600 text-zinc-600'
  }[task.priority] || 'border-zinc-600';

  const handleCheck = () => {
    if (isCompleting) return;
    setIsCompleting(true);
    setTimeout(() => {
      onToggle(task.id, !task.is_completed);
    }, 1200);
  };

  if (task.is_completed && !isCompleting) return null;

  // DATE HELPERS
  const getTodayISO = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayISO = getTodayISO();

  const formatDateString = (rawDate: string | null | undefined) => {
    if (!rawDate) return '';
    const isoDate = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;
    const parts = isoDate.split('-');
    if (parts.length === 3) {
       return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoDate;
  }

  const formattedDate = formatDateString(task.due_date);
  const isToday = task.due_date?.includes(todayISO);

  return (
    <AnimatePresence>
      {/* @ts-ignore */}
      <motion.div 
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ 
          opacity: 1, 
          y: 0,
          scale: isCompleting ? 1.02 : 1,
          backgroundColor: isCompleting ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0,0,0,0)' 
        }}
        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.3 } }}
        className={clsx(
          "group flex items-start gap-3 py-3 border-b border-surfaceBorder px-2 rounded-md transition-all duration-300",
          isCompleting ? "border-green-500/50" : "hover:bg-white/5"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button 
          onClick={handleCheck}
          className={clsx(
            "mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-500",
            isCompleting 
              ? "bg-green-500 border-green-500 scale-110 shadow-[0_0_15px_rgba(34,197,94,0.6)]" 
              : priorityColor,
            !isCompleting && "hover:bg-primary/20"
          )}
        >
          {isCompleting && <Check size={12} className="text-white animate-in zoom-in duration-300" />}
        </button>

        <div className="flex-1 flex flex-col gap-1 relative">
          {/* @ts-ignore */}
          <motion.span 
            animate={{ color: isCompleting ? '#22c55e' : '#e4e4e7' }}
            className={clsx(
              "text-sm transition-colors duration-500", 
              isCompleting && "line-through opacity-80"
            )}
          >
            {task.content}
          </motion.span>
          
          {isCompleting && (
             // @ts-ignore
             <motion.div 
               initial={{ opacity: 0, x: -10 }}
               animate={{ opacity: 1, x: 0 }}
               className="text-xs text-green-500 font-bold tracking-wide"
             >
               Concluído!
             </motion.div>
          )}

          {!isCompleting && (
            <div className="flex items-center gap-3 text-[11px] flex-wrap">
              {task.due_date && (
                <span className={clsx(
                  "flex items-center gap-1", 
                  isToday ? "text-green-400 font-medium" : "text-zinc-500"
                )}>
                  <CalendarIcon size={10} />
                  {formattedDate}
                </span>
              )}
              
              <span className={clsx(
                "flex items-center gap-1 rounded px-1.5 py-0.5",
                projectName ? "text-orange-400 bg-orange-400/10" : "text-zinc-500"
              )}>
                {projectName ? <Folder size={10} /> : <Hash size={10} />}
                {projectName || 'Inbox'}
              </span>

              {task.description && (
                <span className="text-zinc-600 truncate max-w-[200px] border-l border-zinc-700 pl-2">
                  {task.description}
                </span>
              )}
            </div>
          )}
        </div>

        {!isCompleting && (
          <div className={clsx("flex items-center gap-1 transition-opacity", isHovered || isDeleting ? "opacity-100" : "opacity-0")}>
            {isDeleting ? (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded animate-in slide-in-from-right-5 fade-in duration-200">
                 <span className="text-[10px] text-red-400 font-medium whitespace-nowrap">Excluir?</span>
                 <button onClick={() => onDelete(task.id)} className="text-red-500 hover:text-red-400"><Check size={14} /></button>
                 <button onClick={() => setIsDeleting(false)} className="text-zinc-400 hover:text-zinc-200"><X size={14} /></button>
              </div>
            ) : (
              <>
                <button onClick={() => onEdit(task)} className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => setIsDeleting(true)} className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors">
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};