
import { createClient } from '@supabase/supabase-js';
import { Task, Note, Project, UserSettings } from '../types';

const SUPABASE_URL = "https://nonzmnnrfdauyfneajls.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vbnptbm5yZmRhdXlmbmVhamxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NDg5ODQsImV4cCI6MjA3MTEyNDk4NH0.Ljp27kvhELf-5TkFFCJVD0n0URlWTUCDfY81VX09qfI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- AUTHENTICATION ---

export const signUp = async (email: string, password: string) => {
  const { data, error } = await (supabase.auth as any).signUp({ email, password });
  if (error) throw error;
  return data;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await (supabase.auth as any).signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await (supabase.auth as any).signOut();
  if (error) throw error;
};

// --- DATA ACCESS ---

export const getUserId = async (): Promise<string> => {
  const { data: { session } } = await (supabase.auth as any).getSession();
  if (!session?.user) throw new Error("User not authenticated.");
  return session.user.id;
};

// --- USER SETTINGS ---

export const fetchUserSettings = async (): Promise<UserSettings> => {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('user_settings')
    .select('custom_prompt, gemini_api_key')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching settings:", JSON.stringify(error, null, 2));
    return { user_id: userId, custom_prompt: '', gemini_api_key: '' };
  }
  return data || { user_id: userId, custom_prompt: '', gemini_api_key: '' };
};

export const saveUserSettings = async (settings: { prompt: string, apiKey?: string }) => {
  const userId = await getUserId();
  const { error } = await supabase
    .from('user_settings')
    .upsert({ 
      user_id: userId, 
      custom_prompt: settings.prompt, 
      gemini_api_key: settings.apiKey,
      updated_at: new Date() 
    })
    .select();

  if (error) {
    console.error("Error saving settings:", JSON.stringify(error, null, 2));
    throw error;
  }
};

// Mantendo compatibilidade com código antigo caso necessário
export const saveCustomPrompt = async (prompt: string) => {
  await saveUserSettings({ prompt });
};

// --- PROJECTS ---

export const fetchProjects = async () => {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) {
    console.error("Error fetching projects:", JSON.stringify(error, null, 2));
    throw error;
  }
  return data as Project[];
};

export const createProject = async (name: string, color: string = '#FF4500') => {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('projects')
    .insert([{ name, color, user_id: userId }])
    .select()
    .single();

  if (error) {
    console.error("Error creating project:", JSON.stringify(error, null, 2));
    throw error;
  }
  return data as Project;
};

export const deleteProject = async (id: string) => {
  const userId = await getUserId();
  const { error } = await supabase.from('projects').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
};

// --- TASKS ---

export const fetchTasks = async () => {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error("Error fetching tasks:", JSON.stringify(error, null, 2));
    throw error;
  }
  return data as Task[];
};

export const createTask = async (task: Partial<Task>) => {
  const userId = await getUserId();
  
  let cleanDueDate = task.due_date;
  if (cleanDueDate && cleanDueDate.includes('T')) {
    cleanDueDate = cleanDueDate.split('T')[0];
  }

  const payload = {
    ...task,
    due_date: cleanDueDate || null,
    user_id: userId,
    is_completed: false,
    priority: task.priority || 4,
    project_id: task.project_id || null
  };

  const { data, error } = await supabase
    .from('tasks')
    .insert([payload])
    .select()
    .single();
    
  if (error) {
    console.error("Error creating task:", JSON.stringify(error, null, 2));
    throw error;
  }
  return data as Task;
};

export const updateTaskStatus = async (id: string, is_completed: boolean) => {
  const userId = await getUserId();
  const { error } = await supabase
    .from('tasks')
    .update({ is_completed })
    .eq('id', id)
    .eq('user_id', userId);
  
  if (error) {
    console.error("Error updating task:", JSON.stringify(error, null, 2));
    throw error;
  }
};

export const updateTaskDetails = async (id: string, updates: Partial<Task>) => {
  const userId = await getUserId();
  
  let cleanDueDate = updates.due_date;
  if (cleanDueDate && cleanDueDate.includes('T')) {
    cleanDueDate = cleanDueDate.split('T')[0];
  }

  const { content, description, priority, project_id } = updates;
  
  const { error } = await supabase
    .from('tasks')
    .update({ content, description, priority, due_date: cleanDueDate || null, project_id })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error("Error updating task details:", JSON.stringify(error, null, 2));
    throw error;
  }
};

export const deleteTask = async (id: string) => {
  const userId = await getUserId();
  const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', userId);
  if (error) {
    console.error("Error deleting task:", JSON.stringify(error, null, 2));
    throw error;
  }
};

// --- NOTES ---

export const fetchNotes = async () => {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('ideas')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching notes:", JSON.stringify(error, null, 2));
    throw error;
  }
  return data as Note[];
};

export const createNote = async (note: Partial<Note>) => {
  const userId = await getUserId();
  const payload = { ...note, user_id: userId };
  
  const { data, error } = await supabase
    .from('ideas')
    .insert([payload])
    .select()
    .single();
  
  if (error) {
    console.error("Error creating note:", JSON.stringify(error, null, 2));
    throw error;
  }
  return data as Note;
};

export const updateNote = async (id: string, updates: Partial<Note>) => {
  const userId = await getUserId();
  const { title, content, project_id } = updates;

  const { data, error } = await supabase
    .from('ideas')
    .update({ title, content, project_id })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating note:", JSON.stringify(error, null, 2));
    throw error;
  }
  return data as Note;
};

export const deleteNote = async (id: string) => {
  const userId = await getUserId();
  const { error } = await supabase.from('ideas').delete().eq('id', id).eq('user_id', userId);
  if (error) {
    console.error("Error deleting note:", JSON.stringify(error, null, 2));
    throw error;
  }
};
