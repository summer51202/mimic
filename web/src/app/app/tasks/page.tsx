import { loadTasks } from '@/features/home/home-queries';
import { TaskCenter } from '@/features/tasks/task-center';
import { AppReadFailure } from '@/shared/ui/app-read-failure';
import '@/features/tasks/tasks.css';

export default async function Page() {
  try { return <TaskCenter data={await loadTasks()} />; }
  catch (error) { return <AppReadFailure error={error} />; }
}
