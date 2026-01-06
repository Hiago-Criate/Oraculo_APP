
import { GoogleGenAI, Type, FunctionDeclaration, Part } from "@google/genai";
import { createTask, createNote, fetchTasks, fetchNotes, fetchProjects } from "./supabase";

const createTaskTool: FunctionDeclaration = {
  name: "createTask",
  description: "Create a new task in the user's todo list.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      content: { type: Type.STRING, description: "The main text of the task." },
      priority: { type: Type.NUMBER, description: "Priority level 1-4 (1 is highest)." },
      due_date: { type: Type.STRING, description: "ISO date string (YYYY-MM-DD) if mentioned." },
      project_id: { type: Type.STRING, description: "The UUID of the project to assign this task to, if found via queryProjects." }
    },
    required: ["content", "priority"]
  }
};

const createNoteTool: FunctionDeclaration = {
  name: "createNote",
  description: "Create a new note or idea in the second brain.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "The title of the note." },
      content: { type: Type.STRING, description: "The markdown content of the note." },
      project_id: { type: Type.STRING, description: "The UUID of the project to assign this note to, if found via queryProjects." }
    },
    required: ["title", "content"]
  }
};

const queryTasksTool: FunctionDeclaration = {
  name: "queryTasks",
  description: "Search or list existing tasks.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      search_term: { type: Type.STRING, description: "Optional keyword to filter tasks." }
    },
  }
};

const queryNotesTool: FunctionDeclaration = {
  name: "queryNotes",
  description: "Search or read the user's notes.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      search_term: { type: Type.STRING, description: "Optional keyword to find specific notes." }
    },
  }
};

const queryProjectsTool: FunctionDeclaration = {
  name: "queryProjects",
  description: "List existing projects (folders).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      search_term: { type: Type.STRING, description: "Optional keyword to filter projects by name." }
    },
  }
};

const tools = [createTaskTool, createNoteTool, queryTasksTool, queryNotesTool, queryProjectsTool];

export const sendMessageToGemini = async (
  history: { role: 'user' | 'model'; content: string }[],
  newMessage: string,
  customInstruction: string = "",
  providedApiKey?: string
) => {
  // CRITICAL: Prioritize the key provided by the user (stored in DB), fallback to process.env.API_KEY
  const apiKey = providedApiKey || process.env.API_KEY;
  
  if (!apiKey) {
    return "Erro: Nenhuma API Key do Gemini configurada. Por favor, acesse as configurações do Chat AI e insira sua chave.";
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-flash-preview";

  try {
    const sanitizedHistory = history
      .filter(h => h.content && h.content.trim() !== '')
      .map(h => ({
        role: h.role,
        parts: [{ text: h.content }]
      }));

    const chat = ai.chats.create({
      model,
      config: {
        systemInstruction: `You are Oráculo, a Second Brain AI assistant. 
        CORE RESPONSIBILITIES: Manage Tasks, Notes, and PROJECTS.
        BEHAVIOR: Always try to correlate items. Use Priority 1 for Urgent tasks.
        USER CUSTOM INSTRUCTIONS: ${customInstruction || "None"}`,
        tools: [{ functionDeclarations: tools }],
      },
      history: sanitizedHistory
    });

    const result = await chat.sendMessage({ message: newMessage });
    
    const calls = result.functionCalls;
    if (calls && calls.length > 0) {
      const responseParts: Part[] = [];
      
      for (const call of calls) {
        let apiResult;
        console.log("Executing:", call.name);
        
        try {
          if (call.name === 'createTask') {
            apiResult = await createTask(call.args as any);
          } else if (call.name === 'createNote') {
            apiResult = await createNote(call.args as any);
          } else if (call.name === 'queryProjects') {
             const all = await fetchProjects();
             const term = (call.args as any).search_term?.toLowerCase();
             apiResult = term ? all.filter(p => p.name.toLowerCase().includes(term)) : all;
          } else if (call.name === 'queryTasks') {
            const all = await fetchTasks();
            const term = (call.args as any).search_term?.toLowerCase();
            apiResult = term ? all.filter(t => t.content.toLowerCase().includes(term)) : all.slice(0, 50);
          } else if (call.name === 'queryNotes') {
            const all = await fetchNotes();
            const term = (call.args as any).search_term?.toLowerCase();
            apiResult = term ? all.filter(n => n.title.toLowerCase().includes(term)) : all.slice(0, 30);
          } else {
            apiResult = { error: "Tool not found" };
          }
        } catch (err) {
          apiResult = { error: "Execution failed" };
        }

        responseParts.push({
          functionResponse: {
            name: call.name,
            id: call.id,
            response: { result: apiResult }
          }
        });
      }

      const finalResult = await chat.sendMessage({ message: responseParts });
      return finalResult.text || "Ação concluída.";
    }

    return result.text || "";

  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error.message?.includes("API key not valid")) {
      return "Erro: Sua API Key do Gemini parece inválida. Verifique se a copiou corretamente nas configurações.";
    }
    return "Desculpe, ocorreu um erro ao processar sua solicitação.";
  }
};
