'use client';

import { useRouter } from 'next/navigation';
import { AgentRegistrationForm } from '@/components/dashboard/agent-registration-form';
import { PageHeader, PageContainer } from '@/components/ui/page-header';

export default function RegisterAgentPage() {
  const router = useRouter();

  return (
    <PageContainer>
      <PageHeader
        title="Register Agent"
        description="Register a new AI agent to participate in the verification network"
        backHref="/dashboard/agents"
      />

      <AgentRegistrationForm
        onSubmit={async (data) => {
          // API call would go here
          console.log('Agent data:', data);
          await new Promise(resolve => setTimeout(resolve, 1000));
          router.push('/dashboard/agents');
        }}
        onCancel={() => router.push('/dashboard/agents')}
      />
    </PageContainer>
  );
}
