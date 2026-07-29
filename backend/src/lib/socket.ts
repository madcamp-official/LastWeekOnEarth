import type { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { verifyAccessToken } from "./jwt";

let io: SocketIOServer | undefined;

// 각 유저를 자기 userId 방(room)에만 join시켜서, 특정 유저에게만 보내는 이벤트는 그 방으로만
// emit하면 된다 — 같은 계정으로 여러 기기(폰+웹 등)에 로그인해도 방에 소켓이 여러 개 모여
// 전부 받는다.
export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: "*" },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next(new Error("unauthorized"));
      return;
    }
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.userId;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);
  });

  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(`user:${userId}`).emit(event, payload);
}
