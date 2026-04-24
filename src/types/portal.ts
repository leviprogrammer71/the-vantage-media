// =============================================
// Client Portal & Business Operations Types
// =============================================

export interface Client {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  business_name: string | null;
  business_type: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  status: 'not_started' | 'in_progress' | 'review' | 'completed';
  estimated_completion_date: string | null;
  actual_completion_date: string | null;
  progress_percentage: number;
  days_remaining: number | null;
  package_type: string | null;
  total_price: number | null;
  stripe_invoice_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  sort_order: number;
  completed_at: string | null;
  created_at: string;
}

export interface ProjectUpdate {
  id: string;
  project_id: string;
  message: string;
  update_type: 'progress' | 'milestone' | 'delivery' | 'note';
  is_client_visible: boolean;
  created_at: string;
}

export interface FollowUp {
  id: string;
  client_id: string;
  project_id: string | null;
  reminder_date: string;
  reminder_time: string;
  message: string;
  is_completed: boolean;
  recurrence: 'none' | 'daily' | 'weekly' | 'biweekly';
  completed_at: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  client_id: string;
  project_id: string | null;
  stripe_invoice_id: string | null;
  stripe_payment_link: string | null;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  due_date: string | null;
  paid_at: string | null;
  description: string | null;
  created_at: string;
}

export interface IntakeForm {
  id: string;
  client_id: string;
  form_type: 'new_client' | 'website' | 'photography' | 'content';
  form_data: Record<string, unknown>;
  submitted_at: string;
}

export interface VideoDeliverable {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  video_type: 'walkthrough' | 'presentation' | 'tutorial';
  is_viewed: boolean;
  viewed_at: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  client_id: string;
  project_id: string | null;
  role: 'user' | 'assistant' | 'admin';
  content: string;
  created_at: string;
}

export interface Package {
  id: string;
  name: string;
  description: string | null;
  price: number;
  features: string[];
  package_type: 'website' | 'brand_photography' | 'content_strategy' | 'full_ecosystem' | 'automation';
  is_active: boolean;
  created_at: string;
}

// Composite types for UI
export interface ProjectWithDetails extends Project {
  tasks: Task[];
  updates: ProjectUpdate[];
  videos: VideoDeliverable[];
  invoices: Invoice[];
  client?: Client;
}

export interface ClientWithProjects extends Client {
  projects: Project[];
}

export interface AdminDashboardStats {
  activeProjects: number;
  totalClients: number;
  revenueTotal: number;
  revenuePending: number;
  overdueInvoices: number;
  unreadMessages: number;
  pendingOnboarding: number;
}

export type ProjectStatus = Project['status'];
export type TaskStatus = Task['status'];
export type InvoiceStatus = Invoice['status'];
export type UpdateType = ProjectUpdate['update_type'];
