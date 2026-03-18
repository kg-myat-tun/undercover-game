import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: process.env.CLIENT_ORIGIN ?? "http://localhost:3000",
      credentials: true
    }
  });

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 4000);
}

bootstrap();
