import { useTranslations } from 'next-intl';
import { PixelPanel } from '@/shared/ui/pixel-panel';
export default function Loading() {
  const t = useTranslations('routeState.sharedLoading');
  return (
    <main className="shared-page" aria-busy="true">
      <PixelPanel>
        <h1>{t('title')}</h1>
        <p>{t('message')}</p>
      </PixelPanel>
    </main>
  );
}
