import { Controller, Get, Param } from "@nestjs/common";
import { getWordPack, wordPacks } from "@undercover/shared";

import { RoomService } from "./game/room.service.js";

@Controller()
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Get("/word-packs")
  wordPacks() {
    return wordPacks;
  }

  @Get("/word-packs/:id")
  wordPack(@Param("id") packId: string) {
    return getWordPack(packId);
  }

  @Get("/rooms/:code")
  async room(@Param("code") code: string) {
    return this.roomService.getPublicRoom(code.toUpperCase());
  }
}
