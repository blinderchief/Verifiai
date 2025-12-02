'use client';

import { useState, useCallback } from 'react';
import { useSettlements } from '@/lib/hooks';
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
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Wallet,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Receipt,
  ExternalLink,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';

type SettlementStatus = 'pending_proof' | 'awaiting_parties' | 'verified' | 'completed' | 'failed';
type SettlementType = 'reward' | 'stake' | 'withdrawal' | 'payment';

export default function SettlementsPage() {
  const { settlements, loading, error, refresh } = useSettlements();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingClaims, setProcessingClaims] = useState<Set<string>>(new Set());

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refresh();
      toast.success('Settlements refreshed successfully');
    } catch (err) {
      toast.error('Failed to refresh settlements');
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

  const handleClaimReward = async (settlementId: string) => {
    setProcessingClaims(prev => new Set(prev).add(settlementId));
    try {
      // In a real implementation, this would call the API
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      toast.success('Reward claimed successfully!');
      await refresh();
    } catch (err) {
      toast.error('Failed to claim reward');
    } finally {
      setProcessingClaims(prev => {
        const next = new Set(prev);
        next.delete(settlementId);
        return next;
      });
    }
  };

  // Filter settlements
  const filteredSettlements = settlements.filter(settlement => {
    if (statusFilter !== 'all' && settlement.status !== statusFilter) return false;
    if (typeFilter !== 'all' && settlement.type !== typeFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        settlement.id.toLowerCase().includes(query) ||
        settlement.title?.toLowerCase().includes(query) ||
        settlement.type.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getStatusBadge = (status: SettlementStatus) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-400 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'verified':
        return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'pending_proof':
        return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20"><Clock className="h-3 w-3 mr-1" />Pending Proof</Badge>;
      case 'awaiting_parties':
        return <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Awaiting Parties</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/20"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: SettlementType) => {
    switch (type) {
      case 'reward':
        return <Badge variant="outline" className="border-green-500/50 text-green-400"><ArrowDownLeft className="h-3 w-3 mr-1" />Reward</Badge>;
      case 'stake':
        return <Badge variant="outline" className="border-blue-500/50 text-blue-400"><ArrowUpRight className="h-3 w-3 mr-1" />Stake</Badge>;
      case 'withdrawal':
        return <Badge variant="outline" className="border-orange-500/50 text-orange-400"><ArrowUpRight className="h-3 w-3 mr-1" />Withdrawal</Badge>;
      case 'payment':
        return <Badge variant="outline" className="border-purple-500/50 text-purple-400"><Receipt className="h-3 w-3 mr-1" />Payment</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Calculate stats
  const stats = {
    total: settlements.length,
    pending: settlements.filter(s => s.status === 'pending_proof' || s.status === 'awaiting_parties').length,
    totalAmount: settlements.reduce((sum, s) => sum + (s.amount || 0), 0),
    pendingAmount: settlements.filter(s => s.status === 'pending_proof' || s.status === 'awaiting_parties').reduce((sum, s) => sum + (s.amount || 0), 0),
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && settlements.length === 0) {
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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            Settlements
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage your on-chain payment settlements
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Receipt className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Settlements</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/20">
                <Clock className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <DollarSign className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalAmount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total PHT</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <TrendingUp className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingAmount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Pending PHT</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID or transaction hash..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="pending_proof">Pending Proof</SelectItem>
                <SelectItem value="awaiting_parties">Awaiting Parties</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="reward">Reward</SelectItem>
                <SelectItem value="stake">Stake</SelectItem>
                <SelectItem value="withdrawal">Withdrawal</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardContent className="p-4">
            <p className="text-red-400">Error loading settlements: {error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={handleRefresh}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Settlements Table */}
      <Card>
        <CardContent className="p-0">
          {filteredSettlements.length === 0 ? (
            <div className="p-8 text-center">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'No settlements match your filters'
                  : 'No settlements yet'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSettlements.map((settlement) => (
                  <TableRow key={settlement.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-sm">{formatAddress(settlement.id)}</span>
                        <button
                          onClick={() => copyToClipboard(settlement.id, `id-${settlement.id}`)}
                          className="p-0.5 hover:text-primary transition-colors"
                        >
                          {copiedId === `id-${settlement.id}` ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(settlement.type as SettlementType)}</TableCell>
                    <TableCell>
                      <span className={`font-semibold ${
                        settlement.type === 'reward' ? 'text-green-400' : 
                        settlement.type === 'withdrawal' ? 'text-orange-400' : ''
                      }`}>
                        {settlement.type === 'withdrawal' ? '-' : '+'}
                        {settlement.amount?.toLocaleString() || 0} PHT
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(settlement.status as SettlementStatus)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(settlement.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full" 
                            style={{ width: `${settlement.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{settlement.progress || 0}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {(settlement.status === 'pending_proof' || settlement.status === 'awaiting_parties') && settlement.type === 'reward' && (
                        <Button
                          size="sm"
                          onClick={() => handleClaimReward(settlement.id)}
                          disabled={processingClaims.has(settlement.id)}
                        >
                          {processingClaims.has(settlement.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Claim'
                          )}
                        </Button>
                      )}
                      {settlement.status === 'failed' && (
                        <Button size="sm" variant="outline">
                          Retry
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
