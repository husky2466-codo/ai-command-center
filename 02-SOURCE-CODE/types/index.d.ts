// Type definitions for AI Command Center

// ============================================================================
// Email Types
// ============================================================================

export interface Email {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  fromEmail: string;
  to: string;
  date: string;
  unread: boolean;
  starred: boolean;
  body: string | null;
  labels: string[];
  attachments: Attachment[];
}

export interface Attachment {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
}

export interface EmailLabel {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface EmailSignature {
  id: string;
  name: string;
  content: string;
  is_default: boolean;
  created_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  created_at: string;
}

// ============================================================================
// Project Types
// ============================================================================

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active_focus' | 'on_deck' | 'growing' | 'on_hold' | 'completed';
  progress: number;
  deadline: string | null;
  space_id: string | null;
  created_at: string;
  updated_at: string;
  planning_notes?: string;
  folder_path?: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  energy_type: 'low' | 'medium' | 'deep_work' | 'creative' | 'quick_win' | 'execution' | 'people_work';
  due_date: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

export interface Space {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

// ============================================================================
// Chain Runner Types
// ============================================================================

export interface Agent {
  id: string;
  provider: 'anthropic' | 'openai' | 'huggingface' | 'ollama';
  model: string;
  taskSpec: string;
  output: string;
  displayedOutput: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChainRunnerConfig {
  agents: Agent[];
  promptList: string[];
  iterations: number;
  runMode: 'once' | 'n-times' | 'continuous';
  enableTypewriter: boolean;
  enableQualityValidator: boolean;
  qualityThreshold: number;
  validatorProvider?: string;
  validatorModel?: string;
}

export interface QualityScore {
  overall: number;
  correctness: number;
  completeness: number;
  clarity: number;
  relevance: number;
  reasoning: string;
}

// ============================================================================
// Knowledge Types
// ============================================================================

export interface KnowledgeFolder {
  id: string;
  name: string;
  description: string;
  parent_id: string | null;
  created_at: string;
}

export interface KnowledgeArticle {
  id: string;
  folder_id: string;
  title: string;
  content: string;
  tags: string;
  is_spark: number;
  created_at: string;
  updated_at: string;
  last_viewed_at?: string | null;
}

// ============================================================================
// Contact/Relationship Types
// ============================================================================

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  relationship_type: string;
  notes: string;
  created_at: string;
  updated_at: string;
  last_contact_at?: string | null;
}

export interface Interaction {
  id: string;
  contact_id: string;
  type: 'meeting' | 'email' | 'call' | 'message' | 'other';
  notes: string;
  occurred_at: string;
  created_at: string;
}

// ============================================================================
// Reminder Types
// ============================================================================

export interface Reminder {
  id: string;
  title: string;
  description: string;
  due_at: string;
  status: 'pending' | 'completed' | 'snoozed';
  source_type: 'manual' | 'task' | 'meeting' | 'email';
  source_id?: string | null;
  created_at: string;
  completed_at?: string | null;
}

// ============================================================================
// Memory Types
// ============================================================================

export interface Memory {
  id: string;
  type: 'correction' | 'decision' | 'commitment' | 'insight' | 'learning' | 'confidence' | 'pattern_seed' | 'cross_agent' | 'workflow_note' | 'gap';
  category: string;
  title: string;
  content: string;
  confidence_score: number;
  reasoning?: string;
  evidence?: string;
  created_at: string;
}

// ============================================================================
// DGX Spark Types
// ============================================================================

export interface DGXConnection {
  id: string;
  name: string;
  hostname: string;
  username: string;
  ssh_key_path: string;
  port: number;
  created_at: string;
}

export interface DGXProject {
  id: string;
  connection_id: string;
  name: string;
  description: string;
  project_type: 'computer_vision' | 'nlp' | 'reinforcement_learning' | 'generative' | 'other';
  remote_path: string;
  created_at: string;
}

export interface TrainingJob {
  id: string;
  project_id: string;
  name: string;
  model_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  container_id?: string | null;
  metrics?: any;
  config?: any;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
}

// ============================================================================
// Calendar Types
// ============================================================================

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  attendees: string;
  google_event_id?: string | null;
  created_at: string;
}

// ============================================================================
// Chat Types
// ============================================================================

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

// ============================================================================
// API Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// Electron API Types
// ============================================================================

export interface ElectronAPI {
  // System
  getUserDataPath: () => Promise<string>;
  getApiKeys: () => Promise<ApiKeys>;

  // Database
  dbQuery: (sql: string, params?: any[]) => Promise<any[]>;
  dbRun: (sql: string, params?: any[]) => Promise<{ changes: number; lastInsertRowid: number }>;
  dbGet: (sql: string, params?: any[]) => Promise<any>;

  // File operations
  saveFile: (filename: string, content: string) => Promise<string>;
  deleteFile: (filepath: string) => Promise<boolean>;

  // Project watcher
  watchProject: (projectId: string, folderPath: string) => Promise<void>;
  unwatchProject: (projectId: string) => Promise<void>;
  onProjectProgress: (callback: (event: any, data: { projectId: string; progress: number }) => void) => void;
}

export interface ApiKeys {
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  HF_TOKEN?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}

// ============================================================================
// Window Extensions
// ============================================================================

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
