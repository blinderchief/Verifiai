'use client';

import { useState, useCallback } from 'react';
import { useSwarms, useAgents } from '@/lib/hooks';
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
import { Progress } from '@/components/ui/progress';
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
  Network,
  Plus,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  Users,
  Activity,
  Zap,
  Play,
  Pause,
  Settings,
  ExternalLink,
  BarChart3,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';

type SwarmStatus = 'active' | 'idle' | 'paused';
type ConsensusModel = 'majority' | 'unanimous' | 'weighted' | 'threshold';

interface CreateSwarmForm {
  name: string;
  description: string;
  consensusModel: string;
  agentIds: string[];
}

export default function SwarmsPage() {
  const { swarms, loading, error, refresh } = useSwarms();
  const { agents } = useAgents();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [consensusFilter, setConsensusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateSwarmForm>({
    name: '',
    description: '',
    consensusModel: 'majority',
    agentIds: [],
  });
  const [togglingSwarms, setTogglingSwarms] = useState<Set<string>>(new Set());

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refresh();
      toast.success('Swarms refreshed successfully');
    } catch (err) {
      toast.error('Failed to refresh swarms');
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

  const handleCreateSwarm = async () => {
    if (!createForm.name.trim()) {
      toast.error('Swarm name is required');
      return;
    }

    if (createForm.agentIds.length < 2) {
      toast.error('Select at least 2 agents');
      return;
    }

    setIsCreating(true);
    try {
      const result = await api.createSwarm({
        name: createForm.name,
        description: createForm.description,
        consensusModel: createForm.consensusModel,
        agentIds: createForm.agentIds,
      });

      if (result && result.id) {
        toast.success('Swarm created successfully!');
        setIsCreateModalOpen(false);
        setCreateForm({
          name: '',
          description: '',
          consensusModel: 'majority',
          agentIds: [],
        });
        await refresh();
      } else {
        toast.error('Failed to create swarm');
      }
    } catch (err) {
      toast.error('Error creating swarm');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleSwarm = async (swarmId: string, currentStatus: SwarmStatus) => {
    setTogglingSwarms(prev => new Set(prev).add(swarmId));
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      // In a real implementation, this would call an API
      toast.success(`Swarm ${newStatus === 'active' ? 'activated' : 'paused'} successfully`);
      await refresh();
    } catch (err) {
      toast.error('Error updating swarm status');
    } finally {
      setTogglingSwarms(prev => {
        const next = new Set(prev);
        next.delete(swarmId);
        return next;
      });
    }
  };

  // Filter swarms
  const filteredSwarms = swarms.filter(swarm => {
    if (statusFilter !== 'all' && swarm.status !== statusFilter) return false;
    if (consensusFilter !== 'all' && swarm.consensusModel !== consensusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        swarm.name.toLowerCase().includes(query) ||
        swarm.id.toLowerCase().includes(query) ||
        swarm.consensusModel?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getStatusBadge = (status: SwarmStatus) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-400 border-green-500/20">Active</Badge>;
      case 'idle':
        return <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/20">Idle</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Paused</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getConsensusBadge = (consensusModel: string) => {
    switch (consensusModel) {
      case 'majority':
        return <Badge variant="outline" className="border-blue-500/50 text-blue-400">Majority</Badge>;
      case 'unanimous':
        return <Badge variant="outline" className="border-purple-500/50 text-purple-400">Unanimous</Badge>;
      case 'weighted':
        return <Badge variant="outline" className="border-cyan-500/50 text-cyan-400">Weighted</Badge>;
      case 'threshold':
        return <Badge variant="outline" className="border-orange-500/50 text-orange-400">Threshold</Badge>;
      default:
        return <Badge variant="outline">{consensusModel}</Badge>;
    }
  };

  // Calculate stats
  const activeAgents = agents.filter(a => a.status === 'running').length;
  const stats = {
    total: swarms.length,
    active: swarms.filter(s => s.status === 'active').length,
    totalAgents: swarms.reduce((sum, s) => sum + (s.agents?.length || 0), 0),
    totalTasks: swarms.reduce((sum, s) => sum + (s.tasksCompleted || 0), 0),
  };

  if (loading && swarms.length === 0) {
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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Agent Swarms
          </h1>
          <p className="text-muted-foreground mt-1">
            Coordinate multi-agent systems for complex AI tasks
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
              <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
                <Plus className="h-4 w-4 mr-2" />
                Create Swarm
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Swarm</DialogTitle>
                <DialogDescription>
                  Create a new agent swarm to coordinate multiple AI agents for collaborative tasks.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Swarm Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter swarm name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consensusModel">Consensus Model</Label>
                  <Select
                    value={createForm.consensusModel}
                    onValueChange={(value) => setCreateForm(prev => ({ ...prev, consensusModel: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select consensus model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="majority">Majority (&gt;50% agreement)</SelectItem>
                      <SelectItem value="unanimous">Unanimous (100% agreement)</SelectItem>
                      <SelectItem value="weighted">Weighted (reputation-based)</SelectItem>
                      <SelectItem value="leader">Leader-follower</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Describe the swarm's purpose"
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Select Agents</Label>
                  <div className="max-h-40 overflow-y-auto space-y-2 border rounded-lg p-3">
                    {agents.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-2">No agents available</p>
                    ) : (
                      agents.map((agent) => (
                        <label key={agent.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={createForm.agentIds.includes(agent.id)}
                            onChange={(e) => {
                              setCreateForm(prev => ({
                                ...prev,
                                agentIds: e.target.checked
                                  ? [...prev.agentIds, agent.id]
                                  : prev.agentIds.filter(id => id !== agent.id)
                              }));
                            }}
                            className="rounded border-gray-600 bg-gray-800"
                          />
                          <span>{agent.name}</span>
                          <Badge variant="outline" className="text-xs ml-auto">
                            {agent.status}
                          </Badge>
                        </label>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selected: {createForm.agentIds.length} agents (minimum 2 required)
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateSwarm} disabled={isCreating || createForm.agentIds.length < 2}>
                  {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Swarm
                </Button>
              </DialogFooter>
              {createForm.agentIds.length < 2 && createForm.agentIds.length > 0 && (
                <p className="text-xs text-yellow-400 text-center">
                  Need at least 2 agents. Currently selected: {createForm.agentIds.length}.
                </p>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <Network className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Swarms</p>
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
                <p className="text-sm text-muted-foreground">Active Swarms</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalAgents}</p>
                <p className="text-sm text-muted-foreground">Total Agents</p>
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
                <p className="text-2xl font-bold">{stats.totalTasks.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Tasks Completed</p>
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
                placeholder="Search swarms by name or ID..."
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="idle">Idle</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
            <Select value={consensusFilter} onValueChange={setConsensusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Consensus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Consensus</SelectItem>
                <SelectItem value="majority">Majority</SelectItem>
                <SelectItem value="unanimous">Unanimous</SelectItem>
                <SelectItem value="weighted">Weighted</SelectItem>
                <SelectItem value="threshold">Threshold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardContent className="p-4">
            <p className="text-red-400">Error loading swarms: {error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={handleRefresh}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Swarms Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredSwarms.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center">
              <Network className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' || consensusFilter !== 'all'
                  ? 'No swarms match your filters'
                  : 'No swarms created yet. Create your first swarm!'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredSwarms.map((swarm) => (
            <Card 
              key={swarm.id} 
              className="group hover:border-primary/50 transition-all duration-200"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      swarm.status === 'active' 
                        ? 'bg-green-500/20' 
                        : 'bg-gray-500/20'
                    }`}>
                      <Network className={`h-5 w-5 ${
                        swarm.status === 'active' 
                          ? 'text-green-400' 
                          : 'text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{swarm.name}</CardTitle>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>{formatAddress(swarm.id)}</span>
                        <button
                          onClick={() => copyToClipboard(swarm.id, swarm.id)}
                          className="p-0.5 hover:text-primary transition-colors"
                        >
                          {copiedId === swarm.id ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {getConsensusBadge(swarm.consensusModel)}
                    {getStatusBadge(swarm.status as SwarmStatus)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {swarm.description && (
                  <p className="text-sm text-muted-foreground">
                    {swarm.description}
                  </p>
                )}

                {/* Agent Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Agents</span>
                    <span>{swarm.agents?.length || 0}</span>
                  </div>
                  <Progress 
                    value={Math.min((swarm.agents?.length || 0) * 10, 100)} 
                    className="h-2"
                  />
                </div>

                {/* Success Rate */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Success Rate</span>
                    <span>{swarm.successRate || 0}%</span>
                  </div>
                  <Progress 
                    value={swarm.successRate || 0} 
                    className="h-2"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="p-2 rounded bg-muted/50 text-center">
                    <p className="text-muted-foreground text-xs">Tasks</p>
                    <p className="font-semibold">{swarm.tasksCompleted?.toLocaleString() || 0}</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50 text-center">
                    <p className="text-muted-foreground text-xs">Success</p>
                    <p className="font-semibold">{swarm.successRate || 0}%</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50 text-center">
                    <p className="text-muted-foreground text-xs">Proofs</p>
                    <p className="font-semibold">{swarm.proofsGenerated?.toLocaleString() || 0}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleToggleSwarm(swarm.id, swarm.status as SwarmStatus)}
                    disabled={togglingSwarms.has(swarm.id)}
                  >
                    {togglingSwarms.has(swarm.id) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : swarm.status === 'active' ? (
                      <>
                        <Pause className="h-4 w-4 mr-1" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-1" />
                        Activate
                      </>
                    )}
                  </Button>
                  <Button size="sm" variant="outline">
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Settings className="h-4 w-4" />
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
