import { RoomClient } from "../../../features/room/room-client";

export default async function RoomPage({
  params
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return <RoomClient roomCode={code.toUpperCase()} />;
}
