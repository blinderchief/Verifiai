'use client';

import { useState, useCallback } from 'react';
import { useAgents } from '@/lib/hooks';
import { api } from '@/lib/api';
import { formatAddress } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bot,
  Plus,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  Brain,
  Activity,
  Power,
  PowerOff,
  Settings,
  Trash2,
  ExternalLink,
  Shield,
  Zap,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';

type AgentType = 'inference' | 'validation' | 'aggregation' | 'specialized';
type AgentStatus = 'running' | 'idle' | 'paused' | 'error';

interface CreateAgentForm {
  name: string;
  type: AgentType;
  description: string;
  modelId: string;
  capabilities: string[];
}

export default function AgentsPage() {
  const { agents, loading, error, refresh } = useAgents();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateAgentForm>({
    name: '',
    type: 'inference',
    description: '',
    modelId: 'gpt-4-turbo',
    capabilities: ['inference', 'analysis'],
  });
  const [togglingAgents, setTogglingAgents] = useState<Set<string>>(new Set());

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refresh();
      toast.success('Agents refreshed successfully');
    } catch (err) {
      toast.error('Failed to refresh agents');
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  }, []);

  const handleCreateAgent = async () => {
    if (!createForm.name.trim()) {
      toast.error('Agent name is required');
      return;
    }

    if (createForm.capabilities.length === 0) {
      toast.error('Select at least one capability');
      return;
    }

    setIsCreating(true);
    try {
      const newAgent = await api.createAgent({
        name: createForm.name,
        type: createForm.type,
        description: createForm.description,
        modelId: createForm.modelId,
        capabilities: createForm.capabilities,
      });

      if (newAgent && newAgent.id) {
        toast.success('Agent created successfully!');
        setIsCreateModalOpen(false);
        setCreateForm({
          name: '',
          type: 'inference',
          description: '',
          modelId: 'gpt-4-turbo',
          capabilities: ['inference', 'analysis'],
        });
        await refresh();
      } else {
        toast.error('Failed to create agent');
      }
    } catch (err) {
      toast.error('Error creating agent');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleAgent = async (agentId: string, currentStatus: AgentStatus) => {
    setTogglingAgents(prev => new Set(prev).add(agentId));
    try {
      // Map running/idle to active/inactive for API
      const newApiStatus = currentStatus === 'running' ? 'inactive' : 'active';
      const result = await api.updateAgentStatus(agentId, newApiStatus);
      
      if (result.success) {
        toast.success(`Agent ${newApiStatus === 'active' ? 'started' : 'stopped'} successfully`);
        await refresh();
      } else {
        toast.error(result.error || 'Failed to update agent status');
      }
    } catch (err) {
      toast.error('Error updating agent status');
    } finally {
      setTogglingAgents(prev => {
        const next = new Set(prev);
        next.delete(agentId);
        return next;
      });
    }
  };

  // Filter agents
  const filteredAgents = agents.filter(agent => {
    if (statusFilter !== 'all' && agent.status !== statusFilter) return false;
    if (typeFilter !== 'all' && agent.type !== typeFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        agent.name.toLowerCase().includes(query) ||
        agent.id.toLowerCase().includes(query) ||
        agent.type.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getStatusBadge = (status: AgentStatus) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-green-500/10 text-green-400 border-green-500/20">Running</Badge>;
      case 'idle':
        return <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/20">Idle</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Paused</Badge>;
      case 'error':
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Error</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: AgentType) => {
    switch (type) {
      case 'inference':
        return <Badge variant="outline" className="border-blue-500/50 text-blue-400"><Brain className="h-3 w-3 mr-1" />Inference</Badge>;
      case 'validation':
        return <Badge variant="outline" className="border-purple-500/50 text-purple-400"><Shield className="h-3 w-3 mr-1" />Validation</Badge>;
      case 'aggregation':
        return <Badge variant="outline" className="border-cyan-500/50 text-cyan-400"><Zap className="h-3 w-3 mr-1" />Aggregation</Badge>;
      case 'specialized':
        return <Badge variant="outline" className="border-orange-500/50 text-orange-400"><Star className="h-3 w-3 mr-1" />Specialized</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Calculate stats
  const stats = {
    total: agents.length,
    active: agents.filter(a => a.status === 'running').length,
    totalProofs: agents.reduce((sum, a) => sum + (a.proofsGenerated || 0), 0),
    avgSuccessRate: agents.length > 0 
      ? Math.round(agents.reduce((sum, a) => sum + (a.successRate || 0), 0) / agents.length) 
      : 0,
  };

  if (loading && agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            AI Agents
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor your decentralized AI agents
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
                <Plus className="h-4 w-4 mr-2" />
                Register Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Register New Agent</DialogTitle>
                <DialogDescription>
                  Register a new AI agent on the VerifiAI network. Agents require staking PHOTON tokens.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Agent Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter agent name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Agent Type</Label>
                  <Select
                    value={createForm.type}
                    onValueChange={(value: AgentType) => setCreateForm(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select agent type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inference">Inference Agent</SelectItem>
                      <SelectItem value="validation">Validation Agent</SelectItem>
                      <SelectItem value="aggregation">Aggregation Agent</SelectItem>
                      <SelectItem value="specialized">Specialized Agent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Base Model</Label>
                  <Select
                    value={createForm.modelId}
                    onValueChange={(value) => setCreateForm(prev => ({ ...prev, modelId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select base model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                      <SelectItem value="claude-3">Claude 3</SelectItem>
                      <SelectItem value="llama-2-70b">Llama 2 70B</SelectItem>
                      <SelectItem value="mistral-7b">Mistral 7B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Describe your agent's capabilities"
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Capabilities</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {['inference', 'analysis', 'validation', 'aggregation', 'reasoning', 'code-generation'].map((cap) => (
                      <label key={cap} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={createForm.capabilities.includes(cap)}
                          onChange={(e) => {
                            setCreateForm(prev => ({
                              ...prev,
                              capabilities: e.target.checked
                                ? [...prev.capabilities, cap]
                                : prev.capabilities.filter(c => c !== cap)
                            }));
                          }}
                          className="rounded border-gray-600 bg-gray-800"
                        />
                        {cap.charAt(0).toUpperCase() + cap.slice(1).replace('-', ' ')}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select the capabilities this agent will provide
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateAgent} disabled={isCreating}>
                  {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Register Agent
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Bot className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Agents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Activity className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Active Agents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Zap className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalProofs.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Proofs Generated</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <Star className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgSuccessRate}%</p>
                <p className="text-sm text-muted-foreground">Avg Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search agents by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="idle">Idle</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="inference">Inference</SelectItem>
                <SelectItem value="validation">Validation</SelectItem>
                <SelectItem value="aggregation">Aggregation</SelectItem>
                <SelectItem value="specialized">Specialized</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardContent className="p-4">
            <p className="text-red-400">Error loading agents: {error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={handleRefresh}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAgents.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center">
              <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'No agents match your filters'
                  : 'No agents registered yet. Create your first agent!'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAgents.map((agent) => (
            <Card 
              key={agent.id} 
              className="group hover:border-primary/50 transition-all duration-200 overflow-hidden"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      agent.status === 'running' 
                        ? 'bg-green-500/20' 
                        : 'bg-gray-500/20'
                    }`}>
                      <Bot className={`h-5 w-5 ${
                        agent.status === 'running' 
                          ? 'text-green-400' 
                          : 'text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>{formatAddress(agent.id)}</span>
                        <button
                          onClick={() => copyToClipboard(agent.id, agent.id)}
                          className="p-0.5 hover:text-primary transition-colors"
                        >
                          {copiedId === agent.id ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(agent.status as AgentStatus)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  {getTypeBadge(agent.type as AgentType)}
                  {agent.model && (
                    <Badge variant="secondary" className="text-xs">
                      {agent.model}
                    </Badge>
                  )}
                </div>

                {agent.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {agent.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-muted-foreground text-xs">Proofs</p>
                    <p className="font-semibold">{agent.proofsGenerated?.toLocaleString() || 0}</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-muted-foreground text-xs">Success Rate</p>
                    <p className="font-semibold">{agent.successRate || 0}%</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-muted-foreground text-xs">Avg Response</p>
                    <p className="font-semibold">{agent.avgResponseTime || 0}ms</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-muted-foreground text-xs">Earnings</p>
                    <p className="font-semibold">{agent.earnings?.toLocaleString() || 0} PHT</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleToggleAgent(agent.id, agent.status as AgentStatus)}
                    disabled={togglingAgents.has(agent.id) || agent.status === 'error'}
                  >
                    {togglingAgents.has(agent.id) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : agent.status === 'running' ? (
                      <>
                        <PowerOff className="h-4 w-4 mr-1" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Power className="h-4 w-4 mr-1" />
                        Start
                      </>
                    )}
                  </Button>
                  <Button size="sm" variant="outline">
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
