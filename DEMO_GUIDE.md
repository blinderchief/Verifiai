# VerifiAI Protocol - Complete Component Usage Guide

This guide provides comprehensive examples for using all components and features of the VerifiAI Protocol dashboard.

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.0.0
- pnpm package manager
- Running API server on port 3001

### Starting the Application
```bash
# Install dependencies
pnpm install

# Start development servers (frontend + backend)
pnpm dev

# Or start individually
pnpm --filter @verifiai/dashboard dev  # Frontend on port 3000
pnpm --filter @verifiai/api dev         # Backend on port 3001
```

### Accessing the Demo
Navigate to `http://localhost:3000/demo` to see all components in action.

## 📋 Component Overview

### 1. **Agent Management** (`/agents`)

#### Creating Agents
```typescript
// Using the Create Agent Modal
const demoAgent = {
  name: 'Risk Analysis Agent',
  description: 'Analyzes financial risk using AI models',
  capabilities: ['risk-analysis', 'data-processing', 'proof-generation'],
  swarmName: 'Financial Services Swarm'
};

// Via API
await createSwarm.mutateAsync({
  name: demoAgent.swarmName,
  agents: [{
    name: demoAgent.name,
    capabilities: demoAgent.capabilities,
  }],
});
```

#### Agent Capabilities
- `risk-analysis`: Financial risk assessment
- `data-processing`: Data transformation and analysis
- `proof-generation`: Zero-knowledge proof creation
- `content-analysis`: Content verification and analysis
- `consensus`: Swarm consensus participation

#### Agent Status Indicators
- 🟢 **Active**: Agent is running and processing tasks
- 🟡 **Processing**: Agent is currently working on a task
- 🔴 **Offline**: Agent is not responding
- ⚪ **Idle**: Agent is available but not processing

### 2. **Proof Generation** (`/proofs`)

#### Generating Zero-Knowledge Proofs
```typescript
const proofRequest = {
  modelId: 'risk-model-001',
  input: [0.1, 0.2, 0.3, 0.4], // Model input data
  proofType: 'groth16', // 'groth16' | 'bulletproofs' | 'hybrid' | 'ezkl'
  metadata: {
    source: 'demo',
    confidence: 0.95,
    timestamp: Date.now()
  }
};

// Generate proof
await generateProof.mutateAsync(proofRequest);
```

#### Proof Types
- **Groth16**: Efficient SNARK proofs for general computation
- **Bulletproofs**: Range proofs for confidential transactions
- **Hybrid**: Combined TEE + ZK proofs for maximum security
- **EZKL**: Easy zero-knowledge for machine learning models

#### Proof Status
- 🔄 **Pending**: Proof generation in progress
- ✅ **Verified**: Proof successfully verified
- ❌ **Failed**: Proof generation/verification failed

### 3. **Model Management** (`/models`)

#### Uploading AI Models
```typescript
// Frontend upload (via file input)
const handleModelUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('model', file);
  formData.append('name', 'Risk Analysis Model');
  formData.append('framework', 'onnx');
  formData.append('version', '1.0.0');

  await uploadModel.mutateAsync(formData);
};
```

#### Supported Frameworks
- **ONNX**: Open Neural Network Exchange format
- **PyTorch**: Python deep learning framework
- **TensorFlow**: Google's ML framework
- **Custom**: Proprietary model formats

### 4. **Task Submission** (`/demo` - Tasks Tab)

#### Submitting Tasks to Swarms
```typescript
const taskRequest = {
  swarmId: 'swarm_123456789', // Target swarm ID
  name: 'Risk Assessment Task',
  input: {
    data: [0.1, 0.2, 0.3], // Task input data
    threshold: 0.8, // Risk threshold
    modelId: 'risk-model-001'
  },
  requiredCapabilities: ['risk-analysis'], // Required agent capabilities
  priority: 'high' // 'low' | 'medium' | 'high' | 'critical'
};

// Submit task
await submitTask.mutateAsync(taskRequest);
```

#### Task Types
- `inference`: AI model inference tasks
- `verification`: Proof verification tasks
- `settlement`: Financial settlement processing
- `content_analysis`: Content verification
- `royalty_calculation`: Royalty distribution
- `data_aggregation`: Data collection and processing
- `consensus`: Swarm consensus tasks
- `custom`: User-defined tasks

