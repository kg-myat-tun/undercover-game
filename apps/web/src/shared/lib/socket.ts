"use client"

import type { ClientToServerEvents, ServerToClientEvents } from "@undercover/shared"
import { io, type Socket } from "socket.io-client"

import { socketUrl } from "./config"

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null

export function getSocket() {
  if (!socket) {
    socket = io(socketUrl, {
      autoConnect: false,
      transports: ["websocket"],
    })
  }

  return socket
}
