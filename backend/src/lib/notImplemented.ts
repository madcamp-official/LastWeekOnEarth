import type { Request, Response } from "express";

/**
 * 기능 구현 전 API 표면(surface)을 팀과 공유하기 위한 스텁 핸들러.
 * 각 기능을 실제로 구현할 때 이 핸들러를 대체한다.
 */
export function notImplemented(req: Request, res: Response) {
  res.status(501).json({
    error: "Not implemented",
    route: `${req.method} ${req.baseUrl}${req.path}`,
  });
}
