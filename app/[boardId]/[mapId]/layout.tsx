import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { getManifestHref } from '@/lib/pwa';
import BoardLayoutClient from './board-layout-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ boardId: string; mapId: string }>;
}): Promise<Metadata> {
  const { boardId, mapId } = await params;

  return {
    manifest: getManifestHref(boardId, mapId),
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return <BoardLayoutClient>{children}</BoardLayoutClient>;
}

// Force the route to always opt into dynamic SSR instead of static optimization
export const dynamic = "force-dynamic";
