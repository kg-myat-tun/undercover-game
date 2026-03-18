import { Inject, Injectable } from "@nestjs/common";
import {
  getRoleForPlayer,
  toPublicRoom,
  type PublicRoom,
  type Room
} from "@undercover/shared";

import { ROOM_STORE, type RoomStore } from "../redis/room-store.js";
import { RoomError } from "./errors.js";

@Injectable()
export class RoomQueryService {
  constructor(@Inject(ROOM_STORE) private readonly store: RoomStore) {}

  async getPublicRoom(roomCode: string): Promise<PublicRoom> {
    const room = await this.getRoomOrThrow(roomCode);
    return toPublicRoom(room);
  }

  async getPlayerRole(roomCode: string, playerId: string) {
    const room = await this.getRoomOrThrow(roomCode);
    return {
      role: getRoleForPlayer(room.round, playerId),
      word:
        room.round.undercoverPlayerId === playerId
          ? room.round.undercoverWord ?? ""
          : room.round.civilianWord ?? ""
    };
  }

  async getRoomOrThrow(roomCode: string): Promise<Room> {
    const room = await this.store.getRoom(roomCode.toUpperCase());

    if (!room) {
      throw new RoomError("ROOM_NOT_FOUND", "Room not found.");
    }

    return room;
  }
}
