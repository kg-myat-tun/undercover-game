import React from "react";

type HeroStatProps = {
  label: string;
  value: string;
};

export function HeroStat({ label, value }: HeroStatProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
      <p className="text-sm uppercase tracking-wide text-[#f0cfaa]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}
