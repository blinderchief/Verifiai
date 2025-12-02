import * as React from 'react';
import { cn } from '@/lib/utils';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertCircle, 
  Loader2,
  Circle,
  Zap,
} from 'lucide-react';

type StatusType = 
  | 'success' 
  | 'pending' 
  | 'error' 
  | 'warning' 
  | 'info' 
  | 'loading' 
  | 'inactive'
  | 'active';

interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
  showIcon?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<StatusType, {
  className: string;
  icon: React.ElementType;
}> = {
  success: {
    className: 'bg-green-500/10 text-green-500 border-green-500/20',
    icon: CheckCircle,
  },
  active: {
    className: 'bg-green-500/10 text-green-500 border-green-500/20',
    icon: Zap,
  },
  pending: {
    className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    icon: Clock,
  },
  error: {
    className: 'bg-red-500/10 text-red-500 border-red-500/20',
    icon: XCircle,
  },
  warning: {
    className: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    icon: AlertCircle,
  },
  info: {
    className: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    icon: Circle,
  },
  loading: {
    className: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    icon: Loader2,
  },
  inactive: {
    className: 'bg-muted text-muted-foreground border-muted',
    icon: Circle,
  },
};

const sizeConfig = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-1 text-xs',
  lg: 'px-2.5 py-1.5 text-sm',
};

const iconSizeConfig = {
  sm: 'h-2.5 w-2.5',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
};

// Map common status strings to StatusType
function normalizeStatus(status: string): StatusType {
  const statusLower = status.toLowerCase();
  
  const mapping: Record<string, StatusType> = {
    // Success variants
    verified: 'success',
    completed: 'success',
    approved: 'success',
    done: 'success',
    online: 'active',
    active: 'active',
    running: 'active',
    
    // Pending variants
    pending: 'pending',
    waiting: 'pending',
    processing: 'pending',
    'in-progress': 'pending',
    queued: 'pending',
    
    // Error variants
    failed: 'error',
    error: 'error',
    rejected: 'error',
    cancelled: 'error',
    
    // Warning variants
    warning: 'warning',
    disputed: 'warning',
    
    // Inactive variants
    inactive: 'inactive',
    offline: 'inactive',
    stopped: 'inactive',
    draft: 'inactive',
    
    // Loading variants
    generating: 'loading',
    loading: 'loading',
    
    // Info variants
    info: 'info',
    new: 'info',
  };

  return mapping[statusLower] || 'info';
}

export function StatusBadge({
  status,
  label,
  showIcon = true,
  className,
  size = 'md',
}: StatusBadgeProps) {
  const normalizedStatus = normalizeStatus(status);
  const config = statusConfig[normalizedStatus];
  const Icon = config.icon;

  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        config.className,
        sizeConfig[size],
        className
      )}
    >
      {showIcon && (
        <Icon 
          className={cn(
            iconSizeConfig[size],
            normalizedStatus === 'loading' && 'animate-spin'
          )} 
        />
      )}
      {displayLabel}
    </span>
  );
}

// Specialized badges for common use cases
export function VerificationBadge({ 
  verified, 
  size = 'md' 
}: { 
  verified: boolean; 
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <StatusBadge
      status={verified ? 'verified' : 'pending'}
      label={verified ? 'Verified' : 'Pending'}
      size={size}
    />
  );
}

export function AgentStatusBadge({ 
  online, 
  size = 'md' 
}: { 
  online: boolean; 
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <StatusBadge
      status={online ? 'online' : 'offline'}
      label={online ? 'Online' : 'Offline'}
      size={size}
    />
  );
}

export function ProofStatusBadge({ 
  status,
  size = 'md' 
}: { 
  status: 'generating' | 'pending' | 'verified' | 'failed';
  size?: 'sm' | 'md' | 'lg';
}) {
  const labels = {
    generating: 'Generating',
    pending: 'Pending Verification',
    verified: 'Verified',
    failed: 'Failed',
  };

  return (
    <StatusBadge
      status={status}
      label={labels[status]}
      size={size}
    />
  );
}
