import type { Room } from "@undercover/shared";

export interface RoomStore {
  getRoom(roomCode: string): Promise<Room | null>;
  saveRoom(room: Room): Promise<void>;
  deleteRoom(roomCode: string): Promise<void>;
}
