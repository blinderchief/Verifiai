'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  CheckCircle,
  Circle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Cpu,
  Shield,
  FileCheck,
  Zap,
  Copy,
  ExternalLink,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

type ProofType = 'inference' | 'content' | 'settlement' | 'signature';

interface ProofStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}

interface ProofGeneratorProps {
  onComplete?: (proof: GeneratedProof) => void;
  onCancel?: () => void;
  className?: string;
}

interface GeneratedProof {
  id: string;
  type: ProofType;
  proofHash: string;
  inputHash: string;
  outputHash: string;
  modelHash: string;
  timestamp: number;
  txHash?: string;
  verified: boolean;
}

const proofTypes = [
  {
    value: 'inference',
    label: 'Inference Proof',
    description: 'Verify AI model inference results',
    icon: Cpu,
  },
  {
    value: 'content',
    label: 'Content Verification',
    description: 'Prove content authenticity',
    icon: FileCheck,
  },
  {
    value: 'settlement',
    label: 'Settlement Proof',
    description: 'RWA transaction verification',
    icon: Shield,
  },
  {
    value: 'signature',
    label: 'Signature Proof',
    description: 'Multi-party signature verification',
    icon: Zap,
  },
] as const;

export function ProofGenerator({
  onComplete,
  onCancel,
  className,
}: ProofGeneratorProps) {
  const [step, setStep] = React.useState(1);
  const [proofType, setProofType] = React.useState<ProofType | null>(null);
  const [modelId, setModelId] = React.useState('');
  const [inputData, setInputData] = React.useState('');
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generationProgress, setGenerationProgress] = React.useState(0);
  const [generatedProof, setGeneratedProof] = React.useState<GeneratedProof | null>(null);
  const [steps, setSteps] = React.useState<ProofStep[]>([
    { id: '1', title: 'Configure Proof', description: 'Select type and parameters', status: 'active' },
    { id: '2', title: 'Generate Proof', description: 'Create ZK proof', status: 'pending' },
    { id: '3', title: 'Submit to Chain', description: 'Verify on Aptos', status: 'pending' },
    { id: '4', title: 'Complete', description: 'Proof verified', status: 'pending' },
  ]);

  const updateStepStatus = (stepId: string, status: ProofStep['status']) => {
    setSteps(prev => prev.map(s => 
      s.id === stepId ? { ...s, status } : s
    ));
  };

  const handleGenerate = async () => {
    if (!proofType || !modelId || !inputData) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsGenerating(true);
    setStep(2);
    updateStepStatus('1', 'completed');
    updateStepStatus('2', 'active');

    // Simulate proof generation with progress
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      clearInterval(progressInterval);
      setGenerationProgress(100);
      updateStepStatus('2', 'completed');
      updateStepStatus('3', 'active');

      // Simulate chain submission
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      updateStepStatus('3', 'completed');
      updateStepStatus('4', 'active');

      const proof: GeneratedProof = {
        id: `proof_${Date.now()}`,
        type: proofType,
        proofHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        inputHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        outputHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        modelHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        timestamp: Date.now(),
        txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        verified: true,
      };

      setGeneratedProof(proof);
      updateStepStatus('4', 'completed');
      setStep(3);
      
      toast.success('Proof generated and verified on-chain!');
      onComplete?.(proof);
    } catch (error) {
      clearInterval(progressInterval);
      updateStepStatus('2', 'error');
      toast.error('Failed to generate proof');
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const StepIndicator = ({ stepData }: { stepData: ProofStep }) => {
    const getIcon = () => {
      switch (stepData.status) {
        case 'completed':
          return <CheckCircle className="h-5 w-5 text-green-500" />;
        case 'active':
          return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
        case 'error':
          return <X className="h-5 w-5 text-destructive" />;
        default:
          return <Circle className="h-5 w-5 text-muted-foreground" />;
      }
    };

    return (
      <div className="flex items-center gap-3">
        {getIcon()}
        <div>
          <div className={cn(
            'font-medium text-sm',
            stepData.status === 'pending' && 'text-muted-foreground'
          )}>
            {stepData.title}
          </div>
          <div className="text-xs text-muted-foreground">{stepData.description}</div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Step Progress */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
        {steps.map((s, index) => (
          <React.Fragment key={s.id}>
            <StepIndicator stepData={s} />
            {index < steps.length - 1 && (
              <div className={cn(
                'flex-1 h-px mx-4',
                s.status === 'completed' ? 'bg-green-500' : 'bg-muted-foreground/20'
              )} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Configuration */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Configure Proof</CardTitle>
            <CardDescription>
              Select the type of proof and provide the required parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Proof Type Selection */}
            <div className="space-y-3">
              <Label>Proof Type</Label>
              <div className="grid grid-cols-2 gap-3">
                {proofTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setProofType(type.value as ProofType)}
                      className={cn(
                        'flex items-start gap-3 p-4 rounded-lg border text-left transition-all',
                        proofType === type.value
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'hover:border-muted-foreground/50'
                      )}
                    >
                      <div className={cn(
                        'p-2 rounded-lg',
                        proofType === type.value ? 'bg-primary/10' : 'bg-muted'
                      )}>
                        <Icon className={cn(
                          'h-5 w-5',
                          proofType === type.value ? 'text-primary' : 'text-muted-foreground'
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

            {/* Model Selection */}
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select value={modelId} onValueChange={setModelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4">GPT-4</SelectItem>
                  <SelectItem value="claude-3">Claude 3</SelectItem>
                  <SelectItem value="llama-2">Llama 2</SelectItem>
                  <SelectItem value="custom">Custom Model</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Input Data */}
            <div className="space-y-2">
              <Label htmlFor="input">Input Data</Label>
              <Textarea
                id="input"
                value={inputData}
                onChange={(e) => setInputData(e.target.value)}
                placeholder="Enter the input data for proof generation..."
                rows={4}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button 
                onClick={handleGenerate}
                disabled={!proofType || !modelId || !inputData}
              >
                Generate Proof
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Generation Progress */}
      {step === 2 && isGenerating && (
        <Card>
          <CardHeader>
            <CardTitle>Generating Proof</CardTitle>
            <CardDescription>
              Creating zero-knowledge proof for your inference...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(generationProgress)}%</span>
              </div>
              <Progress value={generationProgress} />
            </div>
            
            <div className="rounded-lg bg-muted p-4 font-mono text-xs space-y-1 max-h-48 overflow-y-auto">
              <div className="text-green-500">→ Initializing proof circuit...</div>
              {generationProgress > 20 && (
                <div className="text-green-500">→ Computing witness...</div>
              )}
              {generationProgress > 40 && (
                <div className="text-green-500">→ Generating proof...</div>
              )}
              {generationProgress > 60 && (
                <div className="text-green-500">→ Verifying proof locally...</div>
              )}
              {generationProgress > 80 && (
                <div className="text-yellow-500">→ Submitting to Aptos...</div>
              )}
              {generationProgress >= 100 && (
                <div className="text-green-500">✓ Proof verified on-chain!</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Completion */}
      {step === 3 && generatedProof && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <CardTitle>Proof Generated Successfully</CardTitle>
                <CardDescription>
                  Your proof has been verified on the Aptos blockchain
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div>
                  <div className="text-xs text-muted-foreground">Proof Hash</div>
                  <div className="font-mono text-sm truncate max-w-[300px]">
                    {generatedProof.proofHash}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => copyToClipboard(generatedProof.proofHash, 'Proof hash')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              {generatedProof.txHash && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div>
                    <div className="text-xs text-muted-foreground">Transaction Hash</div>
                    <div className="font-mono text-sm truncate max-w-[300px]">
                      {generatedProof.txHash}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => copyToClipboard(generatedProof.txHash!, 'Transaction hash')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" asChild>
                      <a 
                        href={`https://explorer.aptoslabs.com/txn/${generatedProof.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <StatusBadge status="verified" />
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Created</div>
                  <div className="text-sm">
                    {new Date(generatedProof.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onCancel}>
                Close
              </Button>
              <Button onClick={() => {
                setStep(1);
                setGeneratedProof(null);
                setGenerationProgress(0);
                setProofType(null);
                setModelId('');
                setInputData('');
                setSteps(prev => prev.map(s => ({ ...s, status: s.id === '1' ? 'active' : 'pending' })));
              }}>
                Generate Another
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
