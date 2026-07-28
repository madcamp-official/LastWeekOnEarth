import { app } from "./app";
import { env } from "./config/env";
import { startScheduledMailRunner } from "./lib/scheduledMailRunner";
import { startContactReminderRunner } from "./lib/contactReminderRunner";

app.listen(env.PORT, () => {
  console.log(`Backend listening on http://localhost:${env.PORT}`);
  startScheduledMailRunner();
  startContactReminderRunner();
});
