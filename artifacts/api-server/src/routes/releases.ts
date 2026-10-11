import { and, eq, isNotNull } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { Router, type IRouter } from "express";
import { db, productsTable, releasesTable, downloadHistoryTable } from "@workspace/db";
import {
  DownloadReleaseParams,
  ListReleasesQueryParams,
  ListReleasesResponse,
} from "@workspace/api-zod";
import { ensureLocalUser } from "./account";

const router: IRouter = Router();

function safeDownloadUrl(value: string | null): value is string {
  if (!value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

router.get("/releases", async (req, res): Promise<void> => {
  const parsed = ListReleasesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const conditions = [
    eq(releasesTable.isPublished, true),
    isNotNull(releasesTable.publishedAt),
    eq(productsTable.isPublished, true),
  ];
  if (parsed.data.productSlug) conditions.push(eq(productsTable.slug, parsed.data.productSlug));
  const rows = await db
    .select({
      id: releasesTable.id,
      productSlug: productsTable.slug,
      productName: productsTable.name,
      version: releasesTable.version,
      platform: releasesTable.platform,
      releaseNotes: releasesTable.releaseNotes,
      systemRequirements: releasesTable.systemRequirements,
      fileSizeBytes: releasesTable.fileSizeBytes,
      fileUrl: releasesTable.fileUrl,
      publishedAt: releasesTable.publishedAt,
    })
    .from(releasesTable)
    .innerJoin(productsTable, eq(releasesTable.productId, productsTable.id))
    .where(and(...conditions))
    .orderBy(releasesTable.publishedAt);
  res.json(
    ListReleasesResponse.parse(
      rows.map(({ fileUrl, ...release }) => ({
        ...release,
        publishedAt: release.publishedAt,
        downloadAvailable: safeDownloadUrl(fileUrl),
        downloadUrl: safeDownloadUrl(fileUrl)
          ? `/api/releases/${release.id}/download`
          : null,
      })),
    ),
  );
});

router.get("/releases/:id/download", async (req, res): Promise<void> => {
  const params = DownloadReleaseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [release] = await db
    .select({
      id: releasesTable.id,
      fileUrl: releasesTable.fileUrl,
      publishedAt: releasesTable.publishedAt,
    })
    .from(releasesTable)
    .innerJoin(productsTable, eq(releasesTable.productId, productsTable.id))
    .where(
      and(
        eq(releasesTable.id, params.data.id),
        eq(releasesTable.isPublished, true),
        isNotNull(releasesTable.publishedAt),
        eq(productsTable.isPublished, true),
      ),
    )
    .limit(1);
  if (!release || !safeDownloadUrl(release.fileUrl)) {
    res.status(404).json({ error: "This release does not have a configured download file." });
    return;
  }

  const auth = getAuth(req);
  if (auth.userId) {
    const claims = auth.sessionClaims as Record<string, unknown> | null;
    const email =
      typeof claims?.email === "string" && claims.email.trim()
        ? claims.email.trim()
        : null;
    const user = await ensureLocalUser(auth.userId, email);
    await db.insert(downloadHistoryTable).values({
      userId: user.id,
      releaseId: release.id,
    });
  }
  res.redirect(302, release.fileUrl);
});

export default router;
