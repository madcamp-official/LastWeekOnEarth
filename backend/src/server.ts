import { app } from "./app";
import { env } from "./config/env";
import { startScheduledMailRunner } from "./lib/scheduledMailRunner";

app.listen(env.PORT, () => {
  console.log(`Backend listening on http://localhost:${env.PORT}`);
  startScheduledMailRunner();
});
