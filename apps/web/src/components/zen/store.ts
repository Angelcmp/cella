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
  isDefault?: boolean;
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

export type RightTab = "document" | "summary" | "mindmap" | "quiz" | "guide" | "faq" | "notes";

export type ModelId = string;

export interface ZenModel {
  id: string;
  name: string;
  provider: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  chatDocumentIds: string[];

  conversations: Conversation[];
  selectedModel: ModelId;
  models: ZenModel[];
  modelsModalOpen: boolean;

  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  ensureDefaultProject: () => Project;
  setDocuments: (docs: ZenDocument[]) => void;
  addDocument: (doc: ZenDocument) => void;
  setActiveProject: (id: string | null) => void;
  setActiveDocument: (id: string | null) => void;
  setActiveConversation: (id: string | null) => void;
  setRightTab: (tab: RightTab) => void;
  setChatDocumentIds: (ids: string[]) => void;

  addConversation: (conv: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  removeConversation: (id: string) => void;
  togglePinConversation: (id: string) => void;
  setSelectedModel: (model: ModelId) => void;
  setModels: (models: ZenModel[]) => void;
  refreshModels: () => Promise<void>;
  setModelsModalOpen: (open: boolean) => void;
}

export const useZenStore = create<ZenState>((set, get) => ({
  projects: [],
  documents: [],
  activeProjectId: null,
  activeDocumentId: null,
  activeConversationId: null,
  rightTab: "mindmap",
  chatDocumentIds: [],

  conversations: loadFromStorage<Conversation[]>("doczen:conversations", []),
  selectedModel: loadFromStorage<ModelId>("doczen:selectedModel", ""),
  models: [],
  modelsModalOpen: false,

  setProjects: (projects) => set({ projects }),
  addProject: (project) =>
    set((state) => ({ projects: [...state.projects, project] })),
  ensureDefaultProject: () => {
    const state = get();
    const defaultProject = state.projects.find((p) => p.isDefault);
    if (defaultProject) return defaultProject;
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: "Mis documentos",
      documents: [],
      createdAt: new Date().toISOString(),
      isDefault: true,
    };
    set((s) => ({ projects: [...s.projects, newProject] }));
    return newProject;
  },
  setDocuments: (documents) => set({ documents }),
  addDocument: (doc) =>
    set((state) => ({ documents: [...state.documents, doc] })),
  setActiveProject: (id) => set({ activeProjectId: id }),
  setActiveDocument: (id) => set({ activeDocumentId: id }),
  setActiveConversation: (id) => set({ activeConversationId: id }),
  setRightTab: (tab) => set({ rightTab: tab }),
  setChatDocumentIds: (ids) => set({ chatDocumentIds: ids }),

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
  setModels: (models) => {
    set({ models });
    const { selectedModel } = get();
    if (!selectedModel && models.length > 0) {
      set({ selectedModel: models[0].id });
      saveToStorage("doczen:selectedModel", models[0].id);
    }
  },
  refreshModels: async () => {
    try {
      const res = await fetch(`${API_URL}/models`);
      if (!res.ok) return;
      const models = (await res.json()) as ZenModel[];
      get().setModels(models);
    } catch {}
  },
  setModelsModalOpen: (open) => set({ modelsModalOpen: open }),
}));
