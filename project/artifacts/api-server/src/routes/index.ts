import { Router, type IRouter } from "express";
import healthRouter from "./health";
import bankingRouter from "./banking";
import scoringRouter from "./scoring";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/banking", bankingRouter);
router.use("/banking", scoringRouter);

export default router;
