import { and, eq, ilike, or } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, articlesTable } from "@workspace/db";
import {
  GetArticleParams,
  GetArticleResponse,
  ListArticlesQueryParams,
  ListArticlesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/articles", async (req, res): Promise<void> => {
  const parsed = ListArticlesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const filters = [eq(articlesTable.isPublished, true)];
  if (parsed.data.category) filters.push(eq(articlesTable.category, parsed.data.category));
  if (parsed.data.search?.trim()) {
    const search = `%${parsed.data.search.trim()}%`;
    const matches = or(
      ilike(articlesTable.title, search),
      ilike(articlesTable.summary, search),
    );
    if (matches) filters.push(matches);
  }
  const rows = await db
    .select()
    .from(articlesTable)
    .where(and(...filters))
    .orderBy(articlesTable.publishedAt);
  res.json(
    ListArticlesResponse.parse(
      rows.map(({ isPublished: _published, createdAt: _created, ...article }) => article),
    ),
  );
});

router.get("/articles/:slug", async (req, res): Promise<void> => {
  const params = GetArticleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [article] = await db
    .select()
    .from(articlesTable)
    .where(and(eq(articlesTable.slug, params.data.slug), eq(articlesTable.isPublished, true)))
    .limit(1);
  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }
  const { isPublished: _published, createdAt: _created, ...response } = article;
  res.json(GetArticleResponse.parse(response));
});

export default router;
