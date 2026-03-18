import { Controller, Get, Param } from "@nestjs/common";
import { getWordPack, wordPacks } from "@undercover/shared";

import { RoomService } from "./game/room.service.js";

@Controller()
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Get("/word-packs")
  wordPacks() {
    return wordPacks.map((pack) => ({
      id: pack.id,
      name: pack.name,
      locale: pack.locale,
      category: pack.category,
      pairCount: pack.pairs.length
    }));
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
