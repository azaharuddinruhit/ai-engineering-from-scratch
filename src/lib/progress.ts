/**
 * Learner progress, persisted in localStorage (GitHub Pages has no backend).
 * Every access is guarded: storage can be unavailable in private windows or when blocked.
 */

const STORAGE_KEY = 'aiefs:completed-lessons';
export const PROGRESS_EVENT = 'aiefs:progress';

export function getCompletedLessons(): Set<string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []);
  } catch {
    return new Set();
  }
}

export function setLessonCompleted(lessonId: string, completed: boolean): void {
  const lessons = getCompletedLessons();
  if (completed) lessons.add(lessonId);
  else lessons.delete(lessonId);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...lessons]));
  } catch {
    // Storage unavailable: progress still applies for this page view.
  }
  window.dispatchEvent(new CustomEvent(PROGRESS_EVENT));
}

/** Runs `render` now and whenever progress changes in this tab or another one. */
export function onProgressChange(render: (completed: Set<string>) => void): void {
  const update = () => render(getCompletedLessons());
  update();
  window.addEventListener(PROGRESS_EVENT, update);
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) update();
  });
}
