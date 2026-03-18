import { z } from "zod"

export const roomCodeSchema = z
  .string()
  .trim()
  .min(4)
  .max(6)
  .regex(/^[A-Z0-9]+$/)

export const nicknameSchema = z.string().trim().min(2).max(18)

export const playerSessionIdSchema = z.string().uuid()
export const playerIdSchema = z.string().uuid()
export const roomIdSchema = z.string().uuid()
export const localeSchema = z.enum(["en", "my"])

export const createRoomInputSchema = z.object({
  nickname: nicknameSchema,
  wordPackId: z.string().optional(),
  locale: localeSchema.optional(),
})

export const joinRoomInputSchema = z.object({
  roomCode: roomCodeSchema,
  nickname: nicknameSchema,
  playerSessionId: playerSessionIdSchema.optional(),
})

export const reconnectRoomInputSchema = z.object({
  roomCode: roomCodeSchema,
  playerSessionId: playerSessionIdSchema,
})

export const leaveRoomInputSchema = z.object({
  roomCode: roomCodeSchema,
  playerSessionId: playerSessionIdSchema,
})

export const kickPlayerInputSchema = z.object({
  roomCode: roomCodeSchema,
  playerSessionId: playerSessionIdSchema,
  targetPlayerId: playerIdSchema,
})

export const startRoundInputSchema = z.object({
  roomCode: roomCodeSchema,
  playerSessionId: playerSessionIdSchema,
})

export const continueRoundInputSchema = startRoundInputSchema

export const updateWordPackInputSchema = z.object({
  roomCode: roomCodeSchema,
  playerSessionId: playerSessionIdSchema,
  wordPackId: z.string().min(1),
})

export const updateLocaleInputSchema = z.object({
  roomCode: roomCodeSchema,
  playerSessionId: playerSessionIdSchema,
  locale: localeSchema,
})

export const submitClueInputSchema = z.object({
  roomCode: roomCodeSchema,
  playerSessionId: playerSessionIdSchema,
  clue: z.string().trim().min(1).max(48),
})

export const submitVoteInputSchema = z.object({
  roomCode: roomCodeSchema,
  playerSessionId: playerSessionIdSchema,
  targetPlayerId: playerIdSchema.nullable(),
})

export const roomQuerySchema = z.object({
  roomCode: roomCodeSchema,
})

export const playerSchema = z.object({
  id: playerIdSchema,
  sessionId: playerSessionIdSchema,
  nickname: nicknameSchema,
  isHost: z.boolean(),
  isConnected: z.boolean(),
  joinedAt: z.number(),
  eliminatedAt: z.number().nullable(),
})

export const publicPlayerSchema = playerSchema.omit({
  sessionId: true,
})

export const clueSchema = z.object({
  playerId: playerIdSchema,
  clue: z.string(),
  submittedAt: z.number(),
})

export const voteSchema = z.object({
  voterId: playerIdSchema,
  targetPlayerId: playerIdSchema.nullable(),
  submittedAt: z.number(),
})

export const roundOutcomeSchema = z.object({
  winner: z.enum(["civilians", "undercover"]),
  eliminatedPlayerId: playerIdSchema.nullable(),
  reason: z.enum(["undercover-found", "undercover-survived", "tie-break", "vote-skipped"]),
})

export const voteResolutionReasonSchema = z.enum(["eliminated", "vote-skipped", "tie"])

export const roundPhaseSchema = z.enum([
  "lobby",
  "role-reveal",
  "clue-entry",
  "voting",
  "round-resolution",
  "results",
])

export const roundStateSchema = z.object({
  gameNumber: z.number().int().nonnegative(),
  roundNumber: z.number().int().nonnegative(),
  phase: roundPhaseSchema,
  currentTurnPlayerId: playerIdSchema.nullable(),
  activePlayerIds: z.array(playerIdSchema),
  clues: z.array(clueSchema),
  votes: z.array(voteSchema),
  eliminatedPlayerId: playerIdSchema.nullable(),
  resolutionReason: voteResolutionReasonSchema.nullable(),
  undercoverPlayerId: playerIdSchema.nullable(),
  civilianWord: z.string().nullable(),
  undercoverWord: z.string().nullable(),
  outcome: roundOutcomeSchema.nullable(),
})

export const scoreBoardSchema = z.record(z.string(), z.number())

export const roomSchema = z.object({
  id: roomIdSchema,
  code: roomCodeSchema,
  wordPackId: z.string(),
  locale: localeSchema,
  createdAt: z.number(),
  players: z.array(playerSchema).min(1).max(8),
  round: roundStateSchema,
  scoreboard: scoreBoardSchema,
})

export const publicRoundStateSchema = roundStateSchema
  .omit({
    undercoverPlayerId: true,
    civilianWord: true,
    undercoverWord: true,
  })
  .extend({
    revealedUndercoverPlayerId: playerIdSchema.nullable(),
  })

export const publicRoomSchema = roomSchema.extend({
  players: z.array(publicPlayerSchema).min(1).max(8),
  round: publicRoundStateSchema,
})

export const roomSummarySchema = publicRoomSchema.omit({
  id: true,
})

export type CreateRoomInput = z.infer<typeof createRoomInputSchema>
export type JoinRoomInput = z.infer<typeof joinRoomInputSchema>
export type ReconnectRoomInput = z.infer<typeof reconnectRoomInputSchema>
export type LeaveRoomInput = z.infer<typeof leaveRoomInputSchema>
export type KickPlayerInput = z.infer<typeof kickPlayerInputSchema>
export type StartRoundInput = z.infer<typeof startRoundInputSchema>
export type ContinueRoundInput = z.infer<typeof continueRoundInputSchema>
export type UpdateWordPackInput = z.infer<typeof updateWordPackInputSchema>
export type UpdateLocaleInput = z.infer<typeof updateLocaleInputSchema>
export type SubmitClueInput = z.infer<typeof submitClueInputSchema>
export type SubmitVoteInput = z.infer<typeof submitVoteInputSchema>
export type AppLocale = z.infer<typeof localeSchema>
export type Player = z.infer<typeof playerSchema>
export type PublicPlayer = z.infer<typeof publicPlayerSchema>
export type ClueSubmission = z.infer<typeof clueSchema>
export type Vote = z.infer<typeof voteSchema>
export type RoundOutcome = z.infer<typeof roundOutcomeSchema>
export type VoteResolutionReason = z.infer<typeof voteResolutionReasonSchema>
export type RoundPhase = z.infer<typeof roundPhaseSchema>
export type RoundState = z.infer<typeof roundStateSchema>
export type Room = z.infer<typeof roomSchema>
export type PublicRoundState = z.infer<typeof publicRoundStateSchema>
export type PublicRoom = z.infer<typeof publicRoomSchema>
