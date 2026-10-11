import { and, eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { Router, type IRouter } from "express";
import {
  db,
  downloadHistoryTable,
  licensesTable,
  ordersTable,
  productsTable,
  releasesTable,
  usersTable,
} from "@workspace/db";
import { GetAccountOverviewResponse } from "@workspace/api-zod";

const router: IRouter = Router();

function claimString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function ensureLocalUser(
  authSubject: string,
  email: string | null,
): Promise<{ id: number; email: string | null; displayName: string | null; isAdmin: boolean; createdAt: Date }> {
  const [existing] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      displayName: usersTable.displayName,
      isAdmin: usersTable.isAdmin,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(eq(usersTable.authSubject, authSubject))
    .limit(1);
  if (existing) {
    if (email && email !== existing.email) {
      const [updated] = await db
        .update(usersTable)
        .set({ email })
        .where(eq(usersTable.id, existing.id))
        .returning({
          id: usersTable.id,
          email: usersTable.email,
          displayName: usersTable.displayName,
          isAdmin: usersTable.isAdmin,
          createdAt: usersTable.createdAt,
        });
      return updated;
    }
    return existing;
  }
  const [created] = await db
    .insert(usersTable)
    .values({ authSubject, email })
    .onConflictDoNothing({ target: usersTable.authSubject })
    .returning({
      id: usersTable.id,
      email: usersTable.email,
      displayName: usersTable.displayName,
      isAdmin: usersTable.isAdmin,
      createdAt: usersTable.createdAt,
    });
  if (created) return created;
  const [raced] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      displayName: usersTable.displayName,
      isAdmin: usersTable.isAdmin,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(eq(usersTable.authSubject, authSubject))
    .limit(1);
  if (!raced) throw new Error("Could not initialize the signed-in account.");
  return raced;
}

router.get("/account", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const claims = auth.sessionClaims as Record<string, unknown> | null;
  const user = await ensureLocalUser(auth.userId, claimString(claims?.email));
  const registeredProducts = await db
    .select({ name: productsTable.name, slug: productsTable.slug })
    .from(licensesTable)
    .innerJoin(productsTable, eq(licensesTable.productId, productsTable.id))
    .where(and(eq(licensesTable.userId, user.id), eq(licensesTable.status, "active")));
  const licenses = await db
    .select({
      productName: productsTable.name,
      status: licensesTable.status,
      issuedAt: licensesTable.issuedAt,
    })
    .from(licensesTable)
    .innerJoin(productsTable, eq(licensesTable.productId, productsTable.id))
    .where(eq(licensesTable.userId, user.id));
  const orders = await db
    .select({
      orderNumber: ordersTable.orderNumber,
      amountCents: ordersTable.amountCents,
      currency: ordersTable.currency,
      status: ordersTable.status,
      createdAt: ordersTable.createdAt,
    })
    .from(ordersTable)
    .where(eq(ordersTable.userId, user.id))
    .orderBy(ordersTable.createdAt);
  const downloads = await db
    .select({
      productName: productsTable.name,
      version: releasesTable.version,
      downloadedAt: downloadHistoryTable.downloadedAt,
    })
    .from(downloadHistoryTable)
    .innerJoin(releasesTable, eq(downloadHistoryTable.releaseId, releasesTable.id))
    .innerJoin(productsTable, eq(releasesTable.productId, productsTable.id))
    .where(eq(downloadHistoryTable.userId, user.id))
    .orderBy(downloadHistoryTable.downloadedAt);

  res.json(
    GetAccountOverviewResponse.parse({
      isAdmin: user.isAdmin,
      profile: {
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt,
      },
      registeredProducts,
      licenses,
      purchaseHistory: orders,
      downloadHistory: downloads,
    }),
  );
});

export default router;
