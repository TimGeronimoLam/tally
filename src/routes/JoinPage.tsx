import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  challengeSubtitle,
  joinChallenge,
  normalizeInviteCode,
  previewChallenge,
  type ChallengePreview,
} from '../challenges/index.ts'
import { ExercisePicker } from '../components/app/index.ts'
import {
  Button,
  ButtonLink,
  Card,
  Gutter,
  Screen,
  TextField,
} from '../components/ui/index.ts'
import { addExercise, useDisplayName, useExercises } from '../db/index.ts'
import { useToast } from '../lib/toast.ts'
import { setDisplayName, syncNow, useSession } from '../sync/index.ts'

type Preview =
  | { state: 'loading' }
  | { state: 'missing' }
  | { state: 'error'; message: string }
  | { state: 'ready'; challenge: ChallengePreview }

/** `/join/:code`: what a shared link opens. */
export function JoinPage() {
  const code = normalizeInviteCode(useParams().code ?? '')
  const navigate = useNavigate()
  const toast = useToast()
  const exercises = useExercises()
  const savedName = useDisplayName()
  const { session } = useSession()

  const [preview, setPreview] = useState<Preview>({ state: 'loading' })
  const [nameInput, setNameInput] = useState<string | null>(null)
  const [exerciseId, setExerciseId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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
            message: err instanceof Error ? err.message : 'Could not load',
          })
      })
    return () => {
      cancelled = true
    }
  }, [code])

  const challenge = preview.state === 'ready' ? preview.challenge : null

  // Default to the local exercise whose name matches the challenge's.
  const matched =
    challenge && exercises
      ? exercises.find(
          (e) =>
            e.name.trim().toLowerCase() ===
            challenge.exerciseName.trim().toLowerCase(),
        )
      : undefined
  const selectedId = exerciseId ?? matched?.id ?? null
  const yourName = nameInput ?? savedName ?? ''
  const valid = !!challenge && !!selectedId && yourName.trim().length > 0

  async function createMatching(name: string) {
    const ex = await addExercise(name, challenge?.unit ?? 'reps')
    setExerciseId(ex.id)
  }

  async function join(e: FormEvent) {
    e.preventDefault()
    if (!valid || !selectedId || busy) return
    setBusy(true)
    try {
      if (yourName.trim() !== savedName) await setDisplayName(yourName)
      const id = await joinChallenge(code, yourName.trim(), selectedId)
      // Entries logged earlier today should count right away.
      await syncNow()
      toast({ message: `You're in: ${challenge!.name}` })
      if (!session?.user.email) {
        toast({
          message:
            'Add an email in Account to keep your challenges if you switch phones',
          queue: true,
          duration: 6000,
        })
      }
      navigate(`/challenges/${id}`, { replace: true })
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Could not join' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <Gutter className="flex flex-col gap-4 pt-[calc(env(safe-area-inset-top)_+_20px)] pb-8">
        {preview.state === 'loading' && (
          <p className="text-[15px] text-muted">Looking up {code}…</p>
        )}
        {preview.state === 'missing' && (
          <>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em]">
              No challenge found
            </h1>
            <p className="text-[15px] text-muted">
              Nothing matches the code {code}. Check it with whoever shared it.
            </p>
            <ButtonLink to="/challenges" variant="ghost">
              Back to challenges
            </ButtonLink>
          </>
        )}
        {preview.state === 'error' && (
          <p className="text-[15px] text-danger">{preview.message}</p>
        )}

        {challenge && exercises && savedName !== undefined && (
          <form onSubmit={join} className="flex flex-col gap-4">
            <Card className="flex flex-col gap-0.5 px-3 py-2.5">
              <span className="text-sm font-semibold">{challenge.name}</span>
              <span className="text-xs text-muted">
                {challengeSubtitle(challenge, {
                  memberCount: challenge.memberCount,
                })}
              </span>
            </Card>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em]">
              {challenge.isMember ? 'Update your entry' : 'Join the challenge'}
            </h1>

            <TextField
              label="Name on the leaderboard"
              value={yourName}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g. Tim"
              autoComplete="nickname"
              maxLength={24}
            />

            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-medium">
                Which of your exercises counts
              </span>
              <ExercisePicker
                exercises={exercises}
                selectedId={selectedId}
                onSelect={setExerciseId}
                suggestName={challenge.exerciseName}
                onCreate={(n) => void createMatching(n)}
              />
            </div>

            <Button type="submit" size="lg" fullWidth disabled={!valid || busy}>
              {busy
                ? 'Joining…'
                : challenge.isMember
                  ? 'Save'
                  : 'Join challenge'}
            </Button>

            {!session?.user.email && (
              <Card
                variant="outline"
                className="flex items-center justify-between gap-3 px-3.5 py-3"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-semibold">
                    Switching phones later?
                  </span>
                  <span className="text-xs leading-relaxed text-muted">
                    Sign in to keep your spot and sync your reps.
                  </span>
                </div>
                <ButtonLink to="/account" variant="inverse" size="sm">
                  Sign in
                </ButtonLink>
              </Card>
            )}

            <ButtonLink to="/challenges" variant="ghost">
              Not now
            </ButtonLink>
          </form>
        )}
      </Gutter>
    </Screen>
  )
}
