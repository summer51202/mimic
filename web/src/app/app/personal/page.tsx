import { loadPersonalPage } from '@/features/personal-expenses/personal-queries';
import { PersonalPage } from '@/features/personal-expenses/personal-page';
import { AppReadFailure } from '@/shared/ui/app-read-failure';
import '@/features/personal-expenses/personal.css';
export default async function Page({ searchParams }: { searchParams: Promise<{ space?: string; month?: string; quick?: string }> }) {
  const params = await searchParams;
  let data;
  try { data = await loadPersonalPage(params); }
  catch (error) { return <AppReadFailure error={error} />; }
  return <PersonalPage key={`${data.selected?.id ?? 'empty'}:${data.monthData?.month ?? ''}`} data={data} quick={params.quick === '1'} />;
}
