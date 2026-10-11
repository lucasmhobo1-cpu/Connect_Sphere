import { integer, pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { releasesTable } from "./releases";
import { usersTable } from "./users";

export const downloadHistoryTable = pgTable("download_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  releaseId: integer("release_id").notNull().references(() => releasesTable.id, { onDelete: "cascade" }),
  downloadedAt: timestamp("downloaded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDownloadHistorySchema = createInsertSchema(downloadHistoryTable).omit({ id: true, downloadedAt: true });
export type InsertDownloadHistory = z.infer<typeof insertDownloadHistorySchema>;
export type DownloadHistory = typeof downloadHistoryTable.$inferSelect;
