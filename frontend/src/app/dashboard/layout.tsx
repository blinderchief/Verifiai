'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import {
  Shield,
  Brain,
  Users,
  Coins,
  Database,
  Gift,
  Settings,
  Menu,
  X,
  ChevronRight,
  Zap,
  BarChart3,
  Bell,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const navigation = [
  {
    name: 'Overview',
    href: '/dashboard',
    icon: BarChart3,
    description: 'Dashboard overview',
  },
  {
    name: 'Proofs',
    href: '/dashboard/proofs',
    icon: Shield,
    description: 'ZK proof generation & verification',
    badge: 'Live',
  },
  {
    name: 'Agents',
    href: '/dashboard/agents',
    icon: Brain,
    description: 'AI agent management',
    badge: '12 Active',
  },
  {
    name: 'Swarms',
    href: '/dashboard/swarms',
    icon: Users,
    description: 'Multi-agent coordination',
  },
  {
    name: 'Settlements',
    href: '/dashboard/settlements',
    icon: Coins,
    description: 'RWA settlements',
    badge: '3 Pending',
  },
  {
    name: 'Models',
    href: '/dashboard/models',
    icon: Database,
    description: 'AI model storage',
  },
  {
    name: 'Rewards',
    href: '/dashboard/rewards',
    icon: Gift,
    description: 'PAT token rewards',
  },
];

const bottomNavigation = [
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-5 border-b">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">VerifiAI</span>
            </Link>
            <button
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-3">
              {navigation.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));
                
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <item.icon className={cn(
                        'h-5 w-5 shrink-0',
                        isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                      )} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {item.name}
                          {item.badge && (
                            <Badge 
                              variant={isActive ? 'secondary' : 'outline'} 
                              className={cn(
                                'text-[10px] px-1.5 py-0',
                                isActive && 'bg-primary-foreground/20 text-primary-foreground border-0'
                              )}
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ChevronRight className={cn(
                        'h-4 w-4 opacity-0 transition-opacity',
                        isActive && 'opacity-100'
                      )} />
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 px-3">
              <div className="border-t pt-4">
                <ul className="space-y-1">
                  {bottomNavigation.map((item) => {
                    const isActive = pathname === item.href;
                    
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={cn(
                            'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          <item.icon className="h-5 w-5" />
                          {item.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </nav>

          {/* Stats Card */}
          <div className="p-4">
            <div className="rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 p-4 border border-primary/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                  <Gift className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">PAT Rewards</p>
                  <p className="text-xs text-muted-foreground">Available to claim</p>
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">2,450</span>
                <span className="text-sm text-muted-foreground">PAT</span>
              </div>
              <Button size="sm" className="w-full mt-3">
                Claim Rewards
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 px-4 lg:px-6">
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search proofs, agents, settlements..."
                className="pl-9 bg-muted/50"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button className="relative">
              <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                3
              </span>
            </button>

            {/* Network Status */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                Aptos Mainnet
              </span>
            </div>

            {/* User */}
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: 'h-8 w-8',
                }
              }}
            />
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