### 5. **Settlement Management** (`/settlements`)

#### Creating Settlements
```typescript
const settlementRequest = {
  asset: {
    type: 'token',
    identifier: 'APT',
    amount: 1000,
    name: 'Aptos Token'
  },
  parties: [
    { address: '0x123...', role: 'buyer', approved: false },
    { address: '0x456...', role: 'seller', approved: true }
  ],
  proofRequirements: ['payment_proof', 'delivery_proof'],
  requiredApprovals: 2
};

// Create settlement
await createSettlement.mutateAsync(settlementRequest);
```

#### Settlement Status Flow
1. **Pending**: Initial creation, awaiting approvals
2. **Pending Approval**: Some parties have approved
3. **In Progress**: All approvals received, executing
4. **Completed**: Successfully executed
5. **Failed**: Execution failed

### 6. **Swarm Management** (`/swarms`)

#### Swarm Configuration
```typescript
const swarmConfig = {
  name: 'Financial Analysis Swarm',
  maxAgents: 10,
  quorumSize: 3, // Minimum agents for consensus
  consensusThreshold: 0.67, // 67% agreement required
  proofType: 'groth16',
  taskDistribution: 'capability_match' // 'round_robin' | 'capability_match' | 'load_balanced' | 'auction'
};
```

#### Swarm Status
- 🟢 **Active**: Swarm is operational
- 🟡 **Idle**: Swarm has agents but no active tasks
- 🔴 **Offline**: Swarm is not responding

### 7. **Rewards System** (`/rewards`)

#### Reward Types
- **Task Completion**: Rewards for successful task execution
- **Proof Generation**: Bonuses for generating valid proofs
- **Consensus Participation**: Rewards for participating in swarm consensus
- **Quality Bonuses**: Additional rewards for high-quality work

#### Claiming Rewards
```typescript
// Automatic claiming (configured in settings)
// Or manual claiming via UI
await claimRewards.mutateAsync({
  rewardIds: ['reward_123', 'reward_456']
});
```

## 🎯 Complete Workflow Example

### 1. **Setup Phase**
```typescript
// Create a specialized agent
await createSwarm.mutateAsync({
  name: 'DeFi Risk Analysis Swarm',
  agents: [{
    name: 'RiskAnalyzer',
    capabilities: ['risk-analysis', 'proof-generation'],
    modelId: 'defi-risk-model-v1'
  }]
});
```

### 2. **Model Upload Phase**
```typescript
// Upload trained AI model
const modelFile = new File([modelData], 'defi-risk-model.onnx');
await uploadModel.mutateAsync(modelFile);
```

### 3. **Task Execution Phase**
```typescript
// Submit risk analysis task
await submitTask.mutateAsync({
  swarmId: swarmId,
  name: 'Portfolio Risk Assessment',
  input: {
    portfolio: userPortfolio,
    marketData: currentMarketData,
    riskThreshold: 0.05
  },
  requiredCapabilities: ['risk-analysis']
});
```

### 4. **Proof Generation Phase**
```typescript
// Generate ZK proof of risk calculation
await generateProof.mutateAsync({
  modelId: 'defi-risk-model-v1',
  input: riskCalculationInput,
  proofType: 'groth16',
  metadata: {
    calculation: 'portfolio_risk',
    confidence: 0.99
  }
});
```

### 5. **Settlement Phase**
```typescript
// Create settlement for risk-based insurance
await createSettlement.mutateAsync({
  asset: {
    type: 'token',
    identifier: 'INSURANCE',
    amount: calculatedPremium,
    name: 'Risk Insurance Token'
  },
  parties: [buyer, insurer],
  proofRequirements: ['risk_proof', 'payment_proof']
});
```

## 🔧 API Integration Examples

### Frontend Hooks Usage
```typescript
// React Query hooks for all operations
import {
  useSwarms, useCreateSwarm,
  useProofs, useGenerateProof,
  useModels, useUploadModel,
  useSettlements, useCreateSettlement,
  useSubmitTask
} from '@/lib/hooks';

// Example: Fetch and display swarms
function SwarmList() {
  const { data: swarms, isLoading, error } = useSwarms();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {swarms?.map(swarm => (
        <div key={swarm.id}>
          <h3>{swarm.name}</h3>
          <p>Agents: {swarm.agents?.length || 0}</p>
          <p>Status: {swarm.status}</p>
        </div>
      ))}
    </div>
  );
}
```

