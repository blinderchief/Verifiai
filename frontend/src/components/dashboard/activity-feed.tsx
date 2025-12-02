'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  Shield,
  Bot,
  Network,
  Coins,
  AlertCircle,
  Clock,
  Pause,
  Play,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ActivityType = 'proof_generated' | 'proof_verified' | 'agent_online' | 'agent_offline' | 'swarm_created' | 'reward_earned' | 'settlement_completed' | 'error';

interface Activity {
  id: string;
  type: ActivityType;
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface ActivityFeedProps {
  maxItems?: number;
  className?: string;
}

const activityConfig: Record<ActivityType, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
}> = {
  proof_generated: {
    icon: Shield,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  proof_verified: {
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  agent_online: {
    icon: Bot,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  agent_offline: {
    icon: Bot,
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
  },
  swarm_created: {
    icon: Network,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  reward_earned: {
    icon: Coins,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  settlement_completed: {
    icon: CheckCircle,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  error: {
    icon: AlertCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
};

// Simulated activity messages
const activityMessages: { type: ActivityType; messages: string[] }[] = [
  {
    type: 'proof_generated',
    messages: [
      'New inference proof generated for GPT-4 model',
      'Content verification proof created',
      'ZK proof generated for sentiment analysis',
    ],
  },
  {
    type: 'proof_verified',
    messages: [
      'Proof #1234 verified on Aptos mainnet',
      'Settlement proof verified successfully',
      'Inference proof validated by network',
    ],
  },
  {
    type: 'agent_online',
    messages: [
      'Agent "GPT-4 Inference" is now online',
      'Verification agent started',
      'Settlement bot connected',
    ],
  },
  {
    type: 'swarm_created',
    messages: [
      'New swarm "Analysis Pipeline" created with 4 agents',
      'Consensus swarm initialized',
      'Hierarchical verification swarm deployed',
    ],
  },
  {
    type: 'reward_earned',
    messages: [
      'Earned 25.5 PAT tokens for proof verification',
      'Reward claimed: 100 PAT tokens',
      'Staking rewards distributed',
    ],
  },
  {
    type: 'settlement_completed',
    messages: [
      'RWA settlement #567 completed successfully',
      'Multi-party settlement finalized',
      'Asset transfer verified and settled',
    ],
  },
];

export function ActivityFeed({ maxItems = 50, className }: ActivityFeedProps) {
  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [isPaused, setIsPaused] = React.useState(false);
  const intervalRef = React.useRef<NodeJS.Timeout>();

  // Generate random activity
  const generateActivity = React.useCallback((): Activity => {
    const randomCategory = activityMessages[Math.floor(Math.random() * activityMessages.length)];
    const randomMessage = randomCategory.messages[Math.floor(Math.random() * randomCategory.messages.length)];
    
    return {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: randomCategory.type,
      message: randomMessage,
      timestamp: new Date(),
    };
  }, []);

  // Start/stop activity simulation
  React.useEffect(() => {
    if (!isPaused) {
      // Add initial activities
      setActivities(Array.from({ length: 5 }, generateActivity));

      // Simulate real-time updates
      intervalRef.current = setInterval(() => {
        setActivities(prev => {
          const newActivity = generateActivity();
          const updated = [newActivity, ...prev];
          return updated.slice(0, maxItems);
        });
      }, 3000 + Math.random() * 5000); // Random interval between 3-8 seconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, generateActivity, maxItems]);

  const clearActivities = () => {
    setActivities([]);
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Live Activity
          {!isPaused && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
          )}
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? (
              <Play className="h-4 w-4" />
            ) : (
              <Pause className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={clearActivities}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Clock className="h-8 w-8 mb-2" />
              <p>No activity yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity, index) => {
                const config = activityConfig[activity.type];
                const Icon = config.icon;
                
                return (
                  <div
                    key={activity.id}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg transition-all',
                      index === 0 && 'animate-in slide-in-from-top-2 fade-in-0 duration-300',
                      'hover:bg-muted/50'
                    )}
                  >
                    <div className={cn('p-2 rounded-lg', config.bgColor)}>
                      <Icon className={cn('h-4 w-4', config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{activity.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
