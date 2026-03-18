import clsx from "clsx"
import React, { type PropsWithChildren } from "react"

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <section className={clsx("rounded-[28px] border border-black/5 p-6 shadow-card", className)}>
      {children}
    </section>
  )
}
