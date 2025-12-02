'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Network,
  Bot,
  X,
  Plus,
  Loader2,
  CheckCircle,
  Users,
  Zap,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline';
  capabilities: string[];
}

interface SwarmFormData {
  name: string;
  description: string;
  coordinationType: 'parallel' | 'sequential' | 'hierarchical' | 'consensus';
  agentIds: string[];
  taskType: string;
  consensusThreshold?: number;
}

interface SwarmCreationFormProps {
  onSubmit: (data: SwarmFormData) => Promise<void>;
  onCancel?: () => void;
  className?: string;
}

const coordinationTypes = [
  {
    value: 'parallel',
    label: 'Parallel Execution',
    description: 'All agents work simultaneously',
    icon: Zap,
  },
  {
    value: 'sequential',
    label: 'Sequential Pipeline',
    description: 'Agents work in order',
    icon: Network,
  },
  {
    value: 'hierarchical',
    label: 'Hierarchical',
    description: 'Coordinator manages sub-agents',
    icon: Users,
  },
  {
    value: 'consensus',
    label: 'Consensus-based',
    description: 'Agents vote on results',
    icon: Shield,
  },
];

const taskTypes = [
  { value: 'inference', label: 'AI Inference' },
  { value: 'verification', label: 'Proof Verification' },
  { value: 'settlement', label: 'RWA Settlement' },
  { value: 'analysis', label: 'Data Analysis' },
  { value: 'custom', label: 'Custom Task' },
];

// Mock available agents
const mockAgents: Agent[] = [
  { id: '1', name: 'GPT-4 Inference', type: 'inference', status: 'online', capabilities: ['text-generation', 'reasoning'] },
  { id: '2', name: 'Claude Analyzer', type: 'inference', status: 'online', capabilities: ['analysis', 'classification'] },
  { id: '3', name: 'Proof Verifier', type: 'verification', status: 'online', capabilities: ['proof-verification', 'zk-proofs'] },
  { id: '4', name: 'Settlement Bot', type: 'settlement', status: 'offline', capabilities: ['settlement-execution', 'escrow'] },
  { id: '5', name: 'Coordinator Alpha', type: 'coordinator', status: 'online', capabilities: ['swarm-coordination', 'task-distribution'] },
  { id: '6', name: 'Data Aggregator', type: 'inference', status: 'online', capabilities: ['data-aggregation', 'summarization'] },
];

