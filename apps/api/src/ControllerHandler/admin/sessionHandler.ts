import type { Request, Response } from "express";
export function getAdminSession(
  req: Request & { user?: { id: number; role: string; status: string } },
  res: Response,
) {
  if (req.user?.role !== "ADMIN" || req.user.status !== "ACTIVE") {
    res
      .status(403)
      .json({ message: "An active administrator account is required." });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res
    .status(200)
    .json({
      admin: { id: req.user.id, role: req.user.role, status: req.user.status },
    });
}
