import type { Request, Response, NextFunction } from "express";
import { SuggestPreprocessingRequestSchema } from "./validation/suggestRequest.schema";
import { suggestPreprocessingService } from "./preprocessing-suggest.services"; // adjust import path
// or "../services" depending on your structure

export async function suggestPreprocessingController(req: Request, res: Response, next: NextFunction) {
  try {
const payload = SuggestPreprocessingRequestSchema.parse(req.body);

    const result = await suggestPreprocessingService({
      payload,
    });

    return res.status(200).json(result);
  } catch (err: any) {
    // If you have centralized error handling, just next(err)
    return next(err);
  }
}
