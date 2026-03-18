import type { Room } from "@undercover/shared";

export const ROOM_STORE = Symbol("ROOM_STORE");

export interface RoomStore {
  getRoom(roomCode: string): Promise<Room | null>;
  saveRoom(room: Room): Promise<void>;
  deleteRoom(roomCode: string): Promise<void>;
}
