import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const supportRequestsTable = pgTable("support_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  category: text("category").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSupportRequestSchema = createInsertSchema(supportRequestsTable).omit({ id: true, status: true, createdAt: true });
export type InsertSupportRequest = z.infer<typeof insertSupportRequestSchema>;
export type SupportRequest = typeof supportRequestsTable.$inferSelect;
