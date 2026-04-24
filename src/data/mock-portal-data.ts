// =============================================
// Mock Data for Client Portal (UI-first development)
// Replace with Supabase queries when wiring up
// =============================================

import type {
  Client, Project, Task, ProjectUpdate, FollowUp,
  Invoice, VideoDeliverable, ChatMessage, Package
} from '@/types/portal';

// --- CLIENTS ---
export const mockClients: Client[] = [
  {
    id: 'c1',
    user_id: 'u1',
    name: 'Marcus Johnson',
    email: 'marcus@valleycabinets.com',
    phone: '(559) 555-0142',
    business_name: 'Valley Cabinets',
    business_type: 'contractor',
    onboarding_completed: true,
    created_at: '2026-02-15T10:00:00Z',
    updated_at: '2026-03-20T14:30:00Z',
  },
  {
    id: 'c2',
    user_id: 'u2',
    name: 'Pastor David Williams',
    email: 'pastor.david@gracecommunity.org',
    phone: '(559) 555-0198',
    business_name: 'Grace Community Church',
    business_type: 'church',
    onboarding_completed: true,
    created_at: '2026-01-10T09:00:00Z',
    updated_at: '2026-03-15T11:00:00Z',
  },
  {
    id: 'c3',
    user_id: 'u3',
    name: 'Tanya Brooks',
    email: 'tanya@tanyabrooksauthor.com',
    phone: '(559) 555-0267',
    business_name: 'Tanya Brooks Author',
    business_type: 'author',
    onboarding_completed: false,
    created_at: '2026-03-28T16:00:00Z',
    updated_at: '2026-03-28T16:00:00Z',
  },
  {
    id: 'c4',
    user_id: 'u4',
    name: 'Chef Rosa Martinez',
    email: 'rosa@casarosarestaurant.com',
    phone: '(559) 555-0311',
    business_name: 'Casa Rosa Restaurant',
    business_type: 'restaurant',
    onboarding_completed: true,
    created_at: '2026-03-01T12:00:00Z',
    updated_at: '2026-04-01T09:00:00Z',
  },
];

// --- PROJECTS ---
export const mockProjects: Project[] = [
  {
    id: 'p1',
    client_id: 'c1',
    title: 'Brand Website Build',
    description: 'Custom website for Valley Cabinets featuring gallery, booking, and reviews.',
    status: 'in_progress',
    estimated_completion_date: '2026-04-18',
    actual_completion_date: null,
    progress_percentage: 65,
    days_remaining: 12,
    package_type: 'website',
    total_price: 2500.00,
    stripe_invoice_id: null,
    created_at: '2026-02-20T10:00:00Z',
    updated_at: '2026-04-04T16:00:00Z',
  },
  {
    id: 'p2',
    client_id: 'c1',
    title: 'Brand Photography Shoot',
    description: 'On-location shoot at the new showroom — kitchen & bath displays.',
    status: 'completed',
    estimated_completion_date: '2026-03-10',
    actual_completion_date: '2026-03-08',
    progress_percentage: 100,
    days_remaining: 0,
    package_type: 'brand_photography',
    total_price: 850.00,
    stripe_invoice_id: 'inv_abc123',
    created_at: '2026-02-15T10:00:00Z',
    updated_at: '2026-03-08T17:00:00Z',
  },
  {
    id: 'p3',
    client_id: 'c2',
    title: 'Full Brand Ecosystem',
    description: 'Complete digital presence for Grace Community — website, content, and automation.',
    status: 'in_progress',
    estimated_completion_date: '2026-05-01',
    actual_completion_date: null,
    progress_percentage: 40,
    days_remaining: 25,
    package_type: 'full_ecosystem',
    total_price: 5500.00,
    stripe_invoice_id: null,
    created_at: '2026-01-15T09:00:00Z',
    updated_at: '2026-04-02T10:00:00Z',
  },
  {
    id: 'p4',
    client_id: 'c4',
    title: 'Restaurant Website + Menu System',
    description: 'Custom site with online menu, reservation integration, and Google Maps.',
    status: 'review',
    estimated_completion_date: '2026-04-10',
    actual_completion_date: null,
    progress_percentage: 90,
    days_remaining: 4,
    package_type: 'website',
    total_price: 2500.00,
    stripe_invoice_id: null,
    created_at: '2026-03-01T12:00:00Z',
    updated_at: '2026-04-05T14:00:00Z',
  },
];

