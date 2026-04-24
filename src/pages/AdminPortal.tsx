import { useState } from 'react';
import {
  Users,
  FolderOpen,
  DollarSign,
  MessageSquare,
  CheckCircle2,
  Calendar,
  TrendingUp,
  Clock,
  ChevronRight,
  Search,
  Filter,
  MoreHorizontal,
  AlertCircle,
  CheckCheck,
  AlarmClock,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  mockClients,
  mockProjects,
  mockFollowUps,
  mockInvoices,
  getTodayFollowUps,
  getUpcomingFollowUps,
  getClientProjects,
  getClientInvoices,
} from '@/data/mock-portal-data';
import {
  formatDate,
  formatCurrency,
  getStatusConfig,
  getInvoiceStatusConfig,
  getCountdownColor,
  formatCountdown,
  getDaysRemaining,
} from '@/lib/portal-utils';
import type { Client, Project, FollowUp, Invoice } from '@/types/portal';

const AdminPortal = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [completedFollowUps, setCompletedFollowUps] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate dashboard stats
  const activeProjects = mockProjects.filter(
    (p) => p.status === 'in_progress' || p.status === 'review'
  ).length;
  const totalClients = mockClients.length;
  const pendingOnboarding = mockClients.filter((c) => !c.onboarding_completed).length;

  const revenuePaid = mockInvoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + i.amount, 0);
  const revenuePending = mockInvoices
    .filter((i) => i.status === 'sent' || i.status === 'draft')
    .reduce((sum, i) => sum + i.amount, 0);
  const overdueInvoices = mockInvoices.filter((i) => i.status === 'overdue').length;

  const unreadMessages = 2; // Mock value
  const todayFollowUps = getTodayFollowUps();
  const upcomingFollowUps = getUpcomingFollowUps();

  // Filter functions
  const filteredClients = mockClients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const filteredProjects = mockProjects.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mockClients
        .find((c) => c.id === p.client_id)
        ?.name.toLowerCase()
        .includes(searchQuery.toLowerCase()) === true
  );

  const filteredInvoices = mockInvoices.filter(
    (i) =>
      (i.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      mockClients
        .find((c) => c.id === i.client_id)
        ?.name.toLowerCase()
        .includes(searchQuery.toLowerCase()) === true
  );

  const handleCompleteFollowUp = (id: string) => {
    setCompletedFollowUps([...completedFollowUps, id]);
  };

  const getClientName = (clientId: string) => {
    return mockClients.find((c) => c.id === clientId)?.name || 'Unknown';
  };

  const getClientEmail = (clientId: string) => {
    return mockClients.find((c) => c.id === clientId)?.email || '';
  };

  const getProjectTitle = (projectId: string) => {
    return mockProjects.find((p) => p.id === projectId)?.title || 'N/A';
  };

  const getProjectCount = (clientId: string) => {
    return mockProjects.filter((p) => p.client_id === clientId).length;
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1A1A2E' }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: '#16213E' }}>
        <div className="container max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: '#fff' }}>
                Admin Portal
              </h1>
              <p style={{ color: '#B8B8CC' }} className="text-sm mt-2">
                Manage clients, projects, invoices, and follow-ups
              </p>
            </div>
            <Button
              variant="outline"
              style={{
                borderColor: '#E94560',
                color: '#E94560',
              }}
            >
              Generate Report
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList
            className="grid w-full grid-cols-5 mb-8"
            style={{ backgroundColor: '#16213E' }}
          >
            <TabsTrigger value="overview" style={{ color: '#B8B8CC' }}>
              Overview
            </TabsTrigger>
            <TabsTrigger value="clients" style={{ color: '#B8B8CC' }}>
              Clients
            </TabsTrigger>
            <TabsTrigger value="projects" style={{ color: '#B8B8CC' }}>
              Projects
            </TabsTrigger>
            <TabsTrigger value="followups" style={{ color: '#B8B8CC' }}>
              Follow-ups
            </TabsTrigger>
            <TabsTrigger value="invoices" style={{ color: '#B8B8CC' }}>
              Invoices
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Active Projects */}
              <Card style={{ backgroundColor: '#16213E', borderColor: '#E94560' }} className="border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: 'rgba(233, 69, 96, 0.1)' }}
                    >
                      <FolderOpen className="h-4 w-4" style={{ color: '#E94560' }} />
                    </div>
                  </div>
                  <p style={{ color: '#B8B8CC' }} className="text-sm mb-1">
                    Active Projects
                  </p>
                  <p className="text-2xl font-bold" style={{ color: '#fff' }}>
                    {activeProjects}
                  </p>
                </CardContent>
              </Card>

              {/* Total Clients */}
              <Card style={{ backgroundColor: '#16213E', borderColor: '#16213E' }} className="border">
                <CardContent className="p-4">
                  <div
                    className="p-2 rounded-lg mb-3"
                    style={{ backgroundColor: 'rgba(52, 152, 219, 0.1)' }}
                  >
                    <Users className="h-4 w-4" style={{ color: '#3498db' }} />
                  </div>
                  <p style={{ color: '#B8B8CC' }} className="text-sm mb-1">
                    Total Clients
                  </p>
                  <p className="text-2xl font-bold" style={{ color: '#fff' }}>
                    {totalClients}
                  </p>
                </CardContent>
              </Card>

              {/* Revenue Paid */}
              <Card style={{ backgroundColor: '#16213E', borderColor: '#16213E' }} className="border">
                <CardContent className="p-4">
                  <div
                    className="p-2 rounded-lg mb-3"
                    style={{ backgroundColor: 'rgba(46, 204, 113, 0.1)' }}
                  >
                    <DollarSign className="h-4 w-4" style={{ color: '#2ecc71' }} />
                  </div>
                  <p style={{ color: '#B8B8CC' }} className="text-sm mb-1">
                    Revenue Paid
                  </p>
                  <p className="text-2xl font-bold" style={{ color: '#fff' }}>
                    {formatCurrency(revenuePaid)}
                  </p>
                </CardContent>
              </Card>

              {/* Revenue Pending */}
              <Card style={{ backgroundColor: '#16213E', borderColor: '#16213E' }} className="border">
                <CardContent className="p-4">
                  <div
                    className="p-2 rounded-lg mb-3"
                    style={{ backgroundColor: 'rgba(241, 196, 15, 0.1)' }}
                  >
                    <Clock className="h-4 w-4" style={{ color: '#f1c40f' }} />
                  </div>
                  <p style={{ color: '#B8B8CC' }} className="text-sm mb-1">
                    Revenue Pending
                  </p>
                  <p className="text-2xl font-bold" style={{ color: '#fff' }}>
                    {formatCurrency(revenuePending)}
                  </p>
                </CardContent>
              </Card>

              {/* Pending Onboarding */}
              <Card style={{ backgroundColor: '#16213E', borderColor: '#16213E' }} className="border">
                <CardContent className="p-4">
                  <div
                    className="p-2 rounded-lg mb-3"
                    style={{ backgroundColor: 'rgba(231, 76, 60, 0.1)' }}
                  >
                    <AlertCircle className="h-4 w-4" style={{ color: '#e74c3c' }} />
                  </div>
                  <p style={{ color: '#B8B8CC' }} className="text-sm mb-1">
                    Pending Onboarding
                  </p>
                  <p className="text-2xl font-bold" style={{ color: '#fff' }}>
                    {pendingOnboarding}
                  </p>
                </CardContent>
              </Card>

              {/* Unread Messages */}
              <Card style={{ backgroundColor: '#16213E', borderColor: '#16213E' }} className="border">
                <CardContent className="p-4">
                  <div
                    className="p-2 rounded-lg mb-3"
                    style={{ backgroundColor: 'rgba(155, 89, 182, 0.1)' }}
                  >
                    <MessageSquare className="h-4 w-4" style={{ color: '#9b59b6' }} />
                  </div>
                  <p style={{ color: '#B8B8CC' }} className="text-sm mb-1">
                    Unread Messages
                  </p>
                  <p className="text-2xl font-bold" style={{ color: '#fff' }}>
                    {unreadMessages}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Today's Follow-ups */}
            <Card style={{ backgroundColor: '#16213E', borderColor: '#16213E' }} className="border">
              <CardHeader>
                <CardTitle style={{ color: '#fff' }} className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" style={{ color: '#E94560' }} />
                  Today's Follow-ups
                </CardTitle>
                <CardDescription style={{ color: '#B8B8CC' }}>
                  {todayFollowUps.length} reminders for today
                </CardDescription>
              </CardHeader>
              <CardContent>
                {todayFollowUps.length === 0 ? (
                  <p style={{ color: '#B8B8CC' }}>No follow-ups scheduled for today</p>
                ) : (
                  <div className="space-y-3">
                    {todayFollowUps.slice(0, 5).map((followUp) => (
                      <div
                        key={followUp.id}
                        className="flex items-start justify-between p-3 rounded-lg"
                        style={{ backgroundColor: 'rgba(233, 69, 96, 0.05)', borderColor: '#E94560' }}
                      >
                        <div className="flex-1">
                          <p style={{ color: '#fff' }} className="font-medium text-sm">
                            {followUp.message}
                          </p>
                          <p style={{ color: '#B8B8CC' }} className="text-xs mt-1">
                            {getClientName(followUp.client_id)} at {followUp.reminder_time}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCompleteFollowUp(followUp.id)}
                            disabled={completedFollowUps.includes(followUp.id)}
                          >
                            <CheckCheck className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <AlarmClock className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CLIENTS TAB */}
          <TabsContent value="clients" className="space-y-4">
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: '#B8B8CC' }} />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg"
                  style={{ backgroundColor: '#16213E', color: '#fff', borderColor: '#16213E' }}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-lg border overflow-x-auto" style={{ borderColor: '#16213E' }}>
              <Table>
                <TableHeader style={{ backgroundColor: '#16213E' }}>
                  <TableRow style={{ borderColor: '#16213E' }}>
                    <TableHead style={{ color: '#B8B8CC' }}>Name</TableHead>
                    <TableHead style={{ color: '#B8B8CC' }}>Business</TableHead>
                    <TableHead style={{ color: '#B8B8CC' }}>Email</TableHead>
                    <TableHead style={{ color: '#B8B8CC' }}>Onboarding</TableHead>
                    <TableHead style={{ color: '#B8B8CC' }}>Projects</TableHead>
                    <TableHead style={{ color: '#B8B8CC' }}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow
                      key={client.id}
                      style={{ borderColor: '#16213E', backgroundColor: '#1A1A2E' }}
                    >
                      <TableCell style={{ color: '#fff' }} className="font-medium">
                        {client.name}
                      </TableCell>
                      <TableCell style={{ color: '#B8B8CC' }}>
                        {client.business_name || '—'}
                      </TableCell>
                      <TableCell style={{ color: '#B8B8CC' }}>{client.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: client.onboarding_completed ? '#2ecc71' : '#e74c3c',
                            color: client.onboarding_completed ? '#2ecc71' : '#e74c3c',
                          }}
                        >
                          {client.onboarding_completed ? 'Complete' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell style={{ color: '#fff' }}>
                        {getProjectCount(client.id)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* PROJECTS TAB */}
          <TabsContent value="projects" className="space-y-4">
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: '#B8B8CC' }} />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg"
                  style={{ backgroundColor: '#16213E', color: '#fff', borderColor: '#16213E' }}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-lg border overflow-x-auto" style={{ borderColor: '#16213E' }}>
              <Table>
                <TableHeader style={{ backgroundColor: '#16213E' }}>
                  <TableRow style={{ borderColor: '#16213E' }}>
                    <TableHead style={{ color: '#B8B8CC' }}>Title</TableHead>
                    <TableHead style={{ color: '#B8B8CC' }}>Client</TableHead>
                    <TableHead style={{ color: '#B8B8CC' }}>Status</TableHead>
                    <TableHead style={{ color: '#B8B8CC' }}>Progress</TableHead>
                    <TableHead style={{ color: '#B8B8CC' }}>Deadline</TableHead>
                    <TableHead style={{ color: '#B8B8CC' }}>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((project) => {
                    const daysRemaining = getDaysRemaining(project.estimated_completion_date);
                    const statusConfig = getStatusConfig(project.status);
                    return (
                      <TableRow
                        key={project.id}
                        style={{ borderColor: '#16213E', backgroundColor: '#1A1A2E' }}
                      >
                        <TableCell style={{ color: '#fff' }} className="font-medium">
                          {project.title}
                        </TableCell>
                        <TableCell style={{ color: '#B8B8CC' }}>
                          {getClientName(project.client_id)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={statusConfig.className}
                            style={{
                              borderColor: '#16213E',
                            }}
                          >
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="w-24">
                            <Progress
                              value={project.progress_percentage}
                              className="h-2"
                            />
                            <p style={{ color: '#B8B8CC' }} className="text-xs mt-1">
                              {project.progress_percentage}%
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm ${getCountdownColor(daysRemaining)}`}>
                            {formatCountdown(daysRemaining)}
                          </span>
                        </TableCell>
                        <TableCell style={{ color: '#fff' }}>
                          {project.total_price
                            ? formatCurrency(project.total_price)
                            : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* FOLLOW-UPS TAB */}
          <TabsContent value="followups" className="space-y-6">
            {/* Today's Reminders */}
            <Card style={{ backgroundColor: '#16213E', borderColor: '#16213E' }} className="border">
              <CardHeader>
                <CardTitle style={{ color: '#fff' }} className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" style={{ color: '#E94560' }} />
                  Today's Reminders
                </CardTitle>
                <CardDescription style={{ color: '#B8B8CC' }}>
                  {todayFollowUps.length} follow-ups scheduled
                </CardDescription>
              </CardHeader>
              <CardContent>
                {todayFollowUps.length === 0 ? (
                  <p style={{ color: '#B8B8CC' }}>No follow-ups for today</p>
                ) : (
                  <div className="space-y-3">
                    {todayFollowUps.map((followUp) => (
                      <div
                        key={followUp.id}
                        className="flex items-start justify-between p-4 rounded-lg border"
                        style={{ backgroundColor: '#1A1A2E', borderColor: 'rgba(233, 69, 96, 0.3)' }}
                      >
                        <div className="flex-1">
                          <p style={{ color: '#fff' }} className="font-medium">
                            {followUp.message}
                          </p>
                          <p style={{ color: '#B8B8CC' }} className="text-sm mt-1">
                            {getClientName(followUp.client_id)}
                            {followUp.project_id && ` • ${getProjectTitle(followUp.project_id)}`}
                          </p>
                          <p style={{ color: '#B8B8CC' }} className="text-xs mt-1">
                            {followUp.reminder_time}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-3">
                          <Button
                            size="sm"
                            onClick={() => handleCompleteFollowUp(followUp.id)}
                            disabled={completedFollowUps.includes(followUp.id)}
                            style={{
                              backgroundColor: completedFollowUps.includes(followUp.id)
                                ? '#2ecc71'
                                : '#E94560',
                              color: '#fff',
                            }}
                          >
                            <CheckCheck className="h-4 w-4 mr-1" />
                            Complete
                          </Button>
                          <Button variant="outline" size="sm">
                            <AlarmClock className="h-4 w-4 mr-1" />
                            Snooze
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Reminders */}
            <Card style={{ backgroundColor: '#16213E', borderColor: '#16213E' }} className="border">
              <CardHeader>
                <CardTitle style={{ color: '#fff' }} className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" style={{ color: '#3498db' }} />
                  Upcoming Reminders
                </CardTitle>
                <CardDescription style={{ color: '#B8B8CC' }}>
                  {upcomingFollowUps.length} follow-ups scheduled
                </CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingFollowUps.length === 0 ? (
                  <p style={{ color: '#B8B8CC' }}>No upcoming follow-ups</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingFollowUps.map((followUp) => (
                      <div
                        key={followUp.id}
                        className="flex items-start justify-between p-4 rounded-lg border"
                        style={{ backgroundColor: '#1A1A2E', borderColor: '#16213E' }}
                      >
                        <div className="flex-1">
                          <p style={{ color: '#fff' }} className="font-medium">
                            {followUp.message}
                          </p>
                          <p style={{ color: '#B8B8CC' }} className="text-sm mt-1">
                            {getClientName(followUp.client_id)}
                            {followUp.project_id && ` • ${getProjectTitle(followUp.project_id)}`}
                          </p>
                          <p style={{ color: '#B8B8CC' }} className="text-xs mt-1">
                            {formatDate(followUp.reminder_date)} at {followUp.reminder_time}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: '#3498db',
                            color: '#3498db',
                          }}
                        >
                          {followUp.recurrence !== 'none' && `${followUp.recurrence}`}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* INVOICES TAB */}
          <TabsContent value="invoices" className="space-y-4">
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: '#B8B8CC' }} />
                <input
                  type="text"
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg"
                  style={{ backgroundColor: '#16213E', color: '#fff', borderColor: '#16213E' }}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-lg border overflow-x-auto" style={{ borderColor: '#16213E' }}>
              <Table>
                <TableHeader style={{ backgroundColor: '#16213E' }}>
                  <TableRow style={{ borderColor: '#16213E' }}>
                    <TableHead style={{ color: '#B8B8CC' }}>Invoice</TableHead>
                    <TableHead style={{ color: '#B8B8CC' }}>Client</TableHead>
                    <TableHead style={{ color: '#B8B8CC' }}>Amount</TableHead>
                    <TableHead style={{ color: '#B8B8CC' }}>Status</TableHead>
                    <TableHead style={{ color: '#B8B8CC' }}>Due Date</TableHead>
                    <TableHead style={{ color: '#B8B8CC' }}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => {
                    const statusConfig = getInvoiceStatusConfig(invoice.status);
                    const statusColors: Record<string, { bg: string; text: string }> = {
                      draft: { bg: '#16213E', text: '#B8B8CC' },
                      sent: { bg: 'rgba(52, 152, 219, 0.1)', text: '#3498db' },
                      paid: { bg: 'rgba(46, 204, 113, 0.1)', text: '#2ecc71' },
                      overdue: { bg: 'rgba(231, 76, 60, 0.1)', text: '#e74c3c' },
                    };
                    const colors = statusColors[invoice.status];

                    return (
                      <TableRow
                        key={invoice.id}
                        style={{ borderColor: '#16213E', backgroundColor: '#1A1A2E' }}
                      >
                        <TableCell style={{ color: '#fff' }} className="font-medium">
                          {invoice.id}
                        </TableCell>
                        <TableCell style={{ color: '#B8B8CC' }}>
                          {getClientName(invoice.client_id)}
                        </TableCell>
                        <TableCell style={{ color: '#fff' }} className="font-medium">
                          {formatCurrency(invoice.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            style={{
                              backgroundColor: colors.bg,
                              borderColor: colors.text,
                              color: colors.text,
                            }}
                          >
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell style={{ color: '#B8B8CC' }}>
                          {invoice.due_date ? formatDate(invoice.due_date) : '—'}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPortal;
