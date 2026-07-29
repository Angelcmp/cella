import { create } from "zustand";

export interface ZenDocument {
  id: string;
  title: string;
  filename: string;
  status: string;
  pages: number;
  size: number;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  documents: string[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  pinned: boolean;
  projectId: string | null;
  documentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RightTab = "document" | "summary" | "mindmap" | "quiz";

export type ModelId =
  | "deepseek-v4-flash"
  | "glm-4.5-flash"
  | "glm-4.5-air"
  | "glm-4.7"
  | "glm-4.7-flash";

export const AVAILABLE_MODELS: { id: ModelId; name: string; provider: string; free: boolean }[] = [
  { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash", provider: "deepseek", free: true },
  { id: "glm-4.5-flash", name: "GLM-4.5 Flash", provider: "zhipu", free: true },
  { id: "glm-4.5-air", name: "GLM-4.5 Air", provider: "zhipu", free: false },
  { id: "glm-4.7", name: "GLM-4.7", provider: "zhipu", free: false },
  { id: "glm-4.7-flash", name: "GLM-4.7 Flash", provider: "zhipu", free: true },
];

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

interface ZenState {
  projects: Project[];
  documents: ZenDocument[];
  activeProjectId: string | null;
  activeDocumentId: string | null;
  activeConversationId: string | null;
  rightTab: RightTab;

  conversations: Conversation[];
  selectedModel: ModelId;

  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  removeProject: (id: string) => void;
  setDocuments: (docs: ZenDocument[]) => void;
  addDocument: (doc: ZenDocument) => void;
  removeDocument: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  setActiveDocument: (id: string | null) => void;
  setActiveConversation: (id: string | null) => void;
  setRightTab: (tab: RightTab) => void;

  setConversations: (convs: Conversation[]) => void;
  addConversation: (conv: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  removeConversation: (id: string) => void;
  togglePinConversation: (id: string) => void;
  setSelectedModel: (model: ModelId) => void;

  syncStorage: () => void;
}

export const useZenStore = create<ZenState>((set, get) => ({
  projects: [],
  documents: [],
  activeProjectId: null,
  activeDocumentId: null,
  activeConversationId: null,
  rightTab: "document",

  conversations: loadFromStorage<Conversation[]>("doczen:conversations", []),
  selectedModel: loadFromStorage<ModelId>("doczen:selectedModel", "deepseek-v4-flash"),

  setProjects: (projects) => set({ projects }),
  addProject: (project) =>
    set((state) => ({ projects: [...state.projects, project] })),
  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      activeProjectId:
        state.activeProjectId === id ? null : state.activeProjectId,
    })),
  setDocuments: (documents) => set({ documents }),
  addDocument: (doc) =>
    set((state) => ({ documents: [...state.documents, doc] })),
  removeDocument: (id) =>
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
      activeDocumentId:
        state.activeDocumentId === id ? null : state.activeDocumentId,
    })),
  setActiveProject: (id) => set({ activeProjectId: id }),
  setActiveDocument: (id) => set({ activeDocumentId: id }),
  setActiveConversation: (id) => set({ activeConversationId: id }),
  setRightTab: (tab) => set({ rightTab: tab }),

  setConversations: (convs) => {
    set({ conversations: convs });
    saveToStorage("doczen:conversations", convs);
  },
  addConversation: (conv) => {
    const convs = [...get().conversations, conv];
    set({ conversations: convs });
    saveToStorage("doczen:conversations", convs);
  },
  updateConversation: (id, updates) => {
    const convs = get().conversations.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    );
    set({ conversations: convs });
    saveToStorage("doczen:conversations", convs);
  },
  removeConversation: (id) => {
    const convs = get().conversations.filter((c) => c.id !== id);
    set({
      conversations: convs,
      activeConversationId:
        get().activeConversationId === id
          ? null
          : get().activeConversationId,
    });
    saveToStorage("doczen:conversations", convs);
  },
  togglePinConversation: (id) => {
    const conv = get().conversations.find((c) => c.id === id);
    if (!conv) return;
    const convs = get().conversations.map((c) =>
      c.id === id ? { ...c, pinned: !c.pinned } : c
    );
    set({ conversations: convs });
    saveToStorage("doczen:conversations", convs);
  },
  setSelectedModel: (model) => {
    set({ selectedModel: model });
    saveToStorage("doczen:selectedModel", model);
  },

  syncStorage: () => {
    const convs = get().conversations;
    const model = get().selectedModel;
    saveToStorage("doczen:conversations", convs);
    saveToStorage("doczen:selectedModel", model);
  },
}));
