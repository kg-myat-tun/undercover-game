import type { Room } from "@undercover/shared"

import type { RoomStore } from "./room-store.js"

export class InMemoryRoomStore implements RoomStore {
  private readonly rooms = new Map<string, Room>()

  async getRoom(roomCode: string): Promise<Room | null> {
    return this.rooms.get(roomCode) ?? null
  }

  async saveRoom(room: Room): Promise<void> {
    this.rooms.set(room.code, room)
  }

  async deleteRoom(roomCode: string): Promise<void> {
    this.rooms.delete(roomCode)
  }
}