// --- TASKS ---
export const mockTasks: Task[] = [
  // Project p1 tasks (Valley Cabinets Website)
  { id: 't1', project_id: 'p1', title: 'Discovery call & requirements', description: null, status: 'completed', sort_order: 1, completed_at: '2026-02-22T15:00:00Z', created_at: '2026-02-20T10:00:00Z' },
  { id: 't2', project_id: 'p1', title: 'Brand photography shoot', description: null, status: 'completed', sort_order: 2, completed_at: '2026-03-08T17:00:00Z', created_at: '2026-02-20T10:00:00Z' },
  { id: 't3', project_id: 'p1', title: 'Wireframe & design mockups', description: null, status: 'completed', sort_order: 3, completed_at: '2026-03-15T12:00:00Z', created_at: '2026-02-20T10:00:00Z' },
  { id: 't4', project_id: 'p1', title: 'Homepage build', description: null, status: 'completed', sort_order: 4, completed_at: '2026-03-25T16:00:00Z', created_at: '2026-02-20T10:00:00Z' },
  { id: 't5', project_id: 'p1', title: 'Gallery & portfolio pages', description: null, status: 'in_progress', sort_order: 5, completed_at: null, created_at: '2026-02-20T10:00:00Z' },
  { id: 't6', project_id: 'p1', title: 'Contact form & booking integration', description: null, status: 'pending', sort_order: 6, completed_at: null, created_at: '2026-02-20T10:00:00Z' },
  { id: 't7', project_id: 'p1', title: 'SEO setup & final review', description: null, status: 'pending', sort_order: 7, completed_at: null, created_at: '2026-02-20T10:00:00Z' },
  { id: 't8', project_id: 'p1', title: 'Launch & handoff', description: null, status: 'pending', sort_order: 8, completed_at: null, created_at: '2026-02-20T10:00:00Z' },

  // Project p3 tasks (Grace Community)
  { id: 't9', project_id: 'p3', title: 'Discovery & strategy session', description: null, status: 'completed', sort_order: 1, completed_at: '2026-01-20T14:00:00Z', created_at: '2026-01-15T09:00:00Z' },
  { id: 't10', project_id: 'p3', title: 'Brand photography (church & staff)', description: null, status: 'completed', sort_order: 2, completed_at: '2026-02-10T17:00:00Z', created_at: '2026-01-15T09:00:00Z' },
  { id: 't11', project_id: 'p3', title: 'Content strategy & calendar', description: null, status: 'completed', sort_order: 3, completed_at: '2026-02-28T12:00:00Z', created_at: '2026-01-15T09:00:00Z' },
  { id: 't12', project_id: 'p3', title: 'Website design & build', description: null, status: 'in_progress', sort_order: 4, completed_at: null, created_at: '2026-01-15T09:00:00Z' },
  { id: 't13', project_id: 'p3', title: 'Chatbot & SMS setup', description: null, status: 'pending', sort_order: 5, completed_at: null, created_at: '2026-01-15T09:00:00Z' },
  { id: 't14', project_id: 'p3', title: 'Payment & scheduling integration', description: null, status: 'pending', sort_order: 6, completed_at: null, created_at: '2026-01-15T09:00:00Z' },
  { id: 't15', project_id: 'p3', title: 'Launch & 30-day support', description: null, status: 'pending', sort_order: 7, completed_at: null, created_at: '2026-01-15T09:00:00Z' },

  // Project p4 tasks (Casa Rosa)
  { id: 't16', project_id: 'p4', title: 'Menu photography & content', description: null, status: 'completed', sort_order: 1, completed_at: '2026-03-10T16:00:00Z', created_at: '2026-03-01T12:00:00Z' },
  { id: 't17', project_id: 'p4', title: 'Website design & build', description: null, status: 'completed', sort_order: 2, completed_at: '2026-03-28T15:00:00Z', created_at: '2026-03-01T12:00:00Z' },
  { id: 't18', project_id: 'p4', title: 'Online menu integration', description: null, status: 'completed', sort_order: 3, completed_at: '2026-04-02T14:00:00Z', created_at: '2026-03-01T12:00:00Z' },
  { id: 't19', project_id: 'p4', title: 'Client review & revisions', description: null, status: 'in_progress', sort_order: 4, completed_at: null, created_at: '2026-03-01T12:00:00Z' },
  { id: 't20', project_id: 'p4', title: 'Launch', description: null, status: 'pending', sort_order: 5, completed_at: null, created_at: '2026-03-01T12:00:00Z' },
];

