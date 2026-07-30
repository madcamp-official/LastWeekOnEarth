import { io, type Socket } from "socket.io-client";
import Config from "../config";
import { useAuthStore } from "../store/useAuthStore";

// Socket.IO는 Express의 /api 라우터가 아니라 그 밑의 http.Server 자체에 붙어있어서,
// API_BASE_URL에서 /api 접미사를 떼어낸 호스트로 접속해야 한다.
const SOCKET_URL = Config.API_BASE_URL.replace(/\/api\/?$/, "");

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    transports: ["websocket"],
    // 재연결 때마다(토큰 갱신 이후 포함) 항상 최신 accessToken을 읽어서 인증한다.
    auth: (cb) => cb({ token: useAuthStore.getState().accessToken }),
  });

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}
