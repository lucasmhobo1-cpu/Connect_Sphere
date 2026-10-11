import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";

export const releasesTable = pgTable("releases", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  version: text("version").notNull(),
  platform: text("platform").notNull(),
  releaseNotes: text("release_notes").notNull().default(""),
  systemRequirements: text("system_requirements").notNull().default(""),
  fileSizeBytes: integer("file_size_bytes"),
  fileUrl: text("file_url"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReleaseSchema = createInsertSchema(releasesTable).omit({ id: true, createdAt: true });
export type InsertRelease = z.infer<typeof insertReleaseSchema>;
export type Release = typeof releasesTable.$inferSelect;
