import { getCollection, type CollectionEntry } from 'astro:content';
import { lessonHref } from './paths';

export type ModuleEntry = CollectionEntry<'modules'>;
export type LessonEntry = CollectionEntry<'lessons'>;

export interface LessonLink {
  /** Stable progress key, e.g. "foundations/structured-outputs". */
  id: string;
  slug: string;
  title: string;
  description: string;
  minutes: number;
  playground: string;
  href: string;
}

export interface ModuleWithLessons {
  module: ModuleEntry;
  lessons: LessonLink[];
}

export const lessonSlug = (lesson: LessonEntry) => lesson.id.split('/').pop()!;

/** The whole curriculum, ordered by module number then lesson order. Built once per build. */
export async function getCurriculum(): Promise<ModuleWithLessons[]> {
  const [modules, lessons] = await Promise.all([getCollection('modules'), getCollection('lessons')]);
  return modules
    .sort((a, b) => a.data.number - b.data.number)
    .map((module) => ({
      module,
      lessons: lessons
        .filter((lesson) => lesson.data.module.id === module.id)
        .sort((a, b) => a.data.order - b.data.order)
        .map((lesson) => ({
          id: lesson.id,
          slug: lessonSlug(lesson),
          title: lesson.data.title,
          description: lesson.data.description,
          minutes: lesson.data.minutes,
          playground: lesson.data.playground,
          href: lessonHref(module.id, lessonSlug(lesson)),
        })),
    }));
}

/** Previous and next lessons across module boundaries, for page-footer navigation. */
export function neighbours(curriculum: ModuleWithLessons[], lessonId: string) {
  const ordered = curriculum.flatMap((m) => m.lessons);
  const index = ordered.findIndex((l) => l.id === lessonId);
  return { previous: ordered[index - 1], next: ordered[index + 1] };
}
