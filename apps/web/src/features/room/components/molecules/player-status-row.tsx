import React from "react";

import { t } from "../../../../shared/lib/i18n";
import type { AppLocale } from "../../../../shared/lib/locale";

type PlayerStatusRowProps = {
  isConnected: boolean;
  isCurrentTurn: boolean;
  isEliminated: boolean;
  isActive: boolean;
  isHost: boolean;
  isSelf: boolean;
  locale: AppLocale;
  nickname: string;
  onKick?: () => void;
  canKick?: boolean;
};

export function PlayerStatusRow({
  isConnected,
  isCurrentTurn,
  isEliminated,
  isActive,
  isHost,
  isSelf,
  locale,
  nickname,
  onKick,
  canKick
}: PlayerStatusRowProps) {
  const status = isCurrentTurn
    ? t(locale, "currentTurn")
    : isEliminated
      ? t(locale, "eliminatedStatus")
      : !isConnected
        ? t(locale, "disconnected")
        : isActive
          ? t(locale, "active")
          : "";

  return (
    <div className="flex items-center justify-between rounded-xl bg-black/[0.03] px-3 py-2.5">
      <div>
        <p className="font-medium">{nickname}</p>
        <p className="text-sm text-ink/45">
          {isHost ? t(locale, "host") : t(locale, "player")}
          {isSelf ? ` • ${t(locale, "you")}` : ""}
          {status ? ` • ${status}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {canKick ? (
          <button
            onClick={onKick}
            className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-semibold"
          >
            {t(locale, "remove")}
          </button>
        ) : null}
        <span className={`h-3 w-3 rounded-full ${isConnected ? "bg-mint" : "bg-accent"}`} />
      </div>
    </div>
  );
}
