'use client'
import { Suspense } from 'react';
import MapEdit from './mapedit';

export default function Home() {
  return <Suspense fallback={<div>Loading search...</div>}>
    <MapEdit />
  </Suspense>
}
