import { useT } from '../../i18n/index.ts'
import { ListGroup, ListRow, Switch } from '../ui/index.ts'

export interface PublicToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

/** The "Public" switch on the new and edit challenge forms, with its hint. */
export function PublicToggle({ checked, onChange }: PublicToggleProps) {
  const t = useT()
  return (
    <div className="flex flex-col gap-2">
      <ListGroup>
        <ListRow
          label={t.newChallenge.public}
          detail={
            <Switch
              aria-label={t.newChallenge.public}
              checked={checked}
              onChange={onChange}
            />
          }
        />
      </ListGroup>
      <p className="px-1 text-xs leading-relaxed text-muted">
        {t.newChallenge.publicHint}
      </p>
    </div>
  )
}
