import type { DateRangeInput } from '../../challenges/logic.ts'
import { useT } from '../../i18n/index.ts'
import { TextField } from '../ui/index.ts'

export interface DateRangeFieldsProps {
  range: DateRangeInput
  onChange: (range: DateRangeInput) => void
  /** Line under the fields: how the range works, or why it is unusable. */
  hint: string
}

/** Start and end day pickers for a challenge window. */
export function DateRangeFields({
  range,
  onChange,
  hint,
}: DateRangeFieldsProps) {
  const t = useT()
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3">
        <TextField
          label={t.newChallenge.starts}
          type="date"
          value={range.startKey}
          max={range.endKey}
          onChange={(e) => onChange({ ...range, startKey: e.target.value })}
          className="min-w-0 flex-1"
        />
        <TextField
          label={t.newChallenge.ends}
          type="date"
          value={range.endKey}
          min={range.startKey}
          onChange={(e) => onChange({ ...range, endKey: e.target.value })}
          className="min-w-0 flex-1"
        />
      </div>
      <p className="text-[13px] text-muted">{hint}</p>
    </div>
  )
}