// --- PROJECT UPDATES ---
export const mockUpdates: ProjectUpdate[] = [
  { id: 'u1', project_id: 'p1', message: 'Welcome! We\'ve received your intake form and will begin the discovery phase this week.', update_type: 'milestone', is_client_visible: true, created_at: '2026-02-20T10:30:00Z' },
  { id: 'u2', project_id: 'p1', message: 'Discovery call completed — great conversation. Moving to photography planning.', update_type: 'progress', is_client_visible: true, created_at: '2026-02-22T16:00:00Z' },
  { id: 'u3', project_id: 'p1', message: 'Brand photography delivered — 32 edited images. Check the gallery in your dashboard!', update_type: 'delivery', is_client_visible: true, created_at: '2026-03-08T17:30:00Z' },
  { id: 'u4', project_id: 'p1', message: 'Wireframes approved. Starting homepage build this week.', update_type: 'milestone', is_client_visible: true, created_at: '2026-03-15T13:00:00Z' },
  { id: 'u5', project_id: 'p1', message: 'Homepage is looking great — now building out gallery and portfolio pages.', update_type: 'progress', is_client_visible: true, created_at: '2026-04-01T10:00:00Z' },
  { id: 'u6', project_id: 'p4', message: 'Site is ready for your review! Please take a look and let us know any changes.', update_type: 'milestone', is_client_visible: true, created_at: '2026-04-05T14:00:00Z' },
  { id: 'u7', project_id: 'p4', message: 'Video walkthrough of the full site has been uploaded.', update_type: 'delivery', is_client_visible: true, created_at: '2026-04-05T15:00:00Z' },
];

// --- FOLLOW-UPS ---
export const mockFollowUps: FollowUp[] = [
  { id: 'f1', client_id: 'c1', project_id: 'p1', reminder_date: '2026-04-06', reminder_time: '09:00', message: 'Check in on gallery page progress — send screenshot preview', is_completed: false, recurrence: 'none', completed_at: null, created_at: '2026-04-01T10:00:00Z' },
  { id: 'f2', client_id: 'c4', project_id: 'p4', reminder_date: '2026-04-06', reminder_time: '11:00', message: 'Follow up on site review — Rosa has had 24hrs to look at it', is_completed: false, recurrence: 'none', completed_at: null, created_at: '2026-04-05T14:00:00Z' },
  { id: 'f3', client_id: 'c2', project_id: 'p3', reminder_date: '2026-04-08', reminder_time: '10:00', message: 'Weekly update for Pastor David — website design progress', is_completed: false, recurrence: 'weekly', completed_at: null, created_at: '2026-03-01T09:00:00Z' },
  { id: 'f4', client_id: 'c3', project_id: null, reminder_date: '2026-04-07', reminder_time: '14:00', message: 'Tanya hasn\'t completed onboarding — send a friendly nudge', is_completed: false, recurrence: 'none', completed_at: null, created_at: '2026-03-30T10:00:00Z' },
  { id: 'f5', client_id: 'c1', project_id: 'p2', reminder_date: '2026-04-01', reminder_time: '09:00', message: 'Ask Marcus for a testimonial — photography project was a hit', is_completed: true, recurrence: 'none', completed_at: '2026-04-01T09:30:00Z', created_at: '2026-03-15T10:00:00Z' },
];

