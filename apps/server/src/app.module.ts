import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"

import { RoomQueryService } from "./game/room-query.service.js"
import { RoomService } from "./game/room.service.js"
import { HealthController } from "./health.controller.js"
import { RoomStoreFactory } from "./redis/room-store.factory.js"
import { ROOM_STORE } from "./redis/room-store.js"
import { RoomController } from "./room.controller.js"
import { RoomGateway } from "./socket/room.gateway.js"

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [HealthController, RoomController],
  providers: [
    RoomGateway,
    RoomQueryService,
    RoomService,
    RoomStoreFactory,
    {
      provide: ROOM_STORE,
      useFactory: (roomStoreFactory: RoomStoreFactory) => roomStoreFactory.getStore(),
      inject: [RoomStoreFactory],
    },
  ],
})
export class AppModule {}
