import type { CreateRoomInput, JoinRoomInput, KickPlayerInput, LeaveRoomInput, PublicRoom, ReconnectRoomInput, StartRoundInput, SubmitClueInput, SubmitVoteInput } from "./schemas.js";
export type RoomSnapshot = {
    room: PublicRoom;
    selfPlayerId: string;
};
export type RolePayload = {
    roomCode: string;
    playerId: string;
    role: "civilian" | "undercover";
    word: string;
};
export type ServerErrorPayload = {
    message: string;
    code: "BAD_REQUEST" | "ROOM_NOT_FOUND" | "ROOM_FULL" | "DUPLICATE_NICKNAME" | "NOT_HOST" | "INVALID_PHASE" | "NOT_YOUR_TURN" | "PLAYER_NOT_FOUND";
};
export interface ClientToServerEvents {
    "room:create": (input: CreateRoomInput, callback: (result: {
        roomCode: string;
        playerSessionId: string;
    }) => void) => void;
    "room:join": (input: JoinRoomInput, callback: (result: {
        roomCode: string;
        playerSessionId: string;
    }) => void) => void;
    "room:reconnect": (input: ReconnectRoomInput) => void;
    "room:leave": (input: LeaveRoomInput) => void;
    "room:kick": (input: KickPlayerInput) => void;
    "round:start": (input: StartRoundInput) => void;
    "round:clue": (input: SubmitClueInput) => void;
    "round:vote": (input: SubmitVoteInput) => void;
}
export interface ServerToClientEvents {
    "room:snapshot": (payload: RoomSnapshot) => void;
    "room:role": (payload: RolePayload) => void;
    "room:error": (payload: ServerErrorPayload) => void;
}
