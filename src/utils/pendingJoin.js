import { joinClassroom } from '../api/classrooms';

export async function consumePendingJoin() {
  const code = sessionStorage.getItem('pending_join_code');
  if (!code) return null;
  sessionStorage.removeItem('pending_join_code');
  try {
    const { classroom } = await joinClassroom({ join_code: code });
    return classroom?.name || null;
  } catch {
    return null;
  }
}
