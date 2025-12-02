/**
 * @fileoverview React Hooks for VerifiAI Protocol
 * @description Custom hooks for data fetching and state management
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import api, { 
  Proof, 
  Agent, 
  Swarm, 
  Settlement, 
  Model, 
  DashboardStats,
  GenerateProofRequest,
  CreateAgentRequest,
  CreateSwarmRequest,
  CreateSettlementRequest,
} from './api';

// ============ Types ============

interface UseQueryOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

interface QueryState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface MutationState<T, V> {
  mutate: (variables: V) => Promise<T>;
  isLoading: boolean;
  error: Error | null;
  data: T | null;
}

// ============ Generic Query Hook ============

function useQuery<T>(
  queryFn: () => Promise<T>,
  options: UseQueryOptions = {}
): QueryState<T> {
  const { enabled = true, refetchInterval } = options;
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Use ref to store queryFn to avoid infinite re-renders
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;
  
  // Track auth state to refetch when it changes
  const prevAuthState = useRef<boolean | null>(null);

  const fetchData = useCallback(async () => {
    // Wait for auth to be loaded
    if (!isLoaded) {
      return;
    }
    
    if (!enabled) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Get and set auth token before making API call
      if (isSignedIn) {
        const token = await getToken();
        if (token) {
          api.setToken(token);
        }
      } else {
        api.clearToken();
      }
      
      const result = await queryFnRef.current();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [enabled, getToken, isLoaded, isSignedIn]);

  // Initial fetch and refetch on auth state change
  useEffect(() => {
    if (!isLoaded) return;
    
    // Check if auth state changed
    const authChanged = prevAuthState.current !== null && prevAuthState.current !== isSignedIn;
    prevAuthState.current = isSignedIn;
    
    // Fetch on initial load or when auth state changes
    if (prevAuthState.current === isSignedIn || authChanged) {
      fetchData();
    }
  }, [isLoaded, isSignedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (refetchInterval && enabled) {
      const interval = setInterval(fetchData, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [refetchInterval, enabled, fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

// ============ Generic Mutation Hook ============

function useMutation<T, V>(
  mutationFn: (variables: V) => Promise<T>
): MutationState<T, V> {
  const { getToken, isSignedIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);
  
  // Use ref to store mutationFn to avoid unnecessary re-renders
  const mutationFnRef = useRef(mutationFn);
  mutationFnRef.current = mutationFn;

  const mutate = useCallback(async (variables: V): Promise<T> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get and set auth token before making API call
      if (isSignedIn) {
        const token = await getToken();
        if (token) {
          api.setToken(token);
        }
      }
      
      const result = await mutationFnRef.current(variables);
      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [getToken, isSignedIn]);

  return { mutate, isLoading, error, data };
}

// ============ Dashboard Hooks ============

export function useDashboardStats(options?: UseQueryOptions) {
  return useQuery(() => api.getDashboardStats(), options);
}

// ============ Proofs Hooks ============

export function useProofs(params?: { 
  page?: number; 
  limit?: number; 
  type?: string; 
  status?: string 
}, options?: UseQueryOptions) {
  const query = useQuery(() => api.getProofs(params), options);
  return {
    proofs: query.data?.proofs || [],
    total: query.data?.total || 0,
    loading: query.isLoading,
    error: query.error?.message || null,
    refresh: query.refetch,
  };
}

export function useProof(id: string, options?: UseQueryOptions) {
  return useQuery(() => api.getProof(id), { ...options, enabled: !!id });
}

export function useGenerateProof() {
  return useMutation((data: GenerateProofRequest) => api.generateProof(data));
}

export function useVerifyProof() {
  return useMutation((id: string) => api.verifyProof(id));
}

// ============ Agents Hooks ============

export function useAgents(params?: { status?: string; type?: string }, options?: UseQueryOptions) {
  const query = useQuery(() => api.getAgents(params), options);
  return {
    agents: query.data?.agents || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    refresh: query.refetch,
  };
}

export function useAgent(id: string, options?: UseQueryOptions) {
  return useQuery(() => api.getAgent(id), { ...options, enabled: !!id });
}

export function useCreateAgent() {
  return useMutation((data: CreateAgentRequest) => api.createAgent(data));
}

export function useUpdateAgent() {
  return useMutation(({ id, data }: { id: string; data: Partial<Agent> }) => 
    api.updateAgent(id, data)
  );
}

export function useStartAgent() {
  return useMutation((id: string) => api.startAgent(id));
}

export function useStopAgent() {
  return useMutation((id: string) => api.stopAgent(id));
}

export function useDeleteAgent() {
  return useMutation((id: string) => api.deleteAgent(id));
}

// ============ Swarms Hooks ============

export function useSwarms(options?: UseQueryOptions) {
  const query = useQuery(() => api.getSwarms(), options);
  return {
    swarms: query.data?.swarms || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    refresh: query.refetch,
  };
}

export function useSwarm(id: string, options?: UseQueryOptions) {
  return useQuery(() => api.getSwarm(id), { ...options, enabled: !!id });
}

export function useCreateSwarm() {
  return useMutation((data: CreateSwarmRequest) => api.createSwarm(data));
}

export function useAddAgentToSwarm() {
  return useMutation(({ swarmId, agentId }: { swarmId: string; agentId: string }) => 
    api.addAgentToSwarm(swarmId, agentId)
  );
}

export function useRemoveAgentFromSwarm() {
  return useMutation(({ swarmId, agentId }: { swarmId: string; agentId: string }) => 
    api.removeAgentFromSwarm(swarmId, agentId)
  );
}

// ============ Settlements Hooks ============

export function useSettlements(params?: { status?: string; type?: string }, options?: UseQueryOptions) {
  const query = useQuery(() => api.getSettlements(params), options);
  return {
    settlements: query.data?.settlements || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    refresh: query.refetch,
  };
}

export function useSettlement(id: string, options?: UseQueryOptions) {
  return useQuery(() => api.getSettlement(id), { ...options, enabled: !!id });
}

export function useCreateSettlement() {
  return useMutation((data: CreateSettlementRequest) => api.createSettlement(data));
}

export function useExecuteSettlement() {
  return useMutation((id: string) => api.executeSettlement(id));
}

// ============ Models Hooks ============

export function useModels(options?: UseQueryOptions) {
  const query = useQuery(() => api.getModels(), options);
  return {
    models: query.data?.models || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    refresh: query.refetch,
  };
}

export function useModel(id: string, options?: UseQueryOptions) {
  return useQuery(() => api.getModel(id), { ...options, enabled: !!id });
}

export function useUploadModel() {
  return useMutation((data: FormData) => api.uploadModel(data));
}

export function useDeleteModel() {
  return useMutation((id: string) => api.deleteModel(id));
}

// ============ Rewards Hooks ============

export function useRewards(options?: UseQueryOptions) {
  const query = useQuery(() => api.getRewards(), options);
  return {
    rewards: query.data ? {
      total: query.data.totalEarnings || 0,
      claimable: query.data.availableToClaim || 0,
      pending: query.data.pendingRewards || 0,
      history: query.data.history || [],
    } : null,
    loading: query.isLoading,
    error: query.error?.message || null,
    refresh: query.refetch,
  };
}

export function useClaimRewards() {
  return useMutation(() => api.claimRewards());
}

export function useMilestones(options?: UseQueryOptions) {
  return useQuery(() => api.getMilestones(), options);
}

export function useLeaderboard(options?: UseQueryOptions) {
  return useQuery(() => api.getLeaderboard(), options);
}

// ============ User Hooks ============

export function useCurrentUser(options?: UseQueryOptions) {
  const { isSignedIn } = useUser();
  return useQuery(() => api.getUser(), { ...options, enabled: isSignedIn });
}

export function useUpdateUser() {
  return useMutation((data: Partial<{ firstName: string; lastName: string; displayName: string }>) => 
    api.updateUser(data)
  );
}

export function useApiKeys(options?: UseQueryOptions) {
  return useQuery(() => api.getApiKeys(), options);
}

export function useCreateApiKey() {
  return useMutation((name: string) => api.createApiKey(name));
}

export function useRevokeApiKey() {
  return useMutation((id: string) => api.revokeApiKey(id));
}

// ============ Health Check Hook ============

export function useHealthCheck(options?: UseQueryOptions) {
  return useQuery(() => api.healthCheck(), { ...options, refetchInterval: 30000 });
}

// ============ Wallet Connection Hook ============

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async () => {
    if (typeof window === 'undefined') return;
    
    try {
      setIsConnecting(true);
      
      // Try Petra wallet first
      const petra = (window as any).petra;
      if (petra) {
        const response = await petra.connect();
        setAddress(response.address);
        setIsConnected(true);
        return;
      }
      
      // Try Martian wallet
      const martian = (window as any).martian;
      if (martian) {
        const response = await martian.connect();
        setAddress(response.address);
        setIsConnected(true);
        return;
      }
      
      throw new Error('No Aptos wallet found. Please install Petra or Martian wallet.');
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setAddress(null);
    setIsConnected(false);
  }, []);

  const signAndSubmitTransaction = useCallback(async (payload: any) => {
    if (!isConnected) throw new Error('Wallet not connected');
    
    const petra = (window as any).petra;
    if (petra) {
      const response = await petra.signAndSubmitTransaction(payload);
      return response;
    }
    
    const martian = (window as any).martian;
    if (martian) {
      const response = await martian.signAndSubmitTransaction(payload);
      return response;
    }
    
    throw new Error('No wallet available');
  }, [isConnected]);

  // Check for existing connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window === 'undefined') return;
      
      const petra = (window as any).petra;
      if (petra) {
        try {
          const isConnected = await petra.isConnected();
          if (isConnected) {
            const response = await petra.account();
            setAddress(response.address);
            setIsConnected(true);
          }
        } catch (e) {
          // Ignore
        }
      }
    };
    
    checkConnection();
  }, []);

  return {
    address,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    signAndSubmitTransaction,
  };
}
