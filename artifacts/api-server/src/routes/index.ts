import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import articlesRouter from "./articles";
import releasesRouter from "./releases";
import supportRouter from "./support";
import accountRouter from "./account";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(articlesRouter);
router.use(releasesRouter);
router.use(supportRouter);
router.use(accountRouter);
router.use(adminRouter);

export default router;
