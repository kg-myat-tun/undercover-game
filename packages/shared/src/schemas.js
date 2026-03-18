import { z } from "zod";
export const roomCodeSchema = z
    .string()
    .trim()
    .min(4)
    .max(6)
    .regex(/^[A-Z0-9]+$/);
export const nicknameSchema = z.string().trim().min(2).max(18);
export const playerSessionIdSchema = z.string().uuid();
export const playerIdSchema = z.string().uuid();
export const roomIdSchema = z.string().uuid();
export const createRoomInputSchema = z.object({
    nickname: nicknameSchema,
    wordPackId: z.string().optional()
});
export const joinRoomInputSchema = z.object({
    roomCode: roomCodeSchema,
    nickname: nicknameSchema,
    playerSessionId: playerSessionIdSchema.optional()
});
export const reconnectRoomInputSchema = z.object({
    roomCode: roomCodeSchema,
    playerSessionId: playerSessionIdSchema
});
export const leaveRoomInputSchema = z.object({
    roomCode: roomCodeSchema,
    playerSessionId: playerSessionIdSchema
});
export const kickPlayerInputSchema = z.object({
    roomCode: roomCodeSchema,
    playerSessionId: playerSessionIdSchema,
    targetPlayerId: playerIdSchema
});
export const startRoundInputSchema = z.object({
    roomCode: roomCodeSchema,
    playerSessionId: playerSessionIdSchema
});
export const submitClueInputSchema = z.object({
    roomCode: roomCodeSchema,
    playerSessionId: playerSessionIdSchema,
    clue: z.string().trim().min(1).max(48)
});
export const submitVoteInputSchema = z.object({
    roomCode: roomCodeSchema,
    playerSessionId: playerSessionIdSchema,
    targetPlayerId: playerIdSchema
});
export const roomQuerySchema = z.object({
    roomCode: roomCodeSchema
});
export const playerSchema = z.object({
    id: playerIdSchema,
    sessionId: playerSessionIdSchema,
    nickname: nicknameSchema,
    isHost: z.boolean(),
    isConnected: z.boolean(),
    joinedAt: z.number(),
    eliminatedAt: z.number().nullable()
});
export const publicPlayerSchema = playerSchema.omit({
    sessionId: true
});
export const clueSchema = z.object({
    playerId: playerIdSchema,
    clue: z.string(),
    submittedAt: z.number()
});
export const voteSchema = z.object({
    voterId: playerIdSchema,
    targetPlayerId: playerIdSchema,
    submittedAt: z.number()
});
export const roundOutcomeSchema = z.object({
    winner: z.enum(["civilians", "undercover"]),
    eliminatedPlayerId: playerIdSchema.nullable(),
    reason: z.enum(["undercover-found", "undercover-survived", "tie-break"])
});
export const roundPhaseSchema = z.enum([
    "lobby",
    "role-reveal",
    "clue-entry",
    "voting",
    "results"
]);
export const roundStateSchema = z.object({
    roundNumber: z.number().int().nonnegative(),
    phase: roundPhaseSchema,
    currentTurnPlayerId: playerIdSchema.nullable(),
    activePlayerIds: z.array(playerIdSchema),
    clues: z.array(clueSchema),
    votes: z.array(voteSchema),
    eliminatedPlayerId: playerIdSchema.nullable(),
    undercoverPlayerId: playerIdSchema.nullable(),
    civilianWord: z.string().nullable(),
    undercoverWord: z.string().nullable(),
    outcome: roundOutcomeSchema.nullable()
});
export const scoreBoardSchema = z.record(z.string(), z.number());
export const roomSchema = z.object({
    id: roomIdSchema,
    code: roomCodeSchema,
    wordPackId: z.string(),
    createdAt: z.number(),
    players: z.array(playerSchema).min(1).max(8),
    round: roundStateSchema,
    scoreboard: scoreBoardSchema
});
export const publicRoundStateSchema = roundStateSchema.omit({
    undercoverPlayerId: true,
    civilianWord: true,
    undercoverWord: true
});
export const publicRoomSchema = roomSchema.extend({
    players: z.array(publicPlayerSchema).min(1).max(8),
    round: publicRoundStateSchema
});
export const roomSummarySchema = publicRoomSchema.omit({
    id: true
});
//# sourceMappingURL=schemas.js.map