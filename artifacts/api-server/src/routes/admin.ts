import { and, eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { Router, type IRouter } from "express";
import {
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

async function requireAdmin(req: Parameters<Parameters<IRouter["get"]>[1]>[0], res: Parameters<Parameters<IRouter["get"]>[1]>[1]) {
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

router.patch("/admin/products/:id", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const params = UpdateAdminProductParams.safeParse(req.params);
  const body = UpdateAdminProductBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: params.success ? body.error.message : params.error.message });
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
    .where(and(eq(productsTable.id, params.data.id)))
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
