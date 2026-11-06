import { useEffect, useState, type FormEvent } from 'react'
import { evaluateAchievements } from '../achievements/index.ts'
import {
  challengeStatus,
  isValidInviteCode,
  normalizeInviteCode,
  recordSocialStats,
  socialStatsFrom,
  useMyChallenges,
  usePublicChallenges,
} from '../challenges/index.ts'
import {
  ChallengeCard,
  PastChallengeRow,
  PublicChallengeRow,
} from '../components/app/index.ts'
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
  const { data, loading, userId, refresh } = useMyChallenges()
  const publicList = usePublicChallenges()
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
  // The server leaves out the user's own, but a join may be newer than
  // its last answer.
  const mine = new Set((data ?? []).map((c) => c.id))
  const listed = (publicList.data ?? []).filter(
    (c) => !mine.has(c.id) && challengeStatus(c) !== 'ended',
  )

  return (
    <Screen
      onRefresh={
        isSyncConfigured
          ? () => Promise.all([refresh(), publicList.refresh()])
          : undefined
      }
    >
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

      {isSyncConfigured && (
        <Gutter>
          <SectionLabel>{t.challenges.publicSection}</SectionLabel>
          {publicList.data === undefined ? (
            <p className="pt-2 text-[15px] text-muted">{t.common.loading}</p>
          ) : listed.length === 0 ? (
            <p className="pt-2 text-[15px] leading-relaxed text-muted">
              {t.challenges.nonePublic}
            </p>
          ) : (
            <div className="flex flex-col gap-2 pt-1">
              {listed.map((c) => (
                <PublicChallengeRow key={c.id} challenge={c} />
              ))}
            </div>
          )}
        </Gutter>
      )}

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