### Direct API Usage
```typescript
import { api } from '@/lib/api';

// Direct API calls (alternative to hooks)
const swarms = await api.listSwarms();
const agents = await api.listAgents();
const proofs = await api.listProofs();
```

## 🎨 UI Components Usage

### Cards and Layout
```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Status badges
<Badge className="bg-green-500/10 text-green-500">Active</Badge>
<Badge className="bg-yellow-500/10 text-yellow-500">Pending</Badge>
<Badge className="bg-red-500/10 text-red-500">Failed</Badge>

// Action buttons
<Button variant="gradient">Create Agent</Button>
<Button variant="outline">View Details</Button>
```

### Forms and Inputs
```tsx
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

function CreateAgentForm() {
  const [name, setName] = useState('');
  const { toast } = useToast();

  const handleSubmit = async () => {
    try {
      await createSwarm.mutateAsync({ name, agents: [] });
      toast({
        title: 'Success',
        description: 'Agent created successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <div>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Agent name"
      />
      <Button onClick={handleSubmit}>Create</Button>
    </div>
  );
}
```

## 🚨 Error Handling

### Common Error Patterns
```typescript
// API errors
try {
  await createSwarm.mutateAsync(params);
} catch (error) {
  if (error instanceof Error) {
    // Handle specific error types
    if (error.message.includes('network')) {
      // Network error handling
    } else if (error.message.includes('validation')) {
      // Validation error handling
    }
  }
}

// Loading states
const { data, isLoading, error } = useSwarms();

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
```

## 🔄 Real-time Updates

### React Query Invalidation
```typescript
// After creating an agent, refresh related data
const createSwarm = useCreateSwarm();

// Automatically invalidates swarms query on success
// No manual refresh needed
```

### Polling Configuration
```typescript
// Configure polling for real-time updates
const { data: swarms } = useSwarms({
  refetchInterval: 5000, // Poll every 5 seconds
  refetchOnWindowFocus: true
});
```

## 📊 Monitoring and Analytics

### Dashboard Metrics
- **Total Agents**: Count of all agents across swarms
- **Active Swarms**: Number of operational swarms
- **Task Success Rate**: Percentage of successful task completions
- **Proof Generation**: Number of proofs generated
- **Settlement Volume**: Value of processed settlements

### Performance Monitoring
```typescript
// Track agent performance
const agentMetrics = {
  tasksCompleted: agent.tasksCompleted,
  successRate: agent.successRate,
  averageResponseTime: agent.avgResponseTime,
  uptime: agent.uptimePercentage
};
```

## 🔐 Security Considerations

### API Key Management
```typescript
// Set API key for authenticated requests
api.setApiKey('your-api-key');

// API key is automatically included in requests
```

### Data Validation
```typescript
// All inputs are validated using Zod schemas
const validatedData = CreateSwarmSchema.parse(req.body);
```

## 🎯 Best Practices

1. **Always check loading states** before rendering data
2. **Handle errors gracefully** with user-friendly messages
3. **Use React Query hooks** for consistent data fetching
4. **Validate inputs** before API calls
5. **Monitor task progress** for long-running operations
6. **Refresh data** after mutations
7. **Use proper TypeScript types** for all data structures

## 🐛 Troubleshooting

### Common Issues

**Agents not appearing after creation:**
- Check browser network tab for API errors
- Verify API server is running on port 3001
- Check browser console for JavaScript errors

**Proof generation failing:**
- Ensure model is uploaded and accessible
- Check input data format matches model requirements
- Verify sufficient computational resources

**Task submission errors:**
- Ensure swarm has agents with required capabilities
- Check swarm status is 'active'
- Verify input data structure

### Debug Mode
```bash
# Enable debug logging
DEBUG=verifiai:* pnpm dev

# Check API health
curl http://localhost:3001/api/v1/health
```

This guide covers all major components and workflows. Use the `/demo` page to see interactive examples of each feature in action!