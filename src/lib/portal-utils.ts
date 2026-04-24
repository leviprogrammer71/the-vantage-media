// =============================================
// Portal Utility Functions
// =============================================

import type { ProjectStatus, TaskStatus, InvoiceStatus, UpdateType } from '@/types/portal';

/**
 * Calculate days remaining from an estimated completion date
 */
export function getDaysRemaining(estimatedDate: string | null): number | null {
  if (!estimatedDate) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(estimatedDate);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get the urgency color class for days remaining
 */
export function getCountdownColor(days: number | null): string {
  if (days === null) return 'text-muted-foreground';
  if (days < 0) return 'text-red-400';
  if (days <= 3) return 'text-red-400';
  if (days <= 7) return 'text-amber-400';
  return 'text-emerald-400';
}

/**
 * Get the countdown background class
 */
export function getCountdownBg(days: number | null): string {
  if (days === null) return 'bg-muted/20';
  if (days < 0) return 'bg-red-500/10';
  if (days <= 3) return 'bg-red-500/10';
  if (days <= 7) return 'bg-amber-500/10';
  return 'bg-emerald-500/10';
}

/**
 * Format the countdown display text
 */
export function formatCountdown(days: number | null): string {
  if (days === null) return 'No deadline set';
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return '1 day remaining';
  return `${days} days remaining`;
}

/**
 * Get status badge classes
 */
export function getStatusConfig(status: ProjectStatus): { label: string; className: string } {
  switch (status) {
    case 'not_started':
      return { label: 'Not Started', className: 'bg-slate-500/20 text-slate-300 border-slate-500/30' };
    case 'in_progress':
      return { label: 'In Progress', className: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
    case 'review':
      return { label: 'In Review', className: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    case 'completed':
      return { label: 'Completed', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
  }
}

/**
 * Get task status icon and color
 */
export function getTaskStatusConfig(status: TaskStatus): { icon: string; className: string } {
  switch (status) {
    case 'completed':
      return { icon: '✅', className: 'text-emerald-400' };
    case 'in_progress':
      return { icon: '🔄', className: 'text-blue-400' };
    case 'pending':
      return { icon: '⬚', className: 'text-slate-500' };
  }
}

/**
 * Get invoice status config
 */
export function getInvoiceStatusConfig(status: InvoiceStatus): { label: string; icon: string; className: string } {
  switch (status) {
    case 'draft':
      return { label: 'Draft', icon: '📝', className: 'text-slate-400' };
    case 'sent':
      return { label: 'Sent', icon: '📨', className: 'text-blue-400' };
    case 'paid':
      return { label: 'Paid', icon: '✅', className: 'text-emerald-400' };
    case 'overdue':
      return { label: 'Overdue', icon: '🔴', className: 'text-red-400' };
  }
}

/**
 * Get update type config
 */
export function getUpdateTypeConfig(type: UpdateType): { icon: string; className: string } {
  switch (type) {
    case 'progress':
      return { icon: '📋', className: 'border-blue-500/30' };
    case 'milestone':
      return { icon: '🎯', className: 'border-emerald-500/30' };
    case 'delivery':
      return { icon: '📦', className: 'border-purple-500/30' };
    case 'note':
      return { icon: '📝', className: 'border-slate-500/30' };
  }
}

/**
 * Format a date for display
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date for relative time
 */
export function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate progress from tasks
 */
export function calculateProgress(tasks: { status: string }[]): number {
  if (tasks.length === 0) return 0;
  const completed = tasks.filter(t => t.status === 'completed').length;
  return Math.round((completed / tasks.length) * 100);
}

/**
 * Get progress bar color based on percentage
 */
export function getProgressColor(percentage: number): string {
  if (percentage >= 80) return 'bg-emerald-500';
  if (percentage >= 50) return 'bg-blue-500';
  if (percentage >= 25) return 'bg-amber-500';
  return 'bg-slate-500';
}
