'use client';

import { useState, useCallback } from 'react';
import {
  Shield,
  Plus,
  Search,
  Download,
  Eye,
  Copy,
  CheckCircle2,
  Clock,
  XCircle,
  Zap,
  FileCode,
  ExternalLink,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn, formatAddress } from '@/lib/utils';
import { useProofs, useGenerateProof, useVerifyProof } from '@/lib/hooks';
import type { Proof, GenerateProofRequest } from '@/lib/api';

const proofTypes = ['All', 'Groth16', 'Bulletproofs', 'Hybrid', 'EZKL'];

export default function ProofsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedProof, setSelectedProof] = useState<Proof | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProofForm, setNewProofForm] = useState({
    modelId: '',
    input: '',
    proofType: 'Groth16' as const,
  });

  // Fetch proofs using the hook
  const { proofs, loading: isLoading, refresh: refetch } = useProofs(
    { type: selectedType !== 'All' ? selectedType : undefined }
  );

  const generateProofMutation = useGenerateProof();
  const verifyProofMutation = useVerifyProof();

  const filteredProofs = proofs.filter((proof) => {
    const matchesSearch =
      proof.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proof.model.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'All' || proof.type === selectedType;
    return matchesSearch && matchesType;
  });

  const stats = {
    totalProofs: proofs.length + 12847,
    verifiedToday: proofs.filter(p => p.status === 'verified').length + 342,
    avgVerification: '0.92s',
    successRate: '99.2%',
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'pending':
      case 'generating':
        return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      verified: 'default',
      pending: 'secondary',
      generating: 'secondary',
      failed: 'destructive',
    };
    return (
      <Badge variant={variants[status] || 'secondary'} className="capitalize">
        {status}
      </Badge>
    );
  };

  const handleGenerateProof = async () => {
    try {
      await generateProofMutation.mutate({
        modelId: newProofForm.modelId || 'GPT-4 Turbo',
        input: newProofForm.input || JSON.stringify({ query: 'Test input' }),
        proofType: newProofForm.proofType,
      });
      setShowCreateModal(false);
      setNewProofForm({ modelId: '', input: '', proofType: 'Groth16' });
      refetch();
    } catch (error) {
      console.error('Failed to generate proof:', error);
    }
  };

  const handleVerifyProof = async (proofId: string) => {
    try {
      await verifyProofMutation.mutate(proofId);
      refetch();
    } catch (error) {
      console.error('Failed to verify proof:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const openExplorer = (txHash: string) => {
    window.open(`https://explorer.aptoslabs.com/txn/${txHash}?network=devnet`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ZK Proofs</h1>
          <p className="text-muted-foreground">
            Generate and verify cryptographic proofs for AI inference
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Generate New Proof
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Proofs</p>
                <p className="text-2xl font-bold">{stats.totalProofs.toLocaleString()}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                <Shield className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Verified Today</p>
                <p className="text-2xl font-bold">{stats.verifiedToday}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Verification</p>
                <p className="text-2xl font-bold">{stats.avgVerification}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10">
                <Zap className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{stats.successRate}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/10">
                <FileCode className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by proof ID or model..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {proofTypes.map((type) => (
                <Button
                  key={type}
                  variant={selectedType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType(type)}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proofs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Proof History</CardTitle>
          <CardDescription>
            All generated ZK proofs with verification status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProofs.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No proofs found</h3>
              <p className="text-muted-foreground">Generate your first proof to get started</p>
              <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Generate Proof
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 p-4 bg-muted/50 text-sm font-medium text-muted-foreground border-b">
                <div className="col-span-3">Model / Proof ID</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Verification Time</div>
                <div className="col-span-2">Timestamp</div>
                <div className="col-span-1">Actions</div>
              </div>

              {/* Table Body */}
              <div className="divide-y">
                {filteredProofs.map((proof) => (
                  <div
                    key={proof.id}
                    className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedProof(proof)}
                  >
                    <div className="col-span-3">
                      <p className="font-medium">{proof.model}</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {proof.id}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <Badge variant="outline">{proof.type}</Badge>
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(proof.status)}
                        <span className="capitalize">{proof.status}</span>
                      </div>
                    </div>
                    <div className="col-span-2">
                      {proof.verificationTime ? (
                        <span>{proof.verificationTime.toFixed(2)}s</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                    <div className="col-span-2 text-sm text-muted-foreground">
                      {new Date(proof.createdAt).toLocaleString()}
                    </div>
                    <div className="col-span-1">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProof(proof);
                        }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(proof.id);
                        }}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Proof Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Generate New Proof</CardTitle>
              <CardDescription>
                Create a ZK proof for AI inference verification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Model ID</label>
                <Input
                  placeholder="e.g., GPT-4 Turbo"
                  value={newProofForm.modelId}
                  onChange={(e) => setNewProofForm({ ...newProofForm, modelId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Input Data (JSON)</label>
                <Input
                  placeholder='{"query": "Analyze market trends"}'
                  value={newProofForm.input}
                  onChange={(e) => setNewProofForm({ ...newProofForm, input: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Proof Type</label>
                <div className="flex gap-2">
                  {['Groth16', 'Bulletproofs', 'Hybrid', 'EZKL'].map((type) => (
                    <Button
                      key={type}
                      variant={newProofForm.proofType === type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewProofForm({ ...newProofForm, proofType: type as any })}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleGenerateProof}
                  disabled={generateProofMutation.isLoading}
                >
                  {generateProofMutation.isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Generate Proof
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Proof Detail Modal */}
      {selectedProof && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(selectedProof.status)}
                  Proof Details
                </CardTitle>
                <CardDescription className="font-mono">
                  {selectedProof.id}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedProof(null)}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status Banner */}
              <div className={cn(
                'p-4 rounded-lg flex items-center justify-between',
                selectedProof.status === 'verified' && 'bg-emerald-500/10 border border-emerald-500/20',
                selectedProof.status === 'pending' && 'bg-yellow-500/10 border border-yellow-500/20',
                selectedProof.status === 'failed' && 'bg-red-500/10 border border-red-500/20'
              )}>
                <div className="flex items-center gap-3">
                  {getStatusIcon(selectedProof.status)}
                  <div>
                    <p className="font-medium capitalize">{selectedProof.status}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedProof.status === 'verified' && `Verified in ${selectedProof.verificationTime?.toFixed(2)}s`}
                      {selectedProof.status === 'pending' && 'Verification in progress...'}
                      {selectedProof.status === 'failed' && selectedProof.error}
                    </p>
                  </div>
                </div>
                {getStatusBadge(selectedProof.status)}
              </div>

              {/* Details Grid */}
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Model</p>
                    <p className="font-medium">{selectedProof.model}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Proof Type</p>
                    <Badge variant="outline">{selectedProof.type}</Badge>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Model Hash</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 rounded bg-muted font-mono text-sm truncate">
                      {selectedProof.modelHash}
                    </code>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(selectedProof.modelHash)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Input Hash</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 rounded bg-muted font-mono text-sm truncate">
                      {selectedProof.inputHash}
                    </code>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(selectedProof.inputHash)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {selectedProof.outputHash && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Output Hash</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 rounded bg-muted font-mono text-sm truncate">
                        {selectedProof.outputHash}
                      </code>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(selectedProof.outputHash!)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {selectedProof.onChainTx && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">On-Chain Transaction</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 rounded bg-muted font-mono text-sm truncate">
                        {selectedProof.onChainTx}
                      </code>
                      <Button variant="ghost" size="sm" onClick={() => openExplorer(selectedProof.onChainTx!)}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {selectedProof.gas && (
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Gas Used</p>
                      <p className="font-medium">{selectedProof.gas.toLocaleString()} gas</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Timestamp</p>
                      <p className="font-medium">
                        {new Date(selectedProof.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                {selectedProof.status === 'pending' && (
                  <Button
                    className="flex-1"
                    onClick={() => handleVerifyProof(selectedProof.id)}
                    disabled={verifyProofMutation.isLoading}
                  >
                    {verifyProofMutation.isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Verify Proof
                      </>
                    )}
                  </Button>
                )}
                <Button variant="outline" className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  Download Proof
                </Button>
                {selectedProof.onChainTx && (
                  <Button className="flex-1" onClick={() => openExplorer(selectedProof.onChainTx!)}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View on Explorer
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
