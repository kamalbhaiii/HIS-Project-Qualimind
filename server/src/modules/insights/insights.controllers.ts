import type { Request, Response, NextFunction } from "express";
import { generateInsightsService } from "./insights.services";

export async function generateInsightsController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await generateInsightsService({ payload: req.body });
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}
