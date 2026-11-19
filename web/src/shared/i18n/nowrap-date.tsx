import type { ReactNode } from 'react';

export function nowrapDate(chunks: ReactNode) {
  return <span data-iso-nowrap="" style={{ display: 'inline-block', whiteSpace: 'nowrap', textDecoration: 'inherit' }}>{chunks}</span>;
}
