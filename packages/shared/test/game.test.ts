import { describe, expect, it } from "vitest"

import {
  allVotesSubmitted,
  continueRound,
  createEmptyRound,
  createRound,
  determineOutcome,
  finalizeRound,
  getActivePlayers,
  getRoleForPlayer,
  getWordPack,
  isWordPackAvailableInLocale,
  normalizeWordPackId,
  type Room,
  resolveVotes,
  shufflePlayers,
  submitClue,
  submitVote,
  toPublicRoom,
} from "../src"

function makeRoom(): Room {
  return {
    id: "7e8a19d0-b93a-4976-a6dc-f9a7495b1f8e",
    code: "ABCD",
    wordPackId: "classic",
    locale: "en",
    createdAt: Date.now(),
    players: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        sessionId: "11111111-1111-4111-8111-111111111112",
        nickname: "Avery",
        isHost: true,
        isConnected: true,
        joinedAt: 1,
        eliminatedAt: null,
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        sessionId: "22222222-2222-4222-8222-222222222223",
        nickname: "Blair",
        isHost: false,
        isConnected: true,
        joinedAt: 2,
        eliminatedAt: null,
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        sessionId: "33333333-3333-4333-8333-333333333334",
        nickname: "Casey",
        isHost: false,
        isConnected: true,
        joinedAt: 3,
        eliminatedAt: null,
      },
      {
        id: "44444444-4444-4444-8444-444444444444",
        sessionId: "44444444-4444-4444-8444-444444444445",
        nickname: "Devon",
        isHost: false,
        isConnected: true,
        joinedAt: 4,
        eliminatedAt: null,
      },
    ],
    round: createEmptyRound(),
    scoreboard: {},
  }
}

function makeVotingRound(room: Room, overrides: Partial<Room["round"]> = {}): Room["round"] {
  return {
    ...createRound(room, () => 0.1),
    activePlayerIds: room.players.map((player) => player.id),
    currentTurnPlayerId: null,
    phase: "voting",
    ...overrides,
  }
}

