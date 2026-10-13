import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router'
import {
  challengeSubtitle,
  joinChallenge,
  normalizeInviteCode,
  previewChallenge,
  type ChallengePreview,
} from '../challenges/index.ts'
import {
  Button,
  ButtonLink,
  Card,
  Gutter,
  Screen,
  TextField,
} from '../components/ui/index.ts'
import { useDisplayName } from '../db/index.ts'
import { useT } from '../i18n/index.ts'
import { isIOS, isStandalone } from '../lib/install.ts'
import { copyText } from '../lib/share.ts'
import { useToast } from '../lib/toast.ts'
import { setDisplayName, useSession } from '../sync/index.ts'
import { useNav } from '../lib/nav.ts'

type Preview =
  | { state: 'loading' }
  | { state: 'missing' }
  | { state: 'error'; message: string }
  | { state: 'ready'; challenge: ChallengePreview }

/**
 * `/join/:code`: what a shared link opens. The exercise that counts is
 * fixed by the challenge; the member's matching local exercise is found or
 * created on join.
 */
export function JoinPage() {
  const t = useT()
  const code = normalizeInviteCode(useParams().code ?? '')
  const nav = useNav()
  const toast = useToast()
  const savedName = useDisplayName()
  const { session } = useSession()

  const [preview, setPreview] = useState<Preview>({ state: 'loading' })
  const [nameInput, setNameInput] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // iOS never routes a link into an installed web app: it opens in Safari,
  // whose storage the home-screen app does not share. Joining here would
  // land the membership on a Safari-only account, so point at the code.
  const [openedOutsideApp] = useState(() => isIOS() && !isStandalone())

  useEffect(() => {
    let cancelled = false
    previewChallenge(code)
      .then((c) => {
        if (cancelled) return
        setPreview(c ? { state: 'ready', challenge: c } : { state: 'missing' })
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setPreview({
            state: 'error',
            message: err instanceof Error ? err.message : t.join.couldNotLoad,
          })
      })
    return () => {
      cancelled = true
    }
  }, [code, t])

  const challenge = preview.state === 'ready' ? preview.challenge : null
  const yourName = nameInput ?? savedName ?? ''
  const valid = !!challenge && yourName.trim().length > 0

  async function join(e: FormEvent) {
    e.preventDefault()
    if (!valid || !challenge || busy) return
    setBusy(true)
    try {
      if (yourName.trim() !== savedName) await setDisplayName(yourName)
      const id = await joinChallenge(
        code,
        yourName.trim(),
        challenge.exerciseName,
        challenge.unit,
      )
      toast({ message: t.join.youreIn(challenge.name) })
      if (!session?.user.email) {
        toast({
          message: t.newChallenge.keepChallengesHint,
          queue: true,
          duration: 6000,
        })
      }
      nav.push(`/challenges/${id}`, { replace: true })
    } catch (err) {
      toast({
        message: err instanceof Error ? err.message : t.join.couldNotJoin,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <Gutter className="flex flex-col gap-4 pt-[calc(env(safe-area-inset-top)_+_20px)] pb-8">
        {preview.state === 'loading' && (
          <p className="text-[15px] text-muted">{t.join.lookingUp(code)}</p>
        )}
        {preview.state === 'missing' && (
          <>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em]">
              {t.join.notFound}
            </h1>
            <p className="text-[15px] text-muted">{t.join.noMatch(code)}</p>
            <ButtonLink to="/challenges" direction="pop" variant="ghost">
              {t.join.backToChallenges}
            </ButtonLink>
          </>
        )}
        {preview.state === 'error' && (
          <p className="text-[15px] text-danger">{preview.message}</p>
        )}

        {challenge && savedName !== undefined && (
          <form onSubmit={join} className="flex flex-col gap-4">
            <Card className="flex flex-col gap-0.5 px-3 py-2.5">
              <span className="text-sm font-semibold">{challenge.name}</span>
              <span className="text-xs text-muted">
                {challengeSubtitle(challenge, t, {
                  memberCount: challenge.memberCount,
                })}
              </span>
            </Card>
            {openedOutsideApp && (
              <Card
                variant="outline"
                className="flex items-center justify-between gap-3 px-3.5 py-3"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[13px] font-semibold">
                    {t.join.haveOnHomeScreen}
                  </span>
                  <span className="text-xs leading-relaxed text-muted">
                    {t.join.openedInBrowser(code)}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={async () =>
                    toast({
                      message: (await copyText(code))
                        ? t.challengeDetail.codeCopied
                        : t.challengeDetail.couldNotCopy,
                    })
                  }
                >
                  {t.join.copyCode}
                </Button>
              </Card>
            )}
            <h1 className="text-[22px] font-semibold tracking-[-0.02em]">
              {challenge.isMember ? t.join.updateName : t.join.joinTitle}
            </h1>
            <p className="text-[13px] leading-relaxed text-muted">
              {t.join.everySetCounts(challenge.exerciseName)}
            </p>

            <TextField
              label={t.join.nameLabel}
              value={yourName}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder={t.newChallenge.namePlaceholderPerson}
              autoComplete="nickname"
              maxLength={24}
            />

            <Button type="submit" size="lg" fullWidth disabled={!valid || busy}>
              {busy
                ? t.join.joining
                : challenge.isMember
                  ? t.common.save
                  : t.join.joinButton}
            </Button>

            {!session?.user.email && (
              <Card
                variant="outline"
                className="flex items-center justify-between gap-3 px-3.5 py-3"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-semibold">
                    {t.join.switchingPhones}
                  </span>
                  <span className="text-xs leading-relaxed text-muted">
                    {t.join.signInToKeep}
                  </span>
                </div>
                <ButtonLink to="/account" variant="inverse" size="sm">
                  {t.join.signIn}
                </ButtonLink>
              </Card>
            )}

            <ButtonLink to="/challenges" direction="pop" variant="ghost">
              {t.common.notNow}
            </ButtonLink>
          </form>
        )}
      </Gutter>
    </Screen>
  )
}
