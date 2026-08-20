import app from "./app.js";
import env from "./config/env.js";
import connectDatabase from "./config/database.js";
import seedAdmin from "./modules/auth/seedAdmin.js";
import whatsappWorker from "./modules/whatsapp/whatsapp.worker.js";
import whatsappReceiveWorker from "./modules/whatsapp/whatsapp.receive.worker.js";

const startServer = async () => {
  await connectDatabase();
     
   // Seed Super Admin
    await seedAdmin();

  whatsappWorker.startWhatsAppWorker();
  whatsappReceiveWorker.startReceiveWorker();

  app.listen(env.port, () => {
    console.log("======================================");
    console.log(`🚀 Server running on port ${env.port}`);
    console.log(`🌍 Environment : ${env.nodeEnv}`);
    console.log("======================================");
  });
};

startServer();