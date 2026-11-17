const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Prefixes a site-relative path with the deploy base and enforces the trailing slash. */
export function href(path = ''): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  return clean ? `${BASE}/${clean}/` : `${BASE}/`;
}

export const moduleHref = (moduleId: string) => href(`modules/${moduleId}`);

export const lessonHref = (moduleId: string, lessonSlug: string) => href(`modules/${moduleId}/${lessonSlug}`);
