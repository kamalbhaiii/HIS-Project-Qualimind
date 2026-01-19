import { Router } from "express";
import { authMiddleware } from "../../middlewares/protectedRoutes";
import { generateInsightsController } from "./insights.controllers";

const router = Router();

// POST /api/insights
router.post("/", authMiddleware, generateInsightsController);

export default router;
