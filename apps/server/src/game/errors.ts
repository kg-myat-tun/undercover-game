export class RoomError extends Error {
  constructor(
    public readonly code:
      | "BAD_REQUEST"
      | "ROOM_NOT_FOUND"
      | "ROOM_FULL"
      | "DUPLICATE_NICKNAME"
      | "NOT_HOST"
      | "INVALID_PHASE"
      | "NOT_YOUR_TURN"
      | "PLAYER_NOT_FOUND",
    message: string,
  ) {
    super(message)
  }
}
