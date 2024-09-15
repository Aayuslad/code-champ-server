import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function generateUniqueSlug(title: string): Promise<string> {
  let slug = title.toLowerCase().replace(/\s+/g, '-');

  const existingSlugs = await prisma.problem.findMany({
    where: {
      slug: {
        startsWith: slug
      }
    },
    select: {
      slug: true
    }
  });

  let uniqueSlug = slug;
  let counter = 1;
  while (existingSlugs.some(problem => problem.slug === uniqueSlug)) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }

  return uniqueSlug;
}