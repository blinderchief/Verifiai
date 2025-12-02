'use client';

import { useRouter } from 'next/navigation';
import { ProofGenerator } from '@/components/dashboard/proof-generator';
import { PageHeader, PageContainer } from '@/components/ui/page-header';
import { toast } from 'sonner';

export default function GenerateProofPage() {
  const router = useRouter();

  return (
    <PageContainer>
      <PageHeader
        title="Generate Proof"
        description="Create a new zero-knowledge proof for AI inference verification"
        backHref="/dashboard/proofs"
      />

      <ProofGenerator
        onComplete={(proof) => {
          toast.success('Proof created successfully');
        }}
        onCancel={() => router.push('/dashboard/proofs')}
      />
    </PageContainer>
  );
}
