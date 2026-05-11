import { Request, Response, NextFunction } from "express";
export interface CustomRequest extends Request {
    userId?: number;
}
export declare const check: (req: CustomRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=check.d.ts.map