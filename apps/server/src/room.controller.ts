import { Controller, Get, Param } from "@nestjs/common"
import { getWordPack, wordPacks } from "@undercover/shared"

import { RoomQueryService } from "./game/room-query.service.js"

@Controller()
export class RoomController {
  constructor(private readonly roomQueryService: RoomQueryService) {}

  @Get("/word-packs")
  wordPacks() {
    return wordPacks
  }

  @Get("/word-packs/:id")
  wordPack(@Param("id") packId: string) {
    return getWordPack(packId)
  }

  @Get("/rooms/:code")
  async room(@Param("code") code: string) {
    return this.roomQueryService.getPublicRoom(code.toUpperCase())
  }
}
