'use client';

import { PageHeader } from '@/components/ui';
import PiecesManager from './_components/PiecesManager';

export default function ProductsPage() {
  return (
    <>
      <PageHeader
        eyebrow="The Edit"
        title="Pieces"
        description="Every garment in the collection — its variants, imagery and placement on the storefront."
      />
      <PiecesManager />
    </>
  );
}
