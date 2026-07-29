import { createServer } from "http";
import { app } from "./app";
import { env } from "./config/env";
import { startScheduledMailRunner } from "./lib/scheduledMailRunner";
import { startContactReminderRunner } from "./lib/contactReminderRunner";
import { initSocket } from "./lib/socket";

// Socket.IO는 Express의 app.listen()이 아니라 그 밑의 raw http.Server에 붙어야 해서,
// http.createServer(app)으로 직접 만들어 app과 소켓 서버가 같은 포트를 공유하게 한다.
const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(env.PORT, () => {
  console.log(`Backend listening on http://localhost:${env.PORT}`);
  startScheduledMailRunner();
  startContactReminderRunner();
});
