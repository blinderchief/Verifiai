'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  ExternalLink,
  Coins,
  TrendingUp,
  Gift,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  type: 'earned' | 'claimed' | 'staked' | 'unstaked';
  amount: number;
  timestamp: Date;
  txHash?: string;
  description: string;
}

interface WalletState {
  address: string;
  balance: number;
  pendingRewards: number;
  stakedAmount: number;
  totalEarned: number;
  level: number;
  nextLevelProgress: number;
}

interface PhotonWalletProps {
  className?: string;
}

export function PhotonWallet({ className }: PhotonWalletProps) {
  const [wallet, setWallet] = React.useState<WalletState | null>(null);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isClaiming, setIsClaiming] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  React.useEffect(() => {
    // Simulate loading wallet data
    const loadWallet = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setWallet({
        address: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        balance: 2547.83,
        pendingRewards: 125.50,
        stakedAmount: 1000.00,
        totalEarned: 4523.17,
        level: 3,
        nextLevelProgress: 67,
      });

      setTransactions([
        {
          id: '1',
          type: 'earned',
          amount: 50.00,
          timestamp: new Date(Date.now() - 3600000),
          description: 'Proof verification reward',
          txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        },
        {
          id: '2',
          type: 'claimed',
          amount: 200.00,
          timestamp: new Date(Date.now() - 86400000),
          description: 'Weekly rewards claimed',
          txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        },
        {
          id: '3',
          type: 'staked',
          amount: 500.00,
          timestamp: new Date(Date.now() - 172800000),
          description: 'Staked for governance',
        },
        {
          id: '4',
          type: 'earned',
          amount: 25.50,
          timestamp: new Date(Date.now() - 259200000),
          description: 'Agent task completion',
        },
      ]);

      setIsLoading(false);
    };

    loadWallet();
  }, []);

  const handleClaim = async () => {
    if (!wallet || wallet.pendingRewards <= 0) return;

    setIsClaiming(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const claimedAmount = wallet.pendingRewards;
      setWallet(prev => prev ? {
        ...prev,
        balance: prev.balance + claimedAmount,
        pendingRewards: 0,
        totalEarned: prev.totalEarned + claimedAmount,
      } : null);

      setTransactions(prev => [{
        id: Date.now().toString(),
        type: 'claimed',
        amount: claimedAmount,
        timestamp: new Date(),
        description: 'Rewards claimed',
        txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      }, ...prev]);

      toast.success(`Successfully claimed ${claimedAmount.toFixed(2)} PAT tokens!`);
    } catch (error) {
      toast.error('Failed to claim rewards');
    } finally {
      setIsClaiming(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
    toast.success('Wallet data refreshed');
  };

  const copyAddress = () => {
    if (wallet) {
      navigator.clipboard.writeText(wallet.address);
      toast.success('Address copied to clipboard');
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'earned':
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case 'claimed':
        return <Gift className="h-4 w-4 text-primary" />;
      case 'staked':
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case 'unstaked':
        return <ArrowUpRight className="h-4 w-4 text-orange-500" />;
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!wallet) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center h-64 gap-4">
          <Wallet className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Failed to load wallet</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Wallet Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Photon Wallet</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <span className="font-mono">{formatAddress(wallet.address)}</span>
                <button onClick={copyAddress} className="text-muted-foreground hover:text-foreground">
                  <Copy className="h-3 w-3" />
                </button>
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-2xl font-bold">{wallet.balance.toLocaleString()} PAT</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Pending Rewards</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-green-500">+{wallet.pendingRewards.toLocaleString()} PAT</p>
                <Button 
                  size="sm" 
                  onClick={handleClaim}
                  disabled={wallet.pendingRewards <= 0 || isClaiming}
                >
                  {isClaiming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Claim'
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Staked Amount</p>
              <p className="text-2xl font-bold">{wallet.stakedAmount.toLocaleString()} PAT</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Earned</p>
              <p className="text-2xl font-bold">{wallet.totalEarned.toLocaleString()} PAT</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Level Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Verification Level</CardTitle>
              <CardDescription>Complete more verifications to level up</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-primary to-purple-500 flex items-center justify-center text-white font-bold">
                {wallet.level}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Level {wallet.level}</span>
              <span>Level {wallet.level + 1}</span>
            </div>
            <Progress value={wallet.nextLevelProgress} />
            <p className="text-xs text-muted-foreground text-center">
              {wallet.nextLevelProgress}% to next level
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction History</CardTitle>
          <CardDescription>Recent PAT token transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-background">
                    {getTransactionIcon(tx.type)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.timestamp.toLocaleDateString()} at {tx.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    'font-semibold',
                    tx.type === 'earned' || tx.type === 'claimed' ? 'text-green-500' : ''
                  )}>
                    {tx.type === 'earned' || tx.type === 'claimed' ? '+' : '-'}
                    {tx.amount.toFixed(2)} PAT
                  </p>
                  {tx.txHash && (
                    <a 
                      href={`https://explorer.aptoslabs.com/txn/${tx.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 justify-end"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
