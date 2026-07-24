import type { NextFunction, Request, Response } from "express";

/**
 * async 라우트 핸들러의 reject를 Express 에러 미들웨어로 전달한다.
 * req를 any로 받아, 호출부에서 AuthenticatedRequest 등 구체 타입으로 좁혀 쓸 수 있게 한다.
 */
export function asyncHandler(
  handler: (req: any, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}
