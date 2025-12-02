'use client';

import { useState } from 'react';
import {
  Gift,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  Coins,
  Zap,
  Trophy,
  Star,
  Target,
  BarChart3,
  Download,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// Mock rewards data
const rewardsHistory = [
  {
    id: 'reward_001',
    type: 'proof_generation',
    description: 'Proof Generation Reward',
    amount: 125,
    timestamp: '2024-01-15T14:32:00Z',
    status: 'claimed',
    proofId: 'proof_8x7k2m1',
  },
  {
    id: 'reward_002',
    type: 'agent_uptime',
    description: 'Agent Uptime Bonus',
    amount: 500,
    timestamp: '2024-01-15T12:00:00Z',
    status: 'claimed',
    agentId: 'agent_alpha_001',
  },
  {
    id: 'reward_003',
    type: 'swarm_consensus',
    description: 'Swarm Consensus Reward',
    amount: 250,
    timestamp: '2024-01-15T10:00:00Z',
    status: 'claimed',
    swarmId: 'swarm_trading_001',
  },
  {
    id: 'reward_004',
    type: 'settlement_completion',
    description: 'Settlement Completion Bonus',
    amount: 1000,
    timestamp: '2024-01-14T16:00:00Z',
    status: 'claimed',
    settlementId: 'stl_8x7k2m1',
  },
  {
    id: 'reward_005',
    type: 'proof_generation',
    description: 'Proof Generation Reward',
    amount: 125,
    timestamp: '2024-01-14T14:00:00Z',
    status: 'pending',
    proofId: 'proof_9m3n1k4',
  },
  {
    id: 'reward_006',
    type: 'daily_streak',
    description: 'Daily Activity Streak',
    amount: 200,
    timestamp: '2024-01-14T00:00:00Z',
    status: 'claimed',
  },
];

const milestones = [
  {
    id: 'milestone_001',
    name: 'Proof Pioneer',
    description: 'Generate your first 100 proofs',
    reward: 500,
    progress: 100,
    completed: true,
    icon: Zap,
  },
  {
    id: 'milestone_002',
    name: 'Agent Master',
    description: 'Deploy 5 agents',
    reward: 1000,
    progress: 100,
    completed: true,
    icon: Trophy,
  },
  {
    id: 'milestone_003',
    name: 'Swarm Coordinator',
    description: 'Create your first swarm',
    reward: 750,
    progress: 100,
    completed: true,
    icon: Star,
  },
  {
    id: 'milestone_004',
    name: 'Settlement Expert',
    description: 'Complete 10 settlements',
    reward: 2000,
    progress: 70,
    completed: false,
    icon: Target,
  },
  {
    id: 'milestone_005',
    name: 'Proof Thousand',
    description: 'Generate 1000 proofs',
    reward: 5000,
    progress: 45,
    completed: false,
    icon: BarChart3,
  },
];

const leaderboard = [
  { rank: 1, name: 'CryptoWhale.apt', earnings: 125430, proofs: 8921 },
  { rank: 2, name: 'AlphaTrader.apt', earnings: 98720, proofs: 7234 },
  { rank: 3, name: 'ZKMaster.apt', earnings: 87650, proofs: 6543 },
  { rank: 4, name: 'You', earnings: 45230, proofs: 4521, isUser: true },
  { rank: 5, name: 'ProofRunner.apt', earnings: 43210, proofs: 4321 },
];

export default function RewardsPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const totalEarnings = 45230;
  const availableToClaim = 2450;
  const pendingRewards = 125;
  const weeklyEarnings = 3250;

  const getRewardTypeIcon = (type: string) => {
    switch (type) {
      case 'proof_generation':
        return <Zap className="h-4 w-4 text-purple-500" />;
      case 'agent_uptime':
        return <Trophy className="h-4 w-4 text-blue-500" />;
      case 'swarm_consensus':
        return <Star className="h-4 w-4 text-orange-500" />;
      case 'settlement_completion':
        return <Coins className="h-4 w-4 text-emerald-500" />;
      case 'daily_streak':
        return <Target className="h-4 w-4 text-pink-500" />;
      default:
        return <Gift className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">PAT Rewards</h1>
          <p className="text-muted-foreground">
            Earn PAT tokens through Photon SDK integration
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export History
          </Button>
          <Button>
            <Wallet className="mr-2 h-4 w-4" />
            Claim All ({availableToClaim.toLocaleString()} PAT)
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-4 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 opacity-20 blur-2xl" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold">{totalEarnings.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">PAT tokens</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <Coins className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-4 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 opacity-20 blur-2xl" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available to Claim</p>
                <p className="text-2xl font-bold">{availableToClaim.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">PAT tokens</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                <Gift className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 opacity-20 blur-2xl" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{weeklyEarnings.toLocaleString()}</p>
                  <span className="text-xs text-emerald-500 flex items-center">
                    <ArrowUpRight className="h-3 w-3" />
                    +12%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">PAT tokens</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-4 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 opacity-20 blur-2xl" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Leaderboard Rank</p>
                <p className="text-2xl font-bold">#4</p>
                <p className="text-xs text-muted-foreground">Top 5%</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <Trophy className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Quick Claim Card */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
                    <Gift className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">
                      {availableToClaim.toLocaleString()} PAT Available
                    </h3>
                    <p className="text-muted-foreground">
                      Claim your rewards to your embedded wallet
                    </p>
                  </div>
                </div>
                <Button size="lg" className="md:w-auto w-full">
                  <Wallet className="mr-2 h-5 w-5" />
                  Claim Rewards
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Earnings Breakdown */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Earnings by Category</CardTitle>
                <CardDescription>
                  How you're earning PAT tokens
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Proof Generation', value: 15230, percentage: 34, color: 'bg-purple-500' },
                  { label: 'Agent Rewards', value: 12450, percentage: 27, color: 'bg-blue-500' },
                  { label: 'Settlement Bonuses', value: 10200, percentage: 23, color: 'bg-emerald-500' },
                  { label: 'Swarm Participation', value: 4850, percentage: 11, color: 'bg-orange-500' },
                  { label: 'Streaks & Bonuses', value: 2500, percentage: 5, color: 'bg-pink-500' },
                ].map((item) => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{item.label}</span>
                      <span className="font-medium">{item.value.toLocaleString()} PAT</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={item.percentage} className={cn('h-2', item.color)} />
                      <span className="text-xs text-muted-foreground w-10">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Rewards</CardTitle>
                <CardDescription>
                  Your latest earnings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rewardsHistory.slice(0, 5).map((reward) => (
                    <div
                      key={reward.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background">
                          {getRewardTypeIcon(reward.type)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{reward.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(reward.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-emerald-500">
                          +{reward.amount} PAT
                        </p>
                        {reward.status === 'pending' && (
                          <Badge variant="secondary" className="text-xs">
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Reward History</CardTitle>
              <CardDescription>
                Complete history of your PAT earnings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rewardsHistory.map((reward) => (
                  <div
                    key={reward.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                        {getRewardTypeIcon(reward.type)}
                      </div>
                      <div>
                        <p className="font-medium">{reward.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(reward.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold text-lg text-emerald-500">
                          +{reward.amount} PAT
                        </p>
                      </div>
                      <Badge
                        variant={reward.status === 'claimed' ? 'default' : 'secondary'}
                        className="w-20 justify-center"
                      >
                        {reward.status === 'claimed' ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Claimed
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milestones" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {milestones.map((milestone) => (
              <Card
                key={milestone.id}
                className={cn(
                  'relative overflow-hidden',
                  milestone.completed && 'border-emerald-500/50 bg-emerald-500/5'
                )}
              >
                {milestone.completed && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className={cn(
                        'flex h-14 w-14 items-center justify-center rounded-lg',
                        milestone.completed
                          ? 'bg-emerald-500/10'
                          : 'bg-muted'
                      )}
                    >
                      <milestone.icon
                        className={cn(
                          'h-7 w-7',
                          milestone.completed
                            ? 'text-emerald-500'
                            : 'text-muted-foreground'
                        )}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold">{milestone.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {milestone.description}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{milestone.progress}%</span>
                    </div>
                    <Progress value={milestone.progress} className="h-2" />
                  </div>
                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Reward</span>
                    <Badge variant={milestone.completed ? 'default' : 'secondary'}>
                      {milestone.reward.toLocaleString()} PAT
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Earners</CardTitle>
              <CardDescription>
                Weekly leaderboard rankings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboard.map((entry) => (
                  <div
                    key={entry.rank}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-lg',
                      entry.isUser
                        ? 'bg-primary/10 border border-primary/20'
                        : 'bg-muted/50'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-full font-bold',
                          entry.rank === 1 && 'bg-yellow-500 text-white',
                          entry.rank === 2 && 'bg-gray-400 text-white',
                          entry.rank === 3 && 'bg-orange-600 text-white',
                          entry.rank > 3 && 'bg-muted text-muted-foreground'
                        )}
                      >
                        {entry.rank}
                      </div>
                      <div>
                        <p className={cn('font-medium', entry.isUser && 'text-primary')}>
                          {entry.name}
                          {entry.isUser && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              You
                            </Badge>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {entry.proofs.toLocaleString()} proofs generated
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        {entry.earnings.toLocaleString()} PAT
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
