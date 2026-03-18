"use client"

import { RoomClientView } from "./components/organisms/room-client-view"
import { useRoomClientState } from "./hooks/use-room-client-state"

type RoomClientProps = {
  roomCode: string
}

export function RoomClient({ roomCode }: RoomClientProps) {
  const state = useRoomClientState(roomCode)

  return <RoomClientView {...state} />
}
