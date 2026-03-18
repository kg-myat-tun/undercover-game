import { Injectable, Logger } from "@nestjs/common";
import { Redis } from "ioredis";

import { InMemoryRoomStore } from "./in-memory-room-store.js";
import type { RoomStore } from "./room-store.js";
import { RedisRoomStore } from "./redis-room-store.js";

@Injectable()
export class RoomStoreFactory {
  private readonly logger = new Logger(RoomStoreFactory.name);
  private readonly store: RoomStore;

  constructor() {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      this.logger.warn("REDIS_URL is not set, using in-memory room store");
      this.store = new InMemoryRoomStore();
      return;
    }

    this.store = new RedisRoomStore(new Redis(redisUrl, { maxRetriesPerRequest: 1 }));
  }

  getStore(): RoomStore {
    return this.store;
  }
}
