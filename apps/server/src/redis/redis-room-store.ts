import type { Room } from "@undercover/shared"
import type { Redis } from "ioredis"

import type { RoomStore } from "./room-store.js"

const ROOM_TTL_SECONDS = 60 * 60 * 8

export class RedisRoomStore implements RoomStore {
  constructor(private readonly redis: Redis) {}

  async getRoom(roomCode: string): Promise<Room | null> {
    const value = await this.redis.get(this.getKey(roomCode))
    return value ? (JSON.parse(value) as Room) : null
  }

  async saveRoom(room: Room): Promise<void> {
    await this.redis.set(this.getKey(room.code), JSON.stringify(room), "EX", ROOM_TTL_SECONDS)
  }

  async deleteRoom(roomCode: string): Promise<void> {
    await this.redis.del(this.getKey(roomCode))
  }

  private getKey(roomCode: string) {
    return `undercover:room:${roomCode}`
  }
}
