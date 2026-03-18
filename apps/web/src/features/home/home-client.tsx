"use client"

import { HomeClientView } from "./components/organisms/home-client-view"
import { useHomeClientState } from "./hooks/use-home-client-state"

export function HomeClient() {
  const state = useHomeClientState()

  return <HomeClientView {...state} />
}
