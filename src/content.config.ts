import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

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

export const collections = { recursos };
