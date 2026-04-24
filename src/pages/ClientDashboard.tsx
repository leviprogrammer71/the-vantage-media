import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ChevronDown,
  ChevronUp,
  Play,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import {
  mockClients,
  mockProjects,
  getProjectTasks,
  getProjectUpdates,
  getProjectVideos,
  getClientInvoices,
} from '@/data/mock-portal-data';
import {
  formatDate,
  formatRelativeTime,
  formatCurrency,
  formatCountdown,
  getCountdownColor,
  getCountdownBg,
  getStatusConfig,
  getTaskStatusConfig,
  getInvoiceStatusConfig,
  getUpdateTypeConfig,
  getProgressColor,
} from '@/lib/portal-utils';

// Get the logged-in user (Marcus Johnson / Valley Cabinets for mock)
const currentClient = mockClients[0];
const clientProjects = mockProjects.filter((p) => p.client_id === currentClient.id);
const activeProjects = clientProjects.filter((p) => p.status !== 'completed');
const completedProjects = clientProjects.filter((p) => p.status === 'completed');

export default function ClientDashboard() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [expandedCompletedSection, setExpandedCompletedSection] = useState(false);

  const selectedProject = selectedProjectId
    ? clientProjects.find((p) => p.id === selectedProjectId)
    : null;

  const projectTasks = selectedProject ? getProjectTasks(selectedProject.id) : [];
  const projectUpdates = selectedProject ? getProjectUpdates(selectedProject.id) : [];
  const projectVideos = selectedProject ? getProjectVideos(selectedProject.id) : [];
  const clientInvoices = getClientInvoices(currentClient.id);

  const formatProjectCountdown = (days: number | null) => {
    if (days === null) return 'No deadline';
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return 'Due today';
    return `${days}d remaining`;
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1A1A2E' }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: 'rgba(233, 69, 96, 0.2)' }}>
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-4xl font-serif font-bold text-white mb-2">
              Welcome back, {currentClient.name}
            </h1>
            <p className="text-lg" style={{ color: '#9CA3AF' }}>
              {currentClient.business_name}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Active Projects Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-serif font-bold text-white mb-6">Active Projects</h2>

          {activeProjects.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
              {activeProjects.map((project) => {
                const statusConfig = getStatusConfig(project.status);
                const countdownDays = project.days_remaining;
                const countdownColor = getCountdownColor(countdownDays);
                const countdownBg = getCountdownBg(countdownDays);

                return (
                  <Card
                    key={project.id}
                    className="cursor-pointer transition-all hover:shadow-lg hover:shadow-[#E94560]/20"
                    style={{
                      backgroundColor: '#16213E',
                      borderColor: 'rgba(233, 69, 96, 0.3)',
                    }}
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-serif font-bold text-white flex-1 pr-2">
                          {project.title}
                        </h3>
                        <Badge
                          variant="outline"
                          className={statusConfig.className}
                        >
                          {statusConfig.label}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm" style={{ color: '#D1D5DB' }}>
                            Progress
                          </span>
                          <span className="text-sm font-semibold text-white">
                            {project.progress_percentage}%
                          </span>
                        </div>
                        <Progress
                          value={project.progress_percentage}
                          className="h-2 bg-slate-600"
                        />
                        <div
                          className={`h-2 rounded-full absolute -mt-2 ${getProgressColor(project.progress_percentage)}`}
                          style={{
                            width: `${project.progress_percentage}%`,
                            boxShadow: `0 0 8px ${getProgressColor(project.progress_percentage).replace('bg-', '')}`,
                          }}
                        />
                      </div>

                      {/* Countdown */}
                      <div
                        className={`p-3 rounded-lg border ${countdownBg}`}
                        style={{ borderColor: 'rgba(233, 69, 96, 0.2)' }}
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" style={{ color: countdownColor.replace('text-', '') }} />
                          <span className={`font-semibold ${countdownColor}`}>
                            {formatProjectCountdown(countdownDays)}
                          </span>
                        </div>
                      </div>

                      {/* Package Type */}
                      {project.package_type && (
                        <div className="text-sm" style={{ color: '#9CA3AF' }}>
                          <span className="capitalize">{project.package_type.replace(/_/g, ' ')}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card style={{ backgroundColor: '#16213E', borderColor: 'rgba(233, 69, 96, 0.3)' }}>
              <CardContent className="py-8 text-center">
                <p style={{ color: '#9CA3AF' }}>No active projects at this time.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Project Detail View */}
        {selectedProject && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-serif font-bold text-white">
                {selectedProject.title}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedProjectId(null)}
                className="text-white border-slate-600 hover:bg-slate-800"
              >
                Close
              </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-3 mb-12">
              {/* Left Column: Tasks & Updates */}
              <div className="lg:col-span-2 space-y-6">
                {/* Task Checklist */}
                <Card
                  style={{
                    backgroundColor: '#16213E',
                    borderColor: 'rgba(233, 69, 96, 0.3)',
                  }}
                >
                  <CardHeader>
                    <h3 className="text-xl font-serif font-bold text-white">Task Timeline</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {projectTasks.length > 0 ? (
                        projectTasks.map((task, idx) => {
                          const taskConfig = getTaskStatusConfig(task.status);
                          const isCurrentTask = task.status === 'in_progress';

                          return (
                            <div
                              key={task.id}
                              className={`p-3 rounded-lg border transition-all ${
                                isCurrentTask ? 'ring-2' : ''
                              }`}
                              style={{
                                backgroundColor: isCurrentTask
                                  ? 'rgba(59, 130, 246, 0.1)'
                                  : task.status === 'completed'
                                    ? 'rgba(16, 185, 129, 0.05)'
                                    : 'transparent',
                                borderColor: isCurrentTask
                                  ? 'rgba(59, 130, 246, 0.3)'
                                  : 'rgba(233, 69, 96, 0.1)',
                                ringColor: isCurrentTask ? 'rgba(59, 130, 246, 0.5)' : 'transparent',
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <span className="text-lg mt-0.5">{taskConfig.icon}</span>
                                <div className="flex-1">
                                  <p className="font-medium text-white">{task.title}</p>
                                  {task.completed_at && (
                                    <p
                                      className="text-sm mt-1"
                                      style={{ color: '#9CA3AF' }}
                                    >
                                      Completed {formatDate(task.completed_at)}
                                    </p>
                                  )}
                                  {task.status === 'in_progress' && (
                                    <p
                                      className="text-sm mt-1"
                                      style={{ color: '#60A5FA' }}
                                    >
                                      Currently in progress
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p style={{ color: '#9CA3AF' }}>No tasks yet.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Project Updates Feed */}
                <Card
                  style={{
                    backgroundColor: '#16213E',
                    borderColor: 'rgba(233, 69, 96, 0.3)',
                  }}
                >
                  <CardHeader>
                    <h3 className="text-xl font-serif font-bold text-white">Updates</h3>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-96 pr-4">
                      <div className="space-y-4">
                        {projectUpdates.length > 0 ? (
                          projectUpdates.map((update) => {
                            const updateConfig = getUpdateTypeConfig(update.update_type);

                            return (
                              <div
                                key={update.id}
                                className="pb-4 border-b last:border-b-0"
                                style={{ borderColor: 'rgba(233, 69, 96, 0.1)' }}
                              >
                                <div className="flex gap-3">
                                  <div
                                    className="flex-shrink-0 w-1 rounded-full"
                                    style={{ backgroundColor: '#E94560' }}
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-lg">{updateConfig.icon}</span>
                                      <span
                                        className="text-xs font-semibold uppercase tracking-wide"
                                        style={{ color: '#9CA3AF' }}
                                      >
                                        {update.update_type.replace(/_/g, ' ')}
                                      </span>
                                    </div>
                                    <p className="text-white mb-1">{update.message}</p>
                                    <p
                                      className="text-xs"
                                      style={{ color: '#6B7280' }}
                                    >
                                      {formatRelativeTime(update.created_at)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p style={{ color: '#9CA3AF' }}>No updates yet.</p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Videos & Invoices */}
              <div className="space-y-6">
                {/* Video Deliverables */}
                <Card
                  style={{
                    backgroundColor: '#16213E',
                    borderColor: 'rgba(233, 69, 96, 0.3)',
                  }}
                >
                  <CardHeader>
                    <h3 className="text-xl font-serif font-bold text-white">Video Deliverables</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {projectVideos.length > 0 ? (
                        projectVideos.map((video) => (
                          <a
                            key={video.id}
                            href={video.video_url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-3 rounded-lg border transition-all hover:shadow-lg"
                            style={{
                              backgroundColor: 'rgba(233, 69, 96, 0.05)',
                              borderColor: 'rgba(233, 69, 96, 0.3)',
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: 'rgba(233, 69, 96, 0.2)' }}
                              >
                                <Play className="h-5 w-5" style={{ color: '#E94560' }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-white text-sm truncate">
                                  {video.title}
                                </p>
                                <p
                                  className="text-xs mt-1"
                                  style={{ color: '#9CA3AF' }}
                                >
                                  {video.video_type.replace(/_/g, ' ')}
                                </p>
                                {video.is_viewed && (
                                  <p
                                    className="text-xs mt-1"
                                    style={{ color: '#10B981' }}
                                  >
                                    Viewed
                                  </p>
                                )}
                              </div>
                            </div>
                          </a>
                        ))
                      ) : (
                        <p
                          className="text-sm"
                          style={{ color: '#9CA3AF' }}
                        >
                          No videos yet.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Invoice & Payment Status */}
                <Card
                  style={{
                    backgroundColor: '#16213E',
                    borderColor: 'rgba(233, 69, 96, 0.3)',
                  }}
                >
                  <CardHeader>
                    <h3 className="text-xl font-serif font-bold text-white">Payment Status</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {clientInvoices.filter((inv) => inv.project_id === selectedProject.id).length > 0 ? (
                        clientInvoices
                          .filter((inv) => inv.project_id === selectedProject.id)
                          .map((invoice) => {
                            const invoiceConfig = getInvoiceStatusConfig(invoice.status);

                            return (
                              <div
                                key={invoice.id}
                                className="p-3 rounded-lg border"
                                style={{
                                  backgroundColor: 'rgba(233, 69, 96, 0.05)',
                                  borderColor: 'rgba(233, 69, 96, 0.2)',
                                }}
                              >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div>
                                    <p className="font-medium text-white">
                                      {formatCurrency(invoice.amount)}
                                    </p>
                                    <p
                                      className="text-xs"
                                      style={{ color: '#9CA3AF' }}
                                    >
                                      {invoice.description}
                                    </p>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={invoiceConfig.className}
                                  >
                                    <span className="mr-1">{invoiceConfig.icon}</span>
                                    {invoiceConfig.label}
                                  </Badge>
                                </div>
                                {invoice.due_date && (
                                  <p
                                    className="text-xs"
                                    style={{ color: '#6B7280' }}
                                  >
                                    Due {formatDate(invoice.due_date)}
                                  </p>
                                )}
                                {invoice.stripe_payment_link && (
                                  <Button
                                    size="sm"
                                    className="w-full mt-2"
                                    style={{
                                      backgroundColor: '#E94560',
                                      borderColor: '#E94560',
                                    }}
                                    asChild
                                  >
                                    <a
                                      href={invoice.stripe_payment_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      Pay Now
                                    </a>
                                  </Button>
                                )}
                              </div>
                            );
                          })
                      ) : (
                        <p
                          className="text-sm"
                          style={{ color: '#9CA3AF' }}
                        >
                          No invoices for this project.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Separator style={{ backgroundColor: 'rgba(233, 69, 96, 0.2)' }} />
          </div>
        )}

        {/* Completed Projects Section */}
        {completedProjects.length > 0 && (
          <div>
            <Collapsible open={expandedCompletedSection} onOpenChange={setExpandedCompletedSection}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between text-white border-slate-600 hover:bg-slate-900"
                >
                  <span className="text-lg font-serif font-bold">
                    Completed Projects ({completedProjects.length})
                  </span>
                  {expandedCompletedSection ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-6">
                <div className="space-y-4">
                  {completedProjects.map((project) => (
                    <Card
                      key={project.id}
                      className="cursor-pointer transition-all hover:shadow-lg hover:shadow-[#E94560]/20"
                      style={{
                        backgroundColor: '#16213E',
                        borderColor: 'rgba(233, 69, 96, 0.3)',
                      }}
                      onClick={() => setSelectedProjectId(project.id)}
                    >
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5" style={{ color: '#10B981' }} />
                          <div>
                            <h4 className="font-semibold text-white">{project.title}</h4>
                            <p
                              className="text-sm"
                              style={{ color: '#9CA3AF' }}
                            >
                              Completed {formatDate(project.actual_completion_date || '')}
                            </p>
                          </div>
                        </div>
                        {project.total_price && (
                          <p className="font-semibold text-white">
                            {formatCurrency(project.total_price)}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </div>
    </div>
  );
}