// --- INVOICES ---
export const mockInvoices: Invoice[] = [
  { id: 'i1', client_id: 'c1', project_id: 'p2', stripe_invoice_id: 'inv_abc123', stripe_payment_link: null, amount: 850.00, status: 'paid', due_date: '2026-02-28', paid_at: '2026-02-25T14:00:00Z', description: 'Brand Photography Package', created_at: '2026-02-15T10:00:00Z' },
  { id: 'i2', client_id: 'c1', project_id: 'p1', stripe_invoice_id: 'inv_def456', stripe_payment_link: 'https://pay.stripe.com/test_abc', amount: 1250.00, status: 'paid', due_date: '2026-02-25', paid_at: '2026-02-24T10:00:00Z', description: 'Website Build — 50% deposit', created_at: '2026-02-20T10:00:00Z' },
  { id: 'i3', client_id: 'c1', project_id: 'p1', stripe_invoice_id: null, stripe_payment_link: 'https://pay.stripe.com/test_def', amount: 1250.00, status: 'sent', due_date: '2026-04-18', paid_at: null, description: 'Website Build — final payment', created_at: '2026-04-01T10:00:00Z' },
  { id: 'i4', client_id: 'c2', project_id: 'p3', stripe_invoice_id: 'inv_ghi789', stripe_payment_link: null, amount: 2750.00, status: 'paid', due_date: '2026-01-20', paid_at: '2026-01-18T16:00:00Z', description: 'Full Ecosystem — 50% deposit', created_at: '2026-01-15T09:00:00Z' },
  { id: 'i5', client_id: 'c2', project_id: 'p3', stripe_invoice_id: null, stripe_payment_link: null, amount: 2750.00, status: 'draft', due_date: '2026-05-01', paid_at: null, description: 'Full Ecosystem — final payment', created_at: '2026-04-01T09:00:00Z' },
  { id: 'i6', client_id: 'c4', project_id: 'p4', stripe_invoice_id: 'inv_jkl012', stripe_payment_link: null, amount: 2500.00, status: 'paid', due_date: '2026-03-10', paid_at: '2026-03-08T11:00:00Z', description: 'Restaurant Website — full payment', created_at: '2026-03-01T12:00:00Z' },
];

// --- VIDEO DELIVERABLES ---
export const mockVideos: VideoDeliverable[] = [
  { id: 'v1', project_id: 'p1', title: 'Homepage Design Walkthrough', description: 'Quick tour of the homepage layout, hero section, and navigation.', video_url: 'https://www.loom.com/share/example1', thumbnail_url: null, video_type: 'walkthrough', is_viewed: true, viewed_at: '2026-03-26T10:00:00Z', created_at: '2026-03-25T17:00:00Z' },
  { id: 'v2', project_id: 'p4', title: 'Full Site Review — Casa Rosa', description: 'Complete walkthrough of all pages, menu integration, and reservation system.', video_url: 'https://www.loom.com/share/example2', thumbnail_url: null, video_type: 'walkthrough', is_viewed: false, viewed_at: null, created_at: '2026-04-05T15:00:00Z' },
  { id: 'v3', project_id: 'p3', title: 'Content Strategy Presentation', description: 'Overview of the 30-day content calendar and posting strategy.', video_url: 'https://www.loom.com/share/example3', thumbnail_url: null, video_type: 'presentation', is_viewed: true, viewed_at: '2026-03-01T14:00:00Z', created_at: '2026-02-28T16:00:00Z' },
];

