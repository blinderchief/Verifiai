'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  FileQuestion, 
  Plus, 
  SearchX, 
  AlertCircle,
  Inbox,
  type LucideIcon 
} from 'lucide-react';

type EmptyStateVariant = 'default' | 'search' | 'error' | 'inbox';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
}

const variantConfig: Record<EmptyStateVariant, {
  icon: LucideIcon;
  iconClassName: string;
}> = {
  default: {
    icon: FileQuestion,
    iconClassName: 'text-muted-foreground',
  },
  search: {
    icon: SearchX,
    iconClassName: 'text-muted-foreground',
  },
  error: {
    icon: AlertCircle,
    iconClassName: 'text-destructive',
  },
  inbox: {
    icon: Inbox,
    iconClassName: 'text-muted-foreground',
  },
};

export function EmptyState({
  variant = 'default',
  icon: CustomIcon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const config = variantConfig[variant];
  const Icon = CustomIcon || config.icon;
  const ActionIcon = action?.icon || Plus;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div
        className={cn(
          'flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4',
          variant === 'error' && 'bg-destructive/10'
        )}
      >
        <Icon className={cn('h-8 w-8', config.iconClassName)} />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} className="mt-6">
          <ActionIcon className="h-4 w-4 mr-2" />
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Pre-configured empty states
export function NoResultsFound({ 
  searchTerm,
  onClear,
}: { 
  searchTerm?: string;
  onClear?: () => void;
}) {
  return (
    <EmptyState
      variant="search"
      title="No results found"
      description={
        searchTerm
          ? `No items matching "${searchTerm}" were found. Try adjusting your search.`
          : 'No items match your current filters.'
      }
      action={
        onClear
          ? {
              label: 'Clear search',
              onClick: onClear,
            }
          : undefined
      }
    />
  );
}

export function NoProofsYet({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      title="No proofs yet"
      description="Generate your first zero-knowledge proof to verify AI inference on-chain."
      action={{
        label: 'Generate Proof',
        onClick: onCreate,
      }}
    />
  );
}

export function NoAgentsYet({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      title="No agents registered"
      description="Register your first AI agent to start participating in the verification network."
      action={{
        label: 'Register Agent',
        onClick: onCreate,
      }}
    />
  );
}

export function NoSwarmsYet({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      title="No swarms yet"
      description="Create a swarm to coordinate multiple AI agents for complex verification tasks."
      action={{
        label: 'Create Swarm',
        onClick: onCreate,
      }}
    />
  );
}

export function NoSettlementsYet({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      title="No settlements yet"
      description="Create your first RWA settlement to start processing real-world asset transactions."
      action={{
        label: 'Create Settlement',
        onClick: onCreate,
      }}
    />
  );
}

export function NoModelsYet({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      title="No models stored"
      description="Upload your first AI model to Shelby decentralized storage."
      action={{
        label: 'Upload Model',
        onClick: onCreate,
      }}
    />
  );
}

export function ErrorState({ 
  onRetry 
}: { 
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      variant="error"
      title="Something went wrong"
      description="There was an error loading this content. Please try again."
      action={
        onRetry
          ? {
              label: 'Try again',
              onClick: onRetry,
            }
          : undefined
      }
    />
  );
}
