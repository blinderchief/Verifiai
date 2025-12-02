'use client';

import { useState, useCallback } from 'react';
import {
  Shield,
  Brain,
  Users,
  Coins,
  Database,
  Gift,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
  BarChart3,
  RefreshCw,
  Loader2,
  Network,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn, formatAddress } from '@/lib/utils';
import { useProofs, useAgents, useSwarms, useSettlements, useRewards } from '@/lib/hooks';
import Link from 'next/link';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { proofs, loading: proofsLoading, refresh: refreshProofs } = useProofs();
  const { agents, loading: agentsLoading, refresh: refreshAgents } = useAgents();
  const { swarms, loading: swarmsLoading, refresh: refreshSwarms } = useSwarms();
  const { settlements, loading: settlementsLoading, refresh: refreshSettlements } = useSettlements();
  const { rewards, loading: rewardsLoading, refresh: refreshRewards } = useRewards();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isLoading = proofsLoading || agentsLoading || swarmsLoading || settlementsLoading || rewardsLoading;

  const handleRefreshAll = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshProofs(),
        refreshAgents(),
        refreshSwarms(),
        refreshSettlements(),
        refreshRewards(),
      ]);
      toast.success('Dashboard refreshed successfully');
    } catch (err) {
      toast.error('Failed to refresh some data');
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshProofs, refreshAgents, refreshSwarms, refreshSettlements, refreshRewards]);

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

  // Calculate stats
  const verifiedProofs = proofs.filter(p => p.status === 'verified').length;
  const pendingProofs = proofs.filter(p => p.status === 'pending').length;
  const activeAgents = agents.filter(a => a.status === 'running').length;
  const activeSwarms = swarms.filter(s => s.status === 'active').length;
  const totalSettlements = settlements.reduce((sum, s) => sum + (s.amount || 0), 0);
  const pendingSettlements = settlements.filter(s => s.status === 'pending_proof' || s.status === 'awaiting_parties');
  const totalRewards = rewards?.total || 0;
  const claimableRewards = rewards?.claimable || 0;

  const stats = [
    {
      name: 'Total Proofs',
      value: proofs.length.toLocaleString(),
      subtext: `${verifiedProofs} verified, ${pendingProofs} pending`,
      trend: 'up',
      change: '+12.5%',
      icon: Shield,
      color: 'from-blue-500 to-blue-600',
      href: '/dashboard/proofs',
    },
    {
      name: 'Active Agents',
      value: activeAgents.toString(),
      subtext: `${agents.length} total registered`,
      trend: 'up',
      change: `+${Math.max(0, activeAgents - Math.floor(agents.length * 0.7))}`,
      icon: Brain,
      color: 'from-purple-500 to-purple-600',
      href: '/dashboard/agents',
    },
    {
      name: 'Settlements',
      value: `$${(totalSettlements / 1000).toFixed(1)}K`,
      subtext: `${pendingSettlements.length} pending`,
      trend: 'up',
      change: '+28.3%',
      icon: Coins,
      color: 'from-emerald-500 to-emerald-600',
      href: '/dashboard/settlements',
    },
    {
      name: 'PHT Rewards',
      value: totalRewards.toLocaleString(),
      subtext: `${claimableRewards.toLocaleString()} claimable`,
      trend: 'up',
      change: '+8.1%',
      icon: Gift,
      color: 'from-orange-500 to-orange-600',
      href: '/dashboard/rewards',
    },
  ];

  // Get recent items
  const recentProofs = proofs.slice(0, 5);
  const topAgents = [...agents]
    .sort((a, b) => (b.proofsGenerated || 0) - (a.proofsGenerated || 0))
    .slice(0, 4);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-500/10 text-green-400 border-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/20"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'active':
        return <Badge className="bg-green-500/10 text-green-400 border-green-500/20"><Activity className="h-3 w-3 mr-1" />Active</Badge>;
      case 'running':
        return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Running</Badge>;
      case 'idle':
        return <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/20">Idle</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatTimeAgo = (date: string | Date) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitor your proofs, agents, and settlements in real-time.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleRefreshAll} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
            <Link href="/dashboard/proofs">
              <Zap className="mr-2 h-4 w-4" />
              Generate Proof
            </Link>
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && proofs.length === 0 && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.name} href={stat.href}>
            <Card className="relative overflow-hidden hover:border-primary/50 transition-all cursor-pointer group">
              <div className={cn(
                'absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-4 rounded-full bg-gradient-to-br opacity-20 blur-2xl group-hover:opacity-30 transition-opacity',
                stat.color
              )} />
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-white',
                    stat.color
                  )}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div className={cn(
                    'flex items-center gap-1 text-xs font-medium',
                    stat.trend === 'up' ? 'text-emerald-400' : 'text-red-400'
                  )}>
                    {stat.trend === 'up' ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {stat.change}
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.subtext}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Proofs - Takes 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Proofs</CardTitle>
              <CardDescription>
                Latest ZK proof generations and verifications
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/proofs">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentProofs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No proofs generated yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentProofs.map((proof) => (
                  <div
                    key={proof.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-lg',
                        proof.status === 'verified' ? 'bg-green-500/10' : 
                        proof.status === 'pending' ? 'bg-yellow-500/10' : 'bg-red-500/10'
                      )}>
                        <Shield className={cn(
                          'h-4 w-4',
                          proof.status === 'verified' ? 'text-green-400' : 
                          proof.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                        )} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{proof.model || 'AI Inference'}</p>
                          <Badge variant="outline" className="text-xs">{proof.type}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatAddress(proof.id)}</span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              copyToClipboard(proof.id, proof.id);
                            }}
                            className="hover:text-primary"
                          >
                            {copiedId === proof.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(proof.status)}
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(proof.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Agents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Top Agents</CardTitle>
              <CardDescription>
                Your most active AI agents
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/agents">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {topAgents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No agents registered yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="p-3 rounded-lg border bg-card/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Brain className={cn(
                          'h-4 w-4',
                          agent.status === 'running' ? 'text-green-400' : 'text-gray-400'
                        )} />
                        <span className="font-medium text-sm">{agent.name}</span>
                      </div>
                      {getStatusBadge(agent.status)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Proofs: {agent.proofsGenerated || 0}</span>
                        <span className="text-muted-foreground">Success: {agent.successRate || 0}%</span>
                      </div>
                      <Progress value={agent.successRate || 0} className="h-1" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Active Swarms */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Active Swarms</CardTitle>
              <CardDescription>
                Multi-agent coordination
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/swarms">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {swarms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Network className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No swarms created yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {swarms.slice(0, 3).map((swarm) => (
                  <div
                    key={swarm.id}
                    className="p-3 rounded-lg border bg-card/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{swarm.name}</span>
                      {getStatusBadge(swarm.status)}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{swarm.agents?.length || 0} agents</span>
                      <span>{swarm.tasksCompleted || 0} tasks</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Settlements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Pending Settlements</CardTitle>
              <CardDescription>
                Awaiting completion
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/settlements">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {pendingSettlements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Coins className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No pending settlements</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingSettlements.slice(0, 3).map((settlement) => (
                  <div
                    key={settlement.id}
                    className="p-3 rounded-lg border bg-card/50"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{formatAddress(settlement.id)}</span>
                      <span className="font-semibold text-green-400">
                        +{settlement.amount?.toLocaleString()} PHT
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{settlement.type}</span>
                      {getStatusBadge(settlement.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and operations
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button variant="outline" className="justify-start h-auto py-3" asChild>
              <Link href="/dashboard/proofs">
                <Shield className="mr-3 h-5 w-5 text-blue-400" />
                <div className="text-left">
                  <p className="font-medium">Generate Proof</p>
                  <p className="text-xs text-muted-foreground">Create a new ZK proof</p>
                </div>
              </Link>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3" asChild>
              <Link href="/dashboard/agents">
                <Brain className="mr-3 h-5 w-5 text-purple-400" />
                <div className="text-left">
                  <p className="font-medium">Register Agent</p>
                  <p className="text-xs text-muted-foreground">Add a new AI agent</p>
                </div>
              </Link>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3" asChild>
              <Link href="/dashboard/swarms">
                <Network className="mr-3 h-5 w-5 text-cyan-400" />
                <div className="text-left">
                  <p className="font-medium">Create Swarm</p>
                  <p className="text-xs text-muted-foreground">Coordinate multiple agents</p>
                </div>
              </Link>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3" asChild>
              <Link href="/dashboard/models">
                <Database className="mr-3 h-5 w-5 text-orange-400" />
                <div className="text-left">
                  <p className="font-medium">Upload Model</p>
                  <p className="text-xs text-muted-foreground">Add verifiable AI model</p>
                </div>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Network Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Network Status</CardTitle>
          <CardDescription>
            VerifiAI Protocol on Aptos Devnet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <Activity className="h-5 w-5 mx-auto mb-2 text-green-400" />
              <p className="text-lg font-bold">Online</p>
              <p className="text-xs text-muted-foreground">Network Status</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <Zap className="h-5 w-5 mx-auto mb-2 text-blue-400" />
              <p className="text-lg font-bold">&lt;1s</p>
              <p className="text-xs text-muted-foreground">Avg Proof Time</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <BarChart3 className="h-5 w-5 mx-auto mb-2 text-purple-400" />
              <p className="text-lg font-bold">99.9%</p>
              <p className="text-xs text-muted-foreground">Uptime</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <Users className="h-5 w-5 mx-auto mb-2 text-orange-400" />
              <p className="text-lg font-bold">{agents.length + swarms.length}</p>
              <p className="text-xs text-muted-foreground">Total Nodes</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
