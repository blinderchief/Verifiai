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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  Cpu,
  Shield,
  Zap,
  X,
  Plus,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AgentFormData {
  name: string;
  type: 'inference' | 'verification' | 'settlement' | 'coordinator';
  capabilities: string[];
  modelId: string;
  endpoint?: string;
  autoStart: boolean;
  maxConcurrentTasks: number;
  description?: string;
}

interface AgentRegistrationFormProps {
  onSubmit: (data: AgentFormData) => Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<AgentFormData>;
  isEditing?: boolean;
  className?: string;
}

const agentTypes = [
  {
    value: 'inference',
    label: 'Inference Agent',
    description: 'Runs AI model inference',
    icon: Cpu,
  },
  {
    value: 'verification',
    label: 'Verification Agent',
    description: 'Verifies proofs on-chain',
    icon: Shield,
  },
  {
    value: 'settlement',
    label: 'Settlement Agent',
    description: 'Handles RWA settlements',
    icon: Zap,
  },
  {
    value: 'coordinator',
    label: 'Coordinator Agent',
    description: 'Orchestrates swarm tasks',
    icon: Bot,
  },
] as const;

const availableCapabilities = [
  'text-generation',
  'image-classification',
  'sentiment-analysis',
  'document-processing',
  'proof-generation',
  'proof-verification',
  'settlement-execution',
  'swarm-coordination',
  'data-aggregation',
  'anomaly-detection',
];

const availableModels = [
  { id: 'gpt-4', name: 'GPT-4' },
  { id: 'claude-3', name: 'Claude 3' },
  { id: 'llama-2-70b', name: 'Llama 2 70B' },
  { id: 'mistral-7b', name: 'Mistral 7B' },
  { id: 'custom', name: 'Custom Model' },
];

export function AgentRegistrationForm({
  onSubmit,
  onCancel,
  initialData,
  isEditing = false,
  className,
}: AgentRegistrationFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState<AgentFormData>({
    name: initialData?.name || '',
    type: initialData?.type || 'inference',
    capabilities: initialData?.capabilities || [],
    modelId: initialData?.modelId || '',
    endpoint: initialData?.endpoint || '',
    autoStart: initialData?.autoStart ?? true,
    maxConcurrentTasks: initialData?.maxConcurrentTasks || 5,
    description: initialData?.description || '',
  });

  const [capabilityInput, setCapabilityInput] = React.useState('');

  const handleAddCapability = (capability: string) => {
    if (capability && !formData.capabilities.includes(capability)) {
      setFormData(prev => ({
        ...prev,
        capabilities: [...prev.capabilities, capability],
      }));
      setCapabilityInput('');
    }
  };

  const handleRemoveCapability = (capability: string) => {
    setFormData(prev => ({
      ...prev,
      capabilities: prev.capabilities.filter(c => c !== capability),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Please enter an agent name');
      return;
    }

    if (!formData.modelId) {
      toast.error('Please select a model');
      return;
    }

    if (formData.capabilities.length === 0) {
      toast.error('Please add at least one capability');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      toast.success(isEditing ? 'Agent updated successfully' : 'Agent registered successfully');
    } catch (error) {
      toast.error('Failed to save agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedType = agentTypes.find(t => t.value === formData.type);
  const TypeIcon = selectedType?.icon || Bot;

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {/* Agent Type Selection */}
      <div className="space-y-3">
        <Label>Agent Type</Label>
        <div className="grid grid-cols-2 gap-3">
          {agentTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, type: type.value }))}
                className={cn(
                  'flex items-start gap-3 p-4 rounded-lg border text-left transition-all',
                  formData.type === type.value
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'hover:border-muted-foreground/50'
                )}
              >
                <div className={cn(
                  'p-2 rounded-lg',
                  formData.type === type.value ? 'bg-primary/10' : 'bg-muted'
                )}>
                  <Icon className={cn(
                    'h-5 w-5',
                    formData.type === type.value ? 'text-primary' : 'text-muted-foreground'
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

      {/* Basic Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Agent Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter agent name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="model">Model *</Label>
          <Select
            value={formData.modelId}
            onValueChange={(value) => setFormData(prev => ({ ...prev, modelId: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe what this agent does..."
          rows={3}
        />
      </div>

      {/* Capabilities */}
      <div className="space-y-3">
        <Label>Capabilities *</Label>
        <div className="flex flex-wrap gap-2">
          {formData.capabilities.map((capability) => (
            <Badge key={capability} variant="secondary" className="gap-1 pl-2">
              {capability}
              <button
                type="button"
                onClick={() => handleRemoveCapability(capability)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Select value="" onValueChange={handleAddCapability}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Add a capability" />
            </SelectTrigger>
            <SelectContent>
              {availableCapabilities
                .filter(c => !formData.capabilities.includes(c))
                .map((capability) => (
                  <SelectItem key={capability} value={capability}>
                    {capability}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input
              placeholder="Custom capability"
              value={capabilityInput}
              onChange={(e) => setCapabilityInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCapability(capabilityInput);
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleAddCapability(capabilityInput)}
              disabled={!capabilityInput}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Advanced Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="endpoint">Custom Endpoint (Optional)</Label>
            <Input
              id="endpoint"
              value={formData.endpoint}
              onChange={(e) => setFormData(prev => ({ ...prev, endpoint: e.target.value }))}
              placeholder="https://api.example.com/inference"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maxTasks">Max Concurrent Tasks</Label>
              <Input
                id="maxTasks"
                type="number"
                min={1}
                max={100}
                value={formData.maxConcurrentTasks}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  maxConcurrentTasks: parseInt(e.target.value) || 1 
                }))}
              />
            </div>
            <div className="flex items-center justify-between pt-6">
              <div className="space-y-0.5">
                <Label htmlFor="autoStart">Auto Start</Label>
                <p className="text-xs text-muted-foreground">
                  Start agent when registered
                </p>
              </div>
              <Switch
                id="autoStart"
                checked={formData.autoStart}
                onCheckedChange={(checked) => setFormData(prev => ({ 
                  ...prev, 
                  autoStart: checked 
                }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <TypeIcon className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">
                  {formData.name || 'Unnamed Agent'}
                </h4>
                <Badge variant="outline">{selectedType?.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {formData.description || 'No description provided'}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.capabilities.slice(0, 4).map((cap) => (
                  <Badge key={cap} variant="secondary" className="text-xs">
                    {cap}
                  </Badge>
                ))}
                {formData.capabilities.length > 4 && (
                  <Badge variant="secondary" className="text-xs">
                    +{formData.capabilities.length - 4} more
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEditing ? 'Updating...' : 'Registering...'}
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              {isEditing ? 'Update Agent' : 'Register Agent'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
