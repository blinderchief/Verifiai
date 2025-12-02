'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import api, {
  type Proof,
  type Agent,
  type Swarm,
  type Settlement,
  type Model,
  type GenerateProofRequest,
  type CreateAgentRequest,
  type CreateSwarmRequest,
  type CreateSettlementRequest,
} from '@/lib/api';

// Set up auth token
export function useApiAuth() {
  const { getToken } = useAuth();

  useEffect(() => {
    const setupAuth = async () => {
      const token = await getToken();
      if (token) {
        api.setToken(token);
      }
    };
    setupAuth();
  }, [getToken]);
}

// Dashboard Stats
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => api.getDashboardStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// Proofs Hooks
export function useProofs(params?: { page?: number; limit?: number; type?: string; status?: string }) {
  return useQuery({
    queryKey: ['proofs', params],
    queryFn: () => api.getProofs(params),
  });
}

export function useProof(id: string) {
  return useQuery({
    queryKey: ['proof', id],
    queryFn: () => api.getProof(id),
    enabled: !!id,
  });
}

export function useGenerateProof() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GenerateProofRequest) => api.generateProof(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}

export function useVerifyProof() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.verifyProof(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['proof', id] });
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
    },
  });
}

// Agents Hooks
export function useAgents(params?: { status?: string; type?: string }) {
  return useQuery({
    queryKey: ['agents', params],
    queryFn: () => api.getAgents(params),
  });
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: ['agent', id],
    queryFn: () => api.getAgent(id),
    enabled: !!id,
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAgentRequest) => api.createAgent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Agent> }) =>
      api.updateAgent(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['agent', id] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}

export function useStartAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.startAgent(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['agent', id] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}

export function useStopAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.stopAgent(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['agent', id] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteAgent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}

// Swarms Hooks
export function useSwarms() {
  return useQuery({
    queryKey: ['swarms'],
    queryFn: () => api.getSwarms(),
  });
}

export function useSwarm(id: string) {
  return useQuery({
    queryKey: ['swarm', id],
    queryFn: () => api.getSwarm(id),
    enabled: !!id,
  });
}

export function useCreateSwarm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSwarmRequest) => api.createSwarm(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swarms'] });
    },
  });
}

export function useAddAgentToSwarm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ swarmId, agentId }: { swarmId: string; agentId: string }) =>
      api.addAgentToSwarm(swarmId, agentId),
    onSuccess: (_, { swarmId }) => {
      queryClient.invalidateQueries({ queryKey: ['swarm', swarmId] });
      queryClient.invalidateQueries({ queryKey: ['swarms'] });
    },
  });
}

export function useRemoveAgentFromSwarm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ swarmId, agentId }: { swarmId: string; agentId: string }) =>
      api.removeAgentFromSwarm(swarmId, agentId),
    onSuccess: (_, { swarmId }) => {
      queryClient.invalidateQueries({ queryKey: ['swarm', swarmId] });
      queryClient.invalidateQueries({ queryKey: ['swarms'] });
    },
  });
}

// Settlements Hooks
export function useSettlements(params?: { status?: string; type?: string }) {
  return useQuery({
    queryKey: ['settlements', params],
    queryFn: () => api.getSettlements(params),
  });
}

export function useSettlement(id: string) {
  return useQuery({
    queryKey: ['settlement', id],
    queryFn: () => api.getSettlement(id),
    enabled: !!id,
  });
}

export function useCreateSettlement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSettlementRequest) => api.createSettlement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}

export function useExecuteSettlement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.executeSettlement(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['settlement', id] });
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
    },
  });
}

// Models Hooks
export function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: () => api.getModels(),
  });
}

export function useModel(id: string) {
  return useQuery({
    queryKey: ['model', id],
    queryFn: () => api.getModel(id),
    enabled: !!id,
  });
}

export function useUploadModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FormData) => api.uploadModel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
    },
  });
}

export function useDeleteModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteModel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
    },
  });
}

// Rewards Hooks
export function useRewards() {
  return useQuery({
    queryKey: ['rewards'],
    queryFn: () => api.getRewards(),
  });
}

export function useClaimRewards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.claimRewards(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}

export function useMilestones() {
  return useQuery({
    queryKey: ['milestones'],
    queryFn: () => api.getMilestones(),
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => api.getLeaderboard(),
  });
}

// User Hooks
export function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: () => api.getUser(),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof api.updateUser>[0]) => api.updateUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}

export function useApiKeys() {
  return useQuery({
    queryKey: ['apiKeys'],
    queryFn: () => api.getApiKeys(),
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => api.createApiKey(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.revokeApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
    },
  });
}

// Health Check
export function useHealthCheck() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => api.healthCheck(),
    refetchInterval: 60000, // Check every minute
  });
}
