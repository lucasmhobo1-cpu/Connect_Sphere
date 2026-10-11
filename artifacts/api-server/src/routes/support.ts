import { Router, type IRouter } from "express";
import { db, newsletterSubscriptionsTable, supportRequestsTable } from "@workspace/db";
import {
  CreateSupportRequestBody,
  CreateSupportRequestResponse,
  SubscribeNewsletterBody,
  SubscribeNewsletterResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/support-requests", async (req, res): Promise<void> => {
  const parsed = CreateSupportRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [request] = await db
    .insert(supportRequestsTable)
    .values(parsed.data)
    .returning({ id: supportRequestsTable.id, status: supportRequestsTable.status });
  res.status(201).json(
    CreateSupportRequestResponse.parse({
      id: request.id,
      status: request.status,
      message: "Your support request has been received.",
    }),
  );
});

router.post("/newsletter-subscriptions", async (req, res): Promise<void> => {
  const parsed = SubscribeNewsletterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await db
    .insert(newsletterSubscriptionsTable)
    .values({ email: parsed.data.email.trim().toLowerCase() })
    .onConflictDoUpdate({
      target: newsletterSubscriptionsTable.email,
      set: { isActive: true },
    });
  res.status(201).json(
    SubscribeNewsletterResponse.parse({
      subscribed: true,
      message: "Your email has been added to the Connect Sphere newsletter list.",
    }),
  );
});

export default router;
