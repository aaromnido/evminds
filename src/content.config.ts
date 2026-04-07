import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { ALL_TAGS } from "./content/tags";

const recursos = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/recursos" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    image: z.string().optional(),
    href: z.string().url(),
    category: z.enum([
      "Asociación",
      "Entidad Pública",
      "Fundación",
      "Grupo de usuarios",
    ]),
  }),
});

const articulos = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/articulos" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    author: z.string().default("EVMinds"),
    category: z.enum(["Experiencia", "Guía", "Review", "Opinión"]),
    image: z.string().optional(),
    excerpt: z.string(),
    tags: z.array(z.enum(ALL_TAGS as [string, ...string[]])).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { recursos, articulos };
