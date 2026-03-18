import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { HealthController } from "./health.controller.js";
import { RoomController } from "./room.controller.js";
import { RoomService } from "./game/room.service.js";
import { RoomGateway } from "./socket/room.gateway.js";
import { RoomStoreFactory } from "./redis/room-store.factory.js";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [HealthController, RoomController],
  providers: [RoomGateway, RoomService, RoomStoreFactory]
})
export class AppModule {}
