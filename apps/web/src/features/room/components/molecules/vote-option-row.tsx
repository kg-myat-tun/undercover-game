type VoteOptionRowProps = {
  checked: boolean
  disabled: boolean
  label: string
  hint?: string | null
  onChange: () => void
}

export function VoteOptionRow({ checked, disabled, label, hint, onChange }: VoteOptionRowProps) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-2.5 transition ${
        checked ? "border-accent bg-accent/10" : "border-black/10 bg-white"
      }`}
    >
      <div>
        <span className="font-medium">{label}</span>
        {hint ? <p className="mt-1 text-sm text-ink/45">{hint}</p> : null}
      </div>
      <input type="radio" name="vote" checked={checked} disabled={disabled} onChange={onChange} />
    </label>
  )
}
