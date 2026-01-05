
export interface Project {
  id: string;
  user_id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  user_id: string;
  project_id?: string | null;
  content: string;
  description?: string;
  due_date?: string | null;
  priority: 1 | 2 | 3 | 4; 
  is_completed: boolean;
  created_at?: string;
}

export interface Note {
  id: string;
  user_id: string;
  project_id?: string | null;
  title: string;
  content: string;
  created_at?: string;
  updated_at?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  related_task_id?: string;
}

export interface UserSettings {
  user_id: string;
  custom_prompt: string;
}
