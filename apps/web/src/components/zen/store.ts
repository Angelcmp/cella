import { create } from "zustand";

export interface ZenDocument {
  id: string;
  title: string;
  filename: string;
  status: string;
  pages: number;
  size: number;
  createdAt: string;
  lastError?: string;
  attempts?: number;
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
  documentIds?: string[];
  backendId?: string;
  createdAt: string;
  updatedAt: string;
}

export type RightTab = "document" | "summary" | "mindmap" | "quiz" | "guide" | "faq" | "notes" | "diagram";

export type ModelId = string;

export interface ZenModel {
  id: string;
  name: string;
  provider: string;
}

export interface ProviderCapability {
  has_embeddings: boolean;
  supports_streaming: boolean;
  supports_vision: boolean;
  supports_tools: boolean;
}

export interface ProviderCatalogEntry {
  label: string;
  base_url: string;
  models: string[];
  needs_key: boolean;
  capabilities: ProviderCapability;
}

export interface ProviderConfig {
  id: string;
  name: string;
  provider_type: string;
  label: string;
  base_url: string | null;
  api_key?: string | null;
  models: string[];
  default_model: string | null;
  is_default: boolean;
  use_for_embeddings: boolean;
  has_api_key: boolean;
  last_test_at: string | null;
  last_test_ok: boolean | null;
  last_test_latency_ms: number | null;
  last_test_error: string | null;
}

export interface ProviderTestResult {
  ok: boolean;
  model?: string | null;
  latency_ms?: number | null;
  response?: string | null;
  error?: string | null;
}

export type ProviderType =
  | "openai"
  | "anthropic"
  | "ollama"
  | "openai_compat"
  | "qwen"
  | "gemini"
  | "moonshot"
  | "minimax"
  | "deepseek"
  | "zhipu";

export interface UsageModelStat {
  model: string;
  messages: number;
  tokens_estimated: number;
}

export interface UsageStats {
  messages_total: number;
  messages_by_role: { user: number; assistant: number };
  tokens_estimated_total: number;
  tokens_from_messages: number;
  tokens_from_summaries: number;
  models_used: UsageModelStat[];
  conversations_total: number;
  last_activity_at: string | null;
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

  providers: ProviderConfig[];
  providersLoading: boolean;
  providerCatalog: Record<string, ProviderCatalogEntry>;

  usageStats: UsageStats | null;
  usageStatsLoading: boolean;

  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  removeProject: (id: string) => void;
  addDocToProject: (projectId: string, docId: string) => void;
  removeDocFromProject: (projectId: string, docId: string) => void;
  ensureDefaultProject: () => Project;
  setDocuments: (docs: ZenDocument[]) => void;
  addDocument: (doc: ZenDocument) => void;
  setActiveProject: (id: string | null) => void;
  setActiveDocument: (id: string | null) => void;
  setActiveConversation: (id: string | null) => void;
  setRightTab: (tab: RightTab) => void;
  setChatDocumentIds: (ids: string[]) => void;

