import { useEffect, useState, type FormEvent } from 'react'
import { evaluateAchievements } from '../achievements/index.ts'
import {
  challengeStatus,
  isValidInviteCode,
  normalizeInviteCode,
  recordSocialStats,
  socialStatsFrom,
  useMyChallenges,
} from '../challenges/index.ts'
import { ChallengeCard, PastChallengeRow } from '../components/app/index.ts'
import {
  Button,
  ButtonLink,
  Gutter,
  Screen,
  ScreenHeader,
  SectionLabel,
  inputClassName,
} from '../components/ui/index.ts'
import { useT } from '../i18n/index.ts'
import { isSyncConfigured } from '../lib/supabase.ts'
import { useToast } from '../lib/toast.ts'
import { useNav } from '../lib/nav.ts'

export function ChallengesPage() {
  const t = useT()
  const nav = useNav()
  const toast = useToast()
  const { data, error, loading, userId, refresh } = useMyChallenges()
  const [code, setCode] = useState('')

  // Keep the social achievements fed, and celebrate new ones here.
  useEffect(() => {
    if (!data || !userId) return
    void (async () => {
      await recordSocialStats(socialStatsFrom(data, userId))
      for (const a of await evaluateAchievements()) {
        toast({ message: t.log.achievementUnlocked(a.title(t)), queue: true })
      }
    })()
  }, [data, userId, toast, t])

  function join(e: FormEvent) {
    e.preventDefault()
    const normalized = normalizeInviteCode(code)
    if (!isValidInviteCode(normalized)) {
      toast({ message: t.challenges.codeFormat })
      return
    }
    nav.push(`/join/${normalized}`)
  }

  const active = (data ?? []).filter((c) => challengeStatus(c) !== 'ended')
  const past = (data ?? []).filter((c) => challengeStatus(c) === 'ended')

  return (
    <Screen onRefresh={userId ? refresh : undefined}>
      <ScreenHeader
        title={t.challenges.title}
        action={
          <ButtonLink to="/challenges/new" variant="outline" size="sm">
            {t.common.newButton}
          </ButtonLink>
        }
      />

      <Gutter className="pt-4">
        <form onSubmit={join} className="flex gap-2">
          <label htmlFor="invite-code" className="sr-only">
            {t.challenges.codeLabel}
          </label>
          <input
            id="invite-code"
            className={`${inputClassName} h-12 min-w-0 flex-1`}
            placeholder={t.challenges.codePlaceholder}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Button type="submit" variant="inverse" disabled={!code.trim()}>
            {t.challenges.join}
          </Button>
        </form>
      </Gutter>

      {!isSyncConfigured && (
        <Gutter className="pt-6">
          <p className="text-[15px] text-muted">{t.challenges.notConfigured}</p>
        </Gutter>
      )}

      {error && (
        <Gutter className="pt-4">
          <p className="text-[13px] text-danger">{error}</p>
        </Gutter>
      )}

      <Gutter>
        <SectionLabel>{t.challenges.active}</SectionLabel>
        {loading && !data ? (
          <p className="pt-2 text-[15px] text-muted">{t.common.loading}</p>
        ) : active.length === 0 ? (
          <p className="pt-2 text-[15px] leading-relaxed text-muted">
            {t.challenges.noneActive}
          </p>
        ) : (
          <div className="flex flex-col gap-2.5 pt-1">
            {active.map((c) => (
              <ChallengeCard key={c.id} challenge={c} meId={userId} />
            ))}
          </div>
        )}
      </Gutter>

      {past.length > 0 && (
        <Gutter className="pb-6">
          <SectionLabel>{t.challenges.past}</SectionLabel>
          <div className="flex flex-col gap-2 pt-1">
            {past.map((c) => (
              <PastChallengeRow key={c.id} challenge={c} meId={userId} />
            ))}
          </div>
        </Gutter>
      )}
      <div className="pb-6" />
    </Screen>
  )
}