export function SwarmCreationForm({
  onSubmit,
  onCancel,
  className,
}: SwarmCreationFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState<SwarmFormData>({
    name: '',
    description: '',
    coordinationType: 'parallel',
    agentIds: [],
    taskType: 'inference',
    consensusThreshold: 66,
  });

  const handleAgentToggle = (agentId: string) => {
    setFormData(prev => ({
      ...prev,
      agentIds: prev.agentIds.includes(agentId)
        ? prev.agentIds.filter(id => id !== agentId)
        : [...prev.agentIds, agentId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Please enter a swarm name');
      return;
    }

    if (formData.agentIds.length < 2) {
      toast.error('Please select at least 2 agents');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      toast.success('Swarm created successfully');
    } catch (error) {
      toast.error('Failed to create swarm');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedAgents = mockAgents.filter(a => formData.agentIds.includes(a.id));
  const onlineAgentsCount = selectedAgents.filter(a => a.status === 'online').length;

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {/* Basic Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Swarm Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter swarm name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="taskType">Task Type</Label>
          <Select
            value={formData.taskType}
            onValueChange={(value) => setFormData(prev => ({ ...prev, taskType: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select task type" />
            </SelectTrigger>
            <SelectContent>
              {taskTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe the purpose of this swarm..."
          rows={2}
        />
      </div>

      {/* Coordination Type */}
      <div className="space-y-3">
        <Label>Coordination Type</Label>
        <div className="grid grid-cols-2 gap-3">
          {coordinationTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, coordinationType: type.value as any }))}
                className={cn(
                  'flex items-start gap-3 p-4 rounded-lg border text-left transition-all',
                  formData.coordinationType === type.value
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'hover:border-muted-foreground/50'
                )}
              >
                <div className={cn(
                  'p-2 rounded-lg',
                  formData.coordinationType === type.value ? 'bg-primary/10' : 'bg-muted'
                )}>
                  <Icon className={cn(
                    'h-5 w-5',
                    formData.coordinationType === type.value ? 'text-primary' : 'text-muted-foreground'
                  )} />
                </div>
                <div>
                  <div className="font-medium">{type.label}</div>
                  <div className="text-xs text-muted-foreground">{type.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Consensus Threshold (only for consensus type) */}
      {formData.coordinationType === 'consensus' && (
        <div className="space-y-2">
          <Label htmlFor="threshold">Consensus Threshold (%)</Label>
          <Input
            id="threshold"
            type="number"
            min={51}
            max={100}
            value={formData.consensusThreshold}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              consensusThreshold: parseInt(e.target.value) || 66 
            }))}
          />
          <p className="text-xs text-muted-foreground">
            Percentage of agents that must agree for consensus
          </p>
        </div>
      )}

      {/* Agent Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Select Agents *</Label>
          <span className="text-sm text-muted-foreground">
            {formData.agentIds.length} selected ({onlineAgentsCount} online)
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {mockAgents.map((agent) => (
            <div
              key={agent.id}
              onClick={() => handleAgentToggle(agent.id)}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                formData.agentIds.includes(agent.id)
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-muted-foreground/50',
                agent.status === 'offline' && 'opacity-50'
              )}
            >
              <Checkbox
                checked={formData.agentIds.includes(agent.id)}
                onCheckedChange={() => handleAgentToggle(agent.id)}
              />
              <div className="p-2 rounded-lg bg-muted">
                <Bot className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{agent.name}</span>
                  <span className={cn(
                    'h-2 w-2 rounded-full',
                    agent.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                  )} />
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {agent.capabilities.slice(0, 2).map((cap) => (
                    <Badge key={cap} variant="secondary" className="text-[10px] px-1 py-0">
                      {cap}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Swarm Preview */}
      {selectedAgents.length > 0 && (
        <Card className="bg-muted/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Swarm Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-4 py-4">
              {/* Visual representation of the swarm topology */}
              {formData.coordinationType === 'hierarchical' ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10 border-2 border-primary">
                    <Network className="h-6 w-6 text-primary" />
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex gap-2">
                    {selectedAgents.slice(0, 4).map((agent) => (
                      <div
                        key={agent.id}
                        className="p-2 rounded-lg bg-background border"
                        title={agent.name}
                      >
                        <Bot className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                    {selectedAgents.length > 4 && (
                      <div className="p-2 rounded-lg bg-muted text-xs flex items-center">
                        +{selectedAgents.length - 4}
                      </div>
                    )}
                  </div>
                </div>
              ) : formData.coordinationType === 'sequential' ? (
                <div className="flex items-center gap-2">
                  {selectedAgents.slice(0, 5).map((agent, index) => (
                    <React.Fragment key={agent.id}>
                      <div
                        className="p-2 rounded-lg bg-background border"
                        title={agent.name}
                      >
                        <Bot className="h-4 w-4 text-muted-foreground" />
                      </div>
                      {index < Math.min(selectedAgents.length, 5) - 1 && (
                        <div className="w-4 h-px bg-primary" />
                      )}
                    </React.Fragment>
                  ))}
                  {selectedAgents.length > 5 && (
                    <div className="text-xs text-muted-foreground">
                      +{selectedAgents.length - 5} more
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap justify-center gap-2">
                  {selectedAgents.map((agent) => (
                    <div
                      key={agent.id}
                      className="p-2 rounded-lg bg-background border"
                      title={agent.name}
                    >
                      <Bot className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="text-center text-sm text-muted-foreground">
              {selectedAgents.length} agents in {coordinationTypes.find(t => t.value === formData.coordinationType)?.label.toLowerCase()} mode
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting || formData.agentIds.length < 2}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Network className="mr-2 h-4 w-4" />
              Create Swarm
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
