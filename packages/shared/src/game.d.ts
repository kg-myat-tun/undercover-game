import type { Player, PublicRoom, RoundOutcome, RoundState, Room } from "./schemas.js";
export type Role = "civilian" | "undercover";
export declare function createEmptyRound(): RoundState;
export declare function getActivePlayers(room: Room): Player[];
export declare function chooseUndercover(players: Player[], random?: () => number): Player;
export declare function shufflePlayers(players: Player[], random?: () => number): Player[];
export declare function createRound(room: Room, random?: () => number): RoundState;
export declare function getRoleForPlayer(round: RoundState, playerId: string): Role;
export declare function submitClue(round: RoundState, playerId: string, clue: string): RoundState;
export declare function submitVote(round: RoundState, voterId: string, targetPlayerId: string): RoundState;
export declare function allVotesSubmitted(round: RoundState): boolean;
export declare function resolveVotes(round: RoundState): {
    eliminatedPlayerId: string;
    reason: RoundOutcome["reason"];
};
export declare function determineOutcome(round: RoundState): RoundOutcome | null;
export declare function finalizeRound(room: Room): Room;
export declare function isRoundOver(room: Room): boolean;
export declare function toPublicRoom(room: Room): PublicRoom;
