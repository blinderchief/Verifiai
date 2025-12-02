'use client';

import { useRouter } from 'next/navigation';
import { SwarmCreationForm } from '@/components/dashboard/swarm-creation-form';
import { PageHeader, PageContainer } from '@/components/ui/page-header';

export default function CreateSwarmPage() {
  const router = useRouter();

  return (
    <PageContainer>
      <PageHeader
        title="Create Swarm"
        description="Create a new multi-agent swarm for coordinated verification tasks"
        backHref="/dashboard/swarms"
      />

      <SwarmCreationForm
        onSubmit={async (data) => {
          // API call would go here
          console.log('Swarm data:', data);
          await new Promise(resolve => setTimeout(resolve, 1000));
          router.push('/dashboard/swarms');
        }}
        onCancel={() => router.push('/dashboard/swarms')}
      />
    </PageContainer>
  );
}
