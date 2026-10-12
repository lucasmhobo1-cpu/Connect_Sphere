import { eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  CreateAdminProductBody,
  CreateAdminProductResponse,
  ListAdminProductsResponse,
  UpdateAdminProductParams,
  UpdateAdminProductBody,
  UpdateAdminProductResponse,
} from "@workspace/api-zod";
import { db, productsTable } from "@workspace/db";
import { ensureLocalUser } from "./account";

const router: IRouter = Router();

function claimEmail(claims: unknown): string | null {
  if (!claims || typeof claims !== "object" || !("email" in claims)) return null;
  const email = (claims as { email?: unknown }).email;
  return typeof email === "string" && email.trim() ? email.trim() : null;
}

async function requireAdmin(req: Request, res: Response): Promise<boolean> {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  const user = await ensureLocalUser(auth.userId, claimEmail(auth.sessionClaims));
  if (!user.isAdmin) {
    res.status(403).json({ error: "Administrator role required" });
    return false;
  }
  return true;
}

router.get("/admin/products", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const products = await db
    .select({
      id: productsTable.id,
      slug: productsTable.slug,
      name: productsTable.name,
      shortDescription: productsTable.shortDescription,
      description: productsTable.description,
      category: productsTable.category,
      kind: productsTable.kind,
      priceCents: productsTable.priceCents,
      currency: productsTable.currency,
      status: productsTable.status,
      version: productsTable.version,
      featureTags: productsTable.featureTags,
      coverImageUrl: productsTable.coverImageUrl,
      isPublished: productsTable.isPublished,
    })
    .from(productsTable)
    .orderBy(productsTable.name);
  res.json(ListAdminProductsResponse.parse(products));
});

router.post("/admin/products", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const body = CreateAdminProductBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  if (body.data.status === "available" && body.data.priceCents === null) {
    res.status(400).json({ error: "An available product must have a configured price." });
    return;
  }
  const [existing] = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(eq(productsTable.slug, body.data.slug))
    .limit(1);
  if (existing) {
    res.status(409).json({ error: "A product with that slug already exists." });
    return;
  }
  const [created] = await db.insert(productsTable).values(body.data).returning({
    id: productsTable.id,
    slug: productsTable.slug,
    name: productsTable.name,
    shortDescription: productsTable.shortDescription,
    description: productsTable.description,
    category: productsTable.category,
    kind: productsTable.kind,
    priceCents: productsTable.priceCents,
    currency: productsTable.currency,
    status: productsTable.status,
    version: productsTable.version,
    featureTags: productsTable.featureTags,
    coverImageUrl: productsTable.coverImageUrl,
    isPublished: productsTable.isPublished,
  });
  res.status(201).json(CreateAdminProductResponse.parse(created));
});

router.patch("/admin/products/:id", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const params = UpdateAdminProductParams.safeParse(req.params);
  const body = UpdateAdminProductBody.safeParse(req.body);
  if (!params.success || !body.success) {
    const error = !params.success ? params.error.message : !body.success ? body.error.message : "Invalid request";
    res.status(400).json({ error });
    return;
  }

  const [current] = await db
    .select({ priceCents: productsTable.priceCents, status: productsTable.status })
    .from(productsTable)
    .where(eq(productsTable.id, params.data.id))
    .limit(1);
  if (!current) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const nextPrice =
    body.data.priceCents === undefined ? current.priceCents : body.data.priceCents;
  const nextStatus = body.data.status ?? current.status;
  if (nextStatus === "available" && nextPrice === null) {
    res.status(400).json({ error: "An available product must have a configured price." });
    return;
  }

  const [updated] = await db
    .update(productsTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(productsTable.id, params.data.id))
    .returning({
      id: productsTable.id,
      slug: productsTable.slug,
      name: productsTable.name,
      shortDescription: productsTable.shortDescription,
      description: productsTable.description,
      category: productsTable.category,
      kind: productsTable.kind,
      priceCents: productsTable.priceCents,
      currency: productsTable.currency,
      status: productsTable.status,
      version: productsTable.version,
      featureTags: productsTable.featureTags,
      coverImageUrl: productsTable.coverImageUrl,
      isPublished: productsTable.isPublished,
    });
  res.json(UpdateAdminProductResponse.parse(updated));
});

export default router;
