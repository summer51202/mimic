'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FinancialSpace } from '@/shared/api/financial-space-contracts';
import { PixelButton } from '@/shared/ui/pixel-button';
import { PixelDialog } from '@/shared/ui/pixel-dialog';
import { PixelFrame } from '@/shared/ui/pixel-frame';
import { PooledSpaceForm } from './pooled-space-form';

export function PooledSpaceList({ groupId, spaces, defaultCurrency = 'TWD' }: {
  groupId: string; spaces: FinancialSpace[]; defaultCurrency?: string;
}) {
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  return <PixelFrame>
    <div className="pooled-section-heading"><div><p>共同寶箱</p><h2>共同基金</h2></div>
      <PixelButton onClick={() => setCreating(true)}>建立共同基金寶箱</PixelButton></div>
    {!spaces.length ? <p>還沒有共同基金。建立後，加入參與者並設定投入排程。</p> : <ul className="pooled-space-list">
      {spaces.map((space) => <li key={space.id}>{space.access === 'PARTICIPANT' ? <Link href={`/app/spaces/${space.id}`}>
        <strong>{space.name}</strong><span>{space.currency} · {space.role === 'MANAGER' ? '管理者' : '參與者'}{space.status === 'CLOSING' ? ' · 結清中' : space.status === 'ARCHIVED' ? ' · 已封存' : ''}</span>
      </Link> : <div><strong>{space.name}</strong><span>共同基金 · {space.status === 'ARCHIVED' ? '已封存' : '使用中'} · 僅群組治理資訊</span></div>}</li>)}
    </ul>}
    <PixelDialog open={creating} title="建立共同基金寶箱" closeLabel="關閉" onClose={() => setCreating(false)}>
      {creating && <PooledSpaceForm groupId={groupId} defaultCurrency={defaultCurrency} onCreated={(space) => {
        if (space.access === 'PARTICIPANT') router.push(`/app/spaces/${space.id}`);
      }} />}
    </PixelDialog>
  </PixelFrame>;
}