  setConversations: (convs: Conversation[]) => void;
  addConversation: (conv: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  removeConversation: (id: string) => void;
  togglePinConversation: (id: string) => void;
  setSelectedModel: (model: ModelId) => void;
  setModels: (models: ZenModel[]) => void;
  refreshModels: () => Promise<void>;
  setModelsModalOpen: (open: boolean) => void;

  refreshProviders: () => Promise<void>;
  refreshCatalog: () => Promise<void>;
  testProviderConfig: (
    data: Omit<ProviderConfig, "id" | "label" | "has_api_key" | "last_test_at" | "last_test_ok" | "last_test_latency_ms" | "last_test_error">
  ) => Promise<ProviderTestResult>;
  createProvider: (
    data: Omit<ProviderConfig, "id" | "label" | "has_api_key" | "last_test_at" | "last_test_ok" | "last_test_latency_ms" | "last_test_error">
  ) => Promise<{ ok: boolean; error?: string; provider?: ProviderConfig }>;
  updateProvider: (
    id: string,
    data: Partial<ProviderConfig>
  ) => Promise<{ ok: boolean; error?: string; provider?: ProviderConfig }>;
  deleteProvider: (id: string) => Promise<{ ok: boolean; error?: string }>;
  testSavedProvider: (id: string) => Promise<ProviderTestResult>;
  syncProviderModels: (id: string) => Promise<{ ok: boolean; error?: string; models?: string[] }>;
  setDefaultProvider: (id: string) => Promise<{ ok: boolean; error?: string }>;

  refreshUsageStats: () => Promise<void>;
}

export const useZenStore = create<ZenState>((set, get) => ({
  projects: [],
  documents: [],
  activeProjectId: null,
  activeDocumentId: null,
  activeConversationId: null,
  rightTab: "mindmap",
  chatDocumentIds: [],

  conversations: [],
  selectedModel: "",
  models: [],
  modelsModalOpen: false,

  providers: [],
  providersLoading: false,
  providerCatalog: {},

  usageStats: null,
  usageStatsLoading: false,

  setProjects: (projects) => set({ projects }),
  addProject: (project) =>
    set((state) => ({ projects: [...state.projects, project] })),
  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
    })),
  addDocToProject: (projectId, docId) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId && !p.documents.includes(docId)
          ? { ...p, documents: [...p.documents, docId] }
          : p
      ),
    })),
  removeDocFromProject: (projectId, docId) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? { ...p, documents: p.documents.filter((id) => id !== docId) }
          : p
      ),
    })),
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
    const state = get();
    const conv = state.conversations.find((c) => c.id === id);
    if (conv?.backendId) {
      fetch(`${API_URL}/conversations/${conv.backendId}`, {
        method: "DELETE",
        credentials: "include",
      }).catch(() => {});
    }
    const convs = state.conversations.filter((c) => c.id !== id);
    set({
      conversations: convs,
      activeConversationId:
        state.activeConversationId === id
          ? null
          : state.activeConversationId,
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

  refreshProviders: async () => {
    set({ providersLoading: true });
    try {
      const res = await fetch(`${API_URL}/providers`, { credentials: "include" });
      if (!res.ok) return;
      const providers = (await res.json()) as ProviderConfig[];
      set({ providers });
    } catch {
    } finally {
      set({ providersLoading: false });
    }
  },

  refreshCatalog: async () => {
    try {
      const res = await fetch(`${API_URL}/providers/catalog`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const catalog = (await res.json()) as Record<string, ProviderCatalogEntry>;
      set({ providerCatalog: catalog });
    } catch {}
  },

  testProviderConfig: async (data) => {
    const res = await fetch(`${API_URL}/providers/test`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: (detail as { detail?: string }).detail ?? `HTTP ${res.status}`,
      };
    }
    return (await res.json()) as ProviderTestResult;
  },

  createProvider: async (data) => {
    try {
      const res = await fetch(`${API_URL}/providers`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        return {
          ok: false,
          error: (detail as { detail?: string }).detail ?? `HTTP ${res.status}`,
        };
      }
      const provider = (await res.json()) as ProviderConfig;
      set((s) => ({ providers: [...s.providers, provider] }));
      get().refreshModels().catch(() => {});
      return { ok: true, provider };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },

  updateProvider: async (id, data) => {
    try {
      const payload: Record<string, unknown> = {};
      if (data.base_url !== undefined) payload.base_url = data.base_url;
      if (data.api_key !== undefined) payload.api_key = data.api_key;
      if (data.models !== undefined) payload.models = data.models;
      if (data.default_model !== undefined) payload.default_model = data.default_model;
      if (data.is_default !== undefined) payload.is_default = data.is_default;
      if (data.use_for_embeddings !== undefined)
        payload.use_for_embeddings = data.use_for_embeddings;

      const res = await fetch(`${API_URL}/providers/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        return {
          ok: false,
          error: (detail as { detail?: string }).detail ?? `HTTP ${res.status}`,
        };
      }
      const provider = (await res.json()) as ProviderConfig;
      set((s) => ({
        providers: s.providers.map((p) => (p.id === id ? provider : p)),
      }));
      get().refreshModels().catch(() => {});
      return { ok: true, provider };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },

  deleteProvider: async (id) => {
    try {
      const res = await fetch(`${API_URL}/providers/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        return {
          ok: false,
          error: (detail as { detail?: string }).detail ?? `HTTP ${res.status}`,
        };
      }
      set((s) => ({ providers: s.providers.filter((p) => p.id !== id) }));
      get().refreshModels().catch(() => {});
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },

  testSavedProvider: async (id) => {
    try {
      const res = await fetch(`${API_URL}/providers/${id}/test`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        return {
          ok: false,
          error: (detail as { detail?: string }).detail ?? `HTTP ${res.status}`,
        };
      }
      const body = (await res.json()) as ProviderTestResult;
      // Refresh provider list so health columns are reflected
      get().refreshProviders().catch(() => {});
      return body;
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },

  syncProviderModels: async (id) => {
    try {
      const res = await fetch(`${API_URL}/providers/${id}/sync-models`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        return {
          ok: false,
          error: (detail as { detail?: string }).detail ?? `HTTP ${res.status}`,
        };
      }
      const body = (await res.json()) as { models: string[] };
      get().refreshProviders().catch(() => {});
      get().refreshModels().catch(() => {});
      return { ok: true, models: body.models };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },

  setDefaultProvider: async (id) => {
    return get().updateProvider(id, { is_default: true });
  },

  refreshUsageStats: async () => {
    set({ usageStatsLoading: true });
    try {
      const res = await fetch(`${API_URL}/chat/stats/usage`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const stats = (await res.json()) as UsageStats;
      set({ usageStats: stats });
    } catch {
    } finally {
      set({ usageStatsLoading: false });
    }
  },
}));

export function hydrateZenStore() {
  useZenStore.setState({
    conversations: loadFromStorage<Conversation[]>("doczen:conversations", []),
    selectedModel: loadFromStorage<ModelId>("doczen:selectedModel", ""),
  });
}