// --- CHAT MESSAGES ---
export const mockMessages: ChatMessage[] = [
  { id: 'm1', client_id: 'c1', project_id: 'p1', role: 'user', content: 'Hey, when will the gallery page be done?', created_at: '2026-04-03T14:00:00Z' },
  { id: 'm2', client_id: 'c1', project_id: 'p1', role: 'assistant', content: 'Great question! The gallery and portfolio pages are currently in progress. Based on the timeline, they should be completed by April 10th. You\'re at 65% overall progress and on track for the April 18th delivery.', created_at: '2026-04-03T14:00:05Z' },
  { id: 'm3', client_id: 'c4', project_id: 'p4', role: 'user', content: 'The site looks amazing! Can we add a special events section?', created_at: '2026-04-06T09:00:00Z' },
  { id: 'm4', client_id: 'c4', project_id: 'p4', role: 'assistant', content: 'Thank you so much! A special events section is a great idea. This would be a small addition — I\'d suggest reaching out directly to discuss the details and get a quick quote. Your project is currently in the review phase at 90% completion.', created_at: '2026-04-06T09:00:05Z' },
];

// --- PACKAGES ---
export const mockPackages: Package[] = [
  {
    id: 'pkg1', name: 'Brand Photography', description: 'Professional on-location photo shoot with edited high-res images',
    price: 850, features: ['On-location photo shoot (2-4 hours)', '25 edited high-res images', 'Digital delivery within 7 days', 'Commercial usage rights'],
    package_type: 'brand_photography', is_active: true, created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'pkg2', name: 'Website Build', description: 'Custom-designed, mobile-responsive website with SEO fundamentals',
    price: 2500, features: ['Custom design (not templates)', 'Mobile responsive', 'SEO basics', '3 rounds of revision', 'Launch within 4 weeks'],
    package_type: 'website', is_active: true, created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'pkg3', name: 'Content Strategy', description: 'Complete content strategy with audit, calendar, and posting plan',
    price: 1200, features: ['Platform audit', 'Content calendar (30 days)', '5 infographic/video concepts', 'Posting strategy', 'Competitor analysis'],
    package_type: 'content_strategy', is_active: true, created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'pkg4', name: 'Full Brand Ecosystem', description: 'The complete package — photography, website, content, and automation',
    price: 5500, features: ['Everything in Photography + Website + Content', 'Chatbot/SMS integration', 'Payment/scheduling integration', 'Admin control panel', '30-day post-launch support'],
    package_type: 'full_ecosystem', is_active: true, created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'pkg5', name: 'Automation Add-On', description: 'Chatbot, payment, calendar, and CRM integrations for your business',
    price: 1500, features: ['Chatbot setup (social + SMS)', 'Payment integration (Stripe/PayPal)', 'Calendar/scheduling integration', 'CRM setup'],
    package_type: 'automation', is_active: true, created_at: '2026-01-01T00:00:00Z',
  },
];

// --- HELPER FUNCTIONS ---
export function getClientProjects(clientId: string): Project[] {
  return mockProjects.filter(p => p.client_id === clientId);
}

export function getProjectTasks(projectId: string): Task[] {
  return mockTasks.filter(t => t.project_id === projectId).sort((a, b) => a.sort_order - b.sort_order);
}

export function getProjectUpdates(projectId: string): ProjectUpdate[] {
  return mockUpdates.filter(u => u.project_id === projectId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function getProjectVideos(projectId: string): VideoDeliverable[] {
  return mockVideos.filter(v => v.project_id === projectId);
}

export function getClientInvoices(clientId: string): Invoice[] {
  return mockInvoices.filter(i => i.client_id === clientId);
}

export function getTodayFollowUps(): FollowUp[] {
  const today = new Date().toISOString().split('T')[0];
  return mockFollowUps.filter(f => f.reminder_date === today && !f.is_completed);
}

export function getUpcomingFollowUps(): FollowUp[] {
  const today = new Date().toISOString().split('T')[0];
  return mockFollowUps.filter(f => f.reminder_date > today && !f.is_completed).sort((a, b) => a.reminder_date.localeCompare(b.reminder_date));
}

export function getProjectMessages(projectId: string): ChatMessage[] {
  return mockMessages.filter(m => m.project_id === projectId).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}
