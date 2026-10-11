import { and, eq, ilike } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, productsTable } from "@workspace/db";
import {
  GetProductParams,
  GetProductResponse,
  ListProductsQueryParams,
  ListProductsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/products", async (req, res): Promise<void> => {
  const parsed = ListProductsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const filters = [eq(productsTable.isPublished, true)];
  if (parsed.data.category) {
    filters.push(eq(productsTable.category, parsed.data.category));
  }
  if (parsed.data.search?.trim()) {
    filters.push(ilike(productsTable.name, `%${parsed.data.search.trim()}%`));
  }

  const rows = await db
    .select()
    .from(productsTable)
    .where(and(...filters))
    .orderBy(productsTable.name);
  res.json(
    ListProductsResponse.parse(
      rows.map(({ isPublished: _published, createdAt: _created, updatedAt: _updated, ...product }) => product),
    ),
  );
});

router.get("/products/:slug", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [product] = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.slug, params.data.slug), eq(productsTable.isPublished, true)))
    .limit(1);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const { isPublished: _published, createdAt: _created, updatedAt: _updated, ...response } = product;
  res.json(GetProductResponse.parse(response));
});

export default router;
