import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const modules = defineCollection({
  loader: file('src/content/modules.json'),
  schema: z.object({
    number: z.number().int().positive(),
    title: z.string(),
    tagline: z.string(),
    summary: z.string(),
    status: z.enum(['available', 'upcoming']),
    /** Planned lesson topics; shown for upcoming modules before their lessons exist. */
    topics: z.array(z.string()),
  }),
});

const lessons = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/lessons' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    module: reference('modules'),
    order: z.number().int().positive(),
    minutes: z.number().int().positive(),
    /** Name of the lesson's interactive playground. */
    playground: z.string(),
  }),
});

export const collections = { modules, lessons };