describe("game engine", () => {
  it("creates an empty lobby round", () => {
    const round = createEmptyRound()

    expect(round.gameNumber).toBe(0)
    expect(round.roundNumber).toBe(0)
    expect(round.phase).toBe("lobby")
    expect(round.activePlayerIds).toEqual([])
    expect(round.clues).toEqual([])
    expect(round.votes).toEqual([])
    expect(round.resolutionReason).toBeNull()
    expect(round.outcome).toBeNull()
  })

  it("assigns exactly one undercover and one shared word pair", () => {
    const room = makeRoom()
    const values = [0.2, 0.8, 0.1, 0.3, 0.4]
    let index = 0
    const round = createRound(room, () => values[index++] ?? 0.1)

    expect(round.phase).toBe("clue-entry")
    expect(round.undercoverPlayerId).toBeTruthy()
    expect(round.gameNumber).toBe(1)
    expect(round.roundNumber).toBe(1)
    expect(round.activePlayerIds).toHaveLength(room.players.length)
    expect(round.activePlayerIds.includes(round.undercoverPlayerId!)).toBe(true)
    expect(round.civilianWord).toBeTruthy()
    expect(round.undercoverWord).toBeTruthy()
    expect(round.civilianWord).not.toBe(round.undercoverWord)
  })

  it("falls back to Myanmar gameplay words when the room locale is Myanmar", () => {
    const room = makeRoom()
    room.locale = "my"
    room.wordPackId = "tech-media"

    const round = createRound(room, () => 0.1)

    expect(round.civilianWord).toBeTruthy()
    expect(round.undercoverWord).toBeTruthy()
    expect(/[က-႟]/u.test(round.civilianWord ?? "")).toBe(true)
    expect(/[က-႟]/u.test(round.undercoverWord ?? "")).toBe(true)
  })

  it("maps the legacy myanmar-classic pack id to classic", () => {
    expect(normalizeWordPackId("myanmar-classic")).toBe("classic")
    expect(getWordPack("myanmar-classic", "my").id).toBe("classic")
  })

  it("reports locale availability for pack variants", () => {
    expect(isWordPackAvailableInLocale("classic", "my")).toBe(true)
    expect(isWordPackAvailableInLocale("food-drink", "my")).toBe(true)
    expect(isWordPackAvailableInLocale("city-life", "my")).toBe(true)
    expect(isWordPackAvailableInLocale("home-daily", "my")).toBe(true)
    expect(isWordPackAvailableInLocale("travel-nature", "my")).toBe(true)
    expect(isWordPackAvailableInLocale("sports-hobbies", "my")).toBe(true)
    expect(isWordPackAvailableInLocale("school-work", "my")).toBe(true)
    expect(isWordPackAvailableInLocale("tech-media", "my")).toBe(true)
    expect(isWordPackAvailableInLocale("hard-mode", "my")).toBe(true)
    expect(isWordPackAvailableInLocale("family-fun", "my")).toBe(true)
    expect(isWordPackAvailableInLocale("tech-media", "en")).toBe(true)
  })

  it("keeps a supported Myanmar pack instead of falling back to classic", () => {
    const pack = getWordPack("food-drink", "my")

    expect(pack.id).toBe("food-drink")
    expect(pack.locale).toBe("my")
    expect(/[က-႟]/u.test(pack.pairs[0]?.civilian ?? "")).toBe(true)
  })

  it("starts a new game after results and resets the round number", () => {
    const room = makeRoom()
    room.round = {
      ...createEmptyRound(),
      gameNumber: 4,
      roundNumber: 3,
      phase: "results",
    }

    const nextRound = createRound(room, () => 0.1)

    expect(nextRound.gameNumber).toBe(5)
    expect(nextRound.roundNumber).toBe(1)
    expect(nextRound.phase).toBe("clue-entry")
  })

  it("falls back cleanly when older room state has no game number", () => {
    const room = makeRoom()
    room.round = {
      ...createEmptyRound(),
      gameNumber: undefined as never,
      roundNumber: 2,
      phase: "results",
    }

    const nextRound = createRound(room, () => 0.1)
    expect(nextRound.gameNumber).toBe(1)
    expect(nextRound.roundNumber).toBe(1)
  })

  it("returns all players as active during the lobby", () => {
    const room = makeRoom()
    expect(getActivePlayers(room).map((player) => player.id)).toEqual(
      room.players.map((player) => player.id),
    )
  })

  it("returns only active players once a round has started", () => {
    const room = makeRoom()
    room.round = createRound(room, () => 0.1)
    room.round.activePlayerIds = [room.players[0].id, room.players[2].id]

    expect(getActivePlayers(room).map((player) => player.id)).toEqual([
      room.players[0].id,
      room.players[2].id,
    ])
  })

  it("shuffles deterministically with the provided random source", () => {
    const room = makeRoom()
    const values = [0.9, 0.1, 0.4, 0.2]
    let index = 0
    const shuffled = shufflePlayers(room.players, () => values[index++] ?? 0.1)

    expect(shuffled.map((player) => player.id)).not.toEqual(room.players.map((player) => player.id))
    expect(new Set(shuffled.map((player) => player.id)).size).toBe(room.players.length)
  })

  it("returns the right role for each player", () => {
    const room = makeRoom()
    const round = makeVotingRound(room, {
      undercoverPlayerId: room.players[2].id,
    })

    expect(getRoleForPlayer(round, room.players[2].id)).toBe("undercover")
    expect(getRoleForPlayer(round, room.players[0].id)).toBe("civilian")
  })

  it("advances clue turns and opens voting after the last clue", () => {
    const room = makeRoom()
    room.round = createRound(room, () => 0.1)

    const [first, second, third, fourth] = room.round.activePlayerIds
    const afterFirst = submitClue(room.round, first, "Hot")
    const afterSecond = submitClue(afterFirst, second, "Morning")
    const afterThird = submitClue(afterSecond, third, "Mug")
    const afterFourth = submitClue(afterThird, fourth, "Steam")

    expect(afterFirst.phase).toBe("clue-entry")
    expect(afterFirst.currentTurnPlayerId).toBe(second)
    expect(afterSecond.currentTurnPlayerId).toBe(third)
    expect(afterThird.currentTurnPlayerId).toBe(fourth)
    expect(afterFourth.phase).toBe("voting")
    expect(afterFourth.currentTurnPlayerId).toBeNull()
    expect(afterFourth.clues).toHaveLength(4)
  })

  it("tracks vote submission completion against active players", () => {
    const room = makeRoom()
    let round = makeVotingRound(room)

    expect(allVotesSubmitted(round)).toBe(false)

    round = submitVote(round, room.players[0].id, room.players[1].id)
    round = submitVote(round, room.players[1].id, room.players[1].id)
    round = submitVote(round, room.players[2].id, room.players[1].id)

    expect(allVotesSubmitted(round)).toBe(false)

    round = submitVote(round, room.players[3].id, room.players[1].id)
    expect(allVotesSubmitted(round)).toBe(true)
  })

  it("resolves skip when skip votes meet the top vote count", () => {
    const room = makeRoom()
    const round = makeVotingRound(room, {
      votes: [
        { voterId: room.players[0].id, targetPlayerId: room.players[1].id, submittedAt: 1 },
        { voterId: room.players[1].id, targetPlayerId: room.players[1].id, submittedAt: 2 },
        { voterId: room.players[2].id, targetPlayerId: null, submittedAt: 3 },
        { voterId: room.players[3].id, targetPlayerId: null, submittedAt: 4 },
      ],
    })

    expect(resolveVotes(round)).toEqual({
      eliminatedPlayerId: null,
      reason: "vote-skipped",
    })
  })

  it("resolves tied player votes with no elimination", () => {
    const room = makeRoom()
    const round = makeVotingRound(room, {
      votes: [
        { voterId: room.players[0].id, targetPlayerId: room.players[2].id, submittedAt: 1 },
        { voterId: room.players[1].id, targetPlayerId: room.players[1].id, submittedAt: 2 },
        { voterId: room.players[2].id, targetPlayerId: room.players[2].id, submittedAt: 3 },
        { voterId: room.players[3].id, targetPlayerId: room.players[1].id, submittedAt: 4 },
      ],
    })

    expect(resolveVotes(round)).toEqual({
      eliminatedPlayerId: null,
      reason: "tie",
    })
  })

  it("detects civilian victory when the undercover is eliminated", () => {
    const room = makeRoom()
    const outcome = determineOutcome({
      ...makeVotingRound(room, {
        undercoverPlayerId: room.players[1].id,
      }),
      activePlayerIds: room.players.map((player) => player.id),
      eliminatedPlayerId: room.players[1].id,
    })

    expect(outcome).toEqual({
      winner: "civilians",
      eliminatedPlayerId: room.players[1].id,
      reason: "undercover-found",
    })
  })

  it("detects undercover victory when only two players remain and undercover survives", () => {
    const room = makeRoom()
    const outcome = determineOutcome({
      ...makeVotingRound(room, {
        undercoverPlayerId: room.players[3].id,
      }),
      activePlayerIds: [room.players[0].id, room.players[2].id, room.players[3].id],
      eliminatedPlayerId: room.players[2].id,
    })

    expect(outcome).toEqual({
      winner: "undercover",
      eliminatedPlayerId: room.players[2].id,
      reason: "undercover-survived",
    })
  })

  it("continues the same game when a civilian is eliminated but the game is not over", () => {
    const room = makeRoom()
    room.round = makeVotingRound(room, {
      gameNumber: 2,
      roundNumber: 1,
      undercoverPlayerId: room.players[3].id,
      votes: [
        { voterId: room.players[0].id, targetPlayerId: room.players[1].id, submittedAt: 1 },
        { voterId: room.players[1].id, targetPlayerId: room.players[1].id, submittedAt: 2 },
        { voterId: room.players[2].id, targetPlayerId: room.players[1].id, submittedAt: 3 },
        { voterId: room.players[3].id, targetPlayerId: room.players[1].id, submittedAt: 4 },
      ],
    })

    const finalized = finalizeRound(room)

    expect(finalized.round.phase).toBe("round-resolution")
    expect(finalized.round.gameNumber).toBe(2)
    expect(finalized.round.roundNumber).toBe(1)
    expect(finalized.round.eliminatedPlayerId).toBe(room.players[1].id)
    expect(finalized.round.resolutionReason).toBe("eliminated")
    expect(finalized.round.activePlayerIds).toEqual([
      room.players[0].id,
      room.players[2].id,
      room.players[3].id,
    ])
    expect(finalized.round.votes).toHaveLength(4)
    expect(finalized.round.outcome).toBeNull()
  })

  it("restarts clue cycle with no elimination when skip wins", () => {
    const room = makeRoom()
    room.round = makeVotingRound(room, {
      gameNumber: 1,
      roundNumber: 1,
      votes: room.players.map((player, index) => ({
        voterId: player.id,
        targetPlayerId: index < 2 ? null : room.players[0].id,
        submittedAt: index + 1,
      })),
    })

    const finalized = finalizeRound(room)

    expect(finalized.round.phase).toBe("round-resolution")
    expect(finalized.round.gameNumber).toBe(1)
    expect(finalized.round.roundNumber).toBe(1)
    expect(finalized.round.eliminatedPlayerId).toBeNull()
    expect(finalized.round.resolutionReason).toBe("vote-skipped")
    expect(finalized.round.outcome).toBeNull()
    expect(finalized.round.votes).toHaveLength(4)
  })

  it("keeps votes for the results screen when the game ends", () => {
    const room = makeRoom()
    room.round = makeVotingRound(room, {
      undercoverPlayerId: room.players[1].id,
      votes: room.players.map((player, index) => ({
        voterId: player.id,
        targetPlayerId: room.players[1].id,
        submittedAt: index + 1,
      })),
    })

    const finalized = finalizeRound(room)

    expect(finalized.round.phase).toBe("results")
    expect(finalized.round.votes).toHaveLength(room.players.length)
    expect(finalized.round.resolutionReason).toBe("eliminated")
    expect(finalized.round.outcome?.winner).toBe("civilians")
  })

  it("continues from round resolution into a fresh clue round", () => {
    const room = makeRoom()
    room.round = {
      ...makeVotingRound(room, {
        gameNumber: 2,
        roundNumber: 3,
        undercoverPlayerId: room.players[3].id,
        votes: [
          { voterId: room.players[0].id, targetPlayerId: room.players[1].id, submittedAt: 1 },
          { voterId: room.players[1].id, targetPlayerId: room.players[1].id, submittedAt: 2 },
          { voterId: room.players[2].id, targetPlayerId: room.players[1].id, submittedAt: 3 },
          { voterId: room.players[3].id, targetPlayerId: room.players[1].id, submittedAt: 4 },
        ],
      }),
    }

    const resolved = finalizeRound(room)
    const continued = continueRound(resolved)

    expect(continued.round.phase).toBe("clue-entry")
    expect(continued.round.gameNumber).toBe(2)
    expect(continued.round.roundNumber).toBe(4)
    expect(continued.round.eliminatedPlayerId).toBeNull()
    expect(continued.round.resolutionReason).toBeNull()
    expect(continued.round.votes).toEqual([])
    expect(continued.round.clues).toEqual([])
  })

  it("awards scoreboard points only to the winning side", () => {
    const room = makeRoom()
    room.round = makeVotingRound(room, {
      undercoverPlayerId: room.players[2].id,
      activePlayerIds: [room.players[0].id, room.players[1].id, room.players[2].id],
      votes: [
        { voterId: room.players[0].id, targetPlayerId: room.players[1].id, submittedAt: 1 },
        { voterId: room.players[1].id, targetPlayerId: room.players[1].id, submittedAt: 2 },
        { voterId: room.players[2].id, targetPlayerId: room.players[1].id, submittedAt: 3 },
      ],
    })

    const finalized = finalizeRound(room)

    expect(finalized.round.outcome?.winner).toBe("undercover")
    expect(finalized.scoreboard[room.players[2].id]).toBe(1)
    expect(finalized.scoreboard[room.players[0].id]).toBe(0)
    expect(finalized.scoreboard[room.players[1].id]).toBe(0)
    expect(finalized.scoreboard[room.players[3].id]).toBe(0)
  })

  it("hides secret information from public rooms before results", () => {
    const room = makeRoom()
    room.round = createRound(room, () => 0.1)

    const publicRoom = toPublicRoom(room)

    expect(publicRoom.players.every((player) => !("sessionId" in player))).toBe(true)
    expect(publicRoom.round.revealedUndercoverPlayerId).toBeNull()
    expect("civilianWord" in publicRoom.round).toBe(false)
    expect("undercoverWord" in publicRoom.round).toBe(false)
    expect("undercoverPlayerId" in publicRoom.round).toBe(false)
  })

  it("reveals the undercover publicly after results", () => {
    const room = makeRoom()
    room.round = makeVotingRound(room, {
      phase: "results",
      undercoverPlayerId: room.players[3].id,
      outcome: {
        winner: "undercover",
        eliminatedPlayerId: room.players[1].id,
        reason: "undercover-survived",
      },
    })

    const publicRoom = toPublicRoom(room)

    expect(publicRoom.round.revealedUndercoverPlayerId).toBe(room.players[3].id)
  })
})
