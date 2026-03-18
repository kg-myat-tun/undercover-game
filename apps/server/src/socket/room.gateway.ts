import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets"
import {
  type ClientToServerEvents,
  continueRoundInputSchema,
  createRoomInputSchema,
  joinRoomInputSchema,
  kickPlayerInputSchema,
  leaveRoomInputSchema,
  reconnectRoomInputSchema,
  type ServerErrorPayload,
  type ServerToClientEvents,
  startRoundInputSchema,
  submitClueInputSchema,
  submitVoteInputSchema,
  updateLocaleInputSchema,
  updateWordPackInputSchema,
} from "@undercover/shared"
import type { Server, Socket } from "socket.io"
import { ZodError } from "zod"

import { RoomError } from "../game/errors.js"
import { RoomQueryService } from "../game/room-query.service.js"
import { RoomService } from "../game/room.service.js"

type RoomSocket = Socket<ClientToServerEvents, ServerToClientEvents> & {
  data: {
    roomCode?: string
    playerSessionId?: string
    playerId?: string
  }
}

@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  },
})
export class RoomGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server<ClientToServerEvents, ServerToClientEvents>

  constructor(
    private readonly roomService: RoomService,
    private readonly roomQueryService: RoomQueryService,
  ) {}

  handleConnection() {}

  async handleDisconnect(client: RoomSocket) {
    if (!client.data.roomCode || !client.data.playerSessionId) {
      return
    }

    const room = await this.roomService.disconnect(
      client.data.roomCode,
      client.data.playerSessionId,
    )
    if (room) {
      this.broadcastRoom(room.code)
    }
  }

  @SubscribeMessage("room:create")
  async createRoom(@MessageBody() body: unknown, @ConnectedSocket() client: RoomSocket) {
    try {
      const input = createRoomInputSchema.parse(body)
      const result = await this.roomService.createRoom(input)
      client.data.roomCode = result.roomCode
      client.data.playerSessionId = result.playerSessionId
      client.data.playerId = result.playerId
      await client.join(result.roomCode)
      this.emitRoomSnapshot(result.room.code, result.playerId, client)

      return {
        roomCode: result.roomCode,
        playerSessionId: result.playerSessionId,
      }
    } catch (error) {
      this.emitError(client, error)
      return { roomCode: "", playerSessionId: "" }
    }
  }

  @SubscribeMessage("room:join")
  async joinRoom(@MessageBody() body: unknown, @ConnectedSocket() client: RoomSocket) {
    try {
      const input = joinRoomInputSchema.parse(body)
      const result = await this.roomService.joinRoom({
        ...input,
        roomCode: input.roomCode.toUpperCase(),
      })

      client.data.roomCode = result.roomCode
      client.data.playerSessionId = result.playerSessionId
      client.data.playerId = result.playerId
      await client.join(result.roomCode)
      this.broadcastRoom(result.roomCode)

      return {
        roomCode: result.roomCode,
        playerSessionId: result.playerSessionId,
      }
    } catch (error) {
      this.emitError(client, error)
      return { roomCode: "", playerSessionId: "" }
    }
  }

  @SubscribeMessage("room:reconnect")
  async reconnectRoom(@MessageBody() body: unknown, @ConnectedSocket() client: RoomSocket) {
    try {
      const input = reconnectRoomInputSchema.parse(body)
      const room = await this.roomService.reconnect({
        ...input,
        roomCode: input.roomCode.toUpperCase(),
      })
      const player = room.players.find((item) => item.sessionId === input.playerSessionId)
      if (!player) {
        throw new RoomError("PLAYER_NOT_FOUND", "Could not restore player session.")
      }

      client.data.roomCode = room.code
      client.data.playerSessionId = player.sessionId
      client.data.playerId = player.id
      await client.join(room.code)
      this.broadcastRoom(room.code)

      if (room.round.phase !== "lobby") {
        const role = await this.roomQueryService.getPlayerRole(room.code, player.id)
        client.emit("room:role", {
          roomCode: room.code,
          playerId: player.id,
          role: role.role,
          word: role.word,
        })
      }
    } catch (error) {
      this.emitError(client, error)
    }
  }

  @SubscribeMessage("room:leave")
  async leaveRoom(@MessageBody() body: unknown, @ConnectedSocket() client: RoomSocket) {
    try {
      const input = leaveRoomInputSchema.parse(body)
      const room = await this.roomService.leaveRoom({
        ...input,
        roomCode: input.roomCode.toUpperCase(),
      })

      if (room) {
        this.broadcastRoom(room.code)
      }

      client.leave(input.roomCode.toUpperCase())
    } catch (error) {
      this.emitError(client, error)
    }
  }

  @SubscribeMessage("room:kick")
  async kickPlayer(@MessageBody() body: unknown, @ConnectedSocket() client: RoomSocket) {
    try {
      const input = kickPlayerInputSchema.parse(body)
      const room = await this.roomService.kickPlayer({
        ...input,
        roomCode: input.roomCode.toUpperCase(),
      })
      this.broadcastRoom(room.code)
    } catch (error) {
      this.emitError(client, error)
    }
  }

  @SubscribeMessage("room:update-word-pack")
  async updateWordPack(@MessageBody() body: unknown, @ConnectedSocket() client: RoomSocket) {
    try {
      const input = updateWordPackInputSchema.parse(body)
      const room = await this.roomService.updateWordPack({
        ...input,
        roomCode: input.roomCode.toUpperCase(),
      })
      this.broadcastRoom(room.code)
    } catch (error) {
      this.emitError(client, error)
    }
  }

  @SubscribeMessage("room:update-locale")
  async updateLocale(@MessageBody() body: unknown, @ConnectedSocket() client: RoomSocket) {
    try {
      const input = updateLocaleInputSchema.parse(body)
      const room = await this.roomService.updateLocale({
        ...input,
        roomCode: input.roomCode.toUpperCase(),
      })
      this.broadcastRoom(room.code)
    } catch (error) {
      this.emitError(client, error)
    }
  }

  @SubscribeMessage("round:start")
  async startRound(@MessageBody() body: unknown, @ConnectedSocket() client: RoomSocket) {
    try {
      const input = startRoundInputSchema.parse(body)
      const result = await this.roomService.startRound({
        ...input,
        roomCode: input.roomCode.toUpperCase(),
      })

      this.broadcastRoom(result.room.code)

      for (const secret of result.secrets) {
        const sockets = await this.server.in(result.room.code).fetchSockets()
        const target = sockets.find(
          (socket) => ((socket as unknown as RoomSocket).data.playerId ?? "") === secret.playerId,
        )
        target?.emit("room:role", {
          roomCode: result.room.code,
          playerId: secret.playerId,
          role: secret.role,
          word: secret.word,
        })
      }
    } catch (error) {
      this.emitError(client, error)
    }
  }

  @SubscribeMessage("round:continue")
  async continueRoundEvent(@MessageBody() body: unknown, @ConnectedSocket() client: RoomSocket) {
    try {
      const input = continueRoundInputSchema.parse(body)
      const room = await this.roomService.continueRound({
        ...input,
        roomCode: input.roomCode.toUpperCase(),
      })
      this.broadcastRoom(room.code)
    } catch (error) {
      this.emitError(client, error)
    }
  }

  @SubscribeMessage("round:clue")
  async submitClueEvent(@MessageBody() body: unknown, @ConnectedSocket() client: RoomSocket) {
    try {
      const input = submitClueInputSchema.parse(body)
      const room = await this.roomService.submitClue({
        ...input,
        roomCode: input.roomCode.toUpperCase(),
      })
      this.broadcastRoom(room.code)
    } catch (error) {
      this.emitError(client, error)
    }
  }

  @SubscribeMessage("round:vote")
  async submitVoteEvent(@MessageBody() body: unknown, @ConnectedSocket() client: RoomSocket) {
    try {
      const input = submitVoteInputSchema.parse(body)
      const room = await this.roomService.submitVote({
        ...input,
        roomCode: input.roomCode.toUpperCase(),
      })
      this.broadcastRoom(room.code)
    } catch (error) {
      this.emitError(client, error)
    }
  }

  private async broadcastRoom(roomCode: string) {
    const sockets = await this.server.in(roomCode).fetchSockets()
    const room = await this.roomQueryService.getPublicRoom(roomCode)

    for (const socket of sockets) {
      const typedSocket = socket as unknown as RoomSocket
      if (!typedSocket.data.playerId) {
        continue
      }

      typedSocket.emit("room:snapshot", {
        room,
        selfPlayerId: typedSocket.data.playerId,
      })
    }
  }

  private async emitRoomSnapshot(roomCode: string, playerId: string, client: RoomSocket) {
    const room = await this.roomQueryService.getPublicRoom(roomCode)
    client.emit("room:snapshot", {
      room,
      selfPlayerId: playerId,
    })
  }

  private emitError(client: RoomSocket, error: unknown) {
    const payload: ServerErrorPayload =
      error instanceof RoomError
        ? { code: error.code, message: error.message }
        : error instanceof ZodError
          ? {
              code: "BAD_REQUEST",
              message: error.issues[0]?.message ?? "Request validation failed.",
            }
          : { code: "BAD_REQUEST", message: "Something went wrong while processing the request." }

    client.emit("room:error", payload)
  }
}
