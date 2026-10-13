import { inviteUrl } from '../../challenges/codes.ts'
import { useT } from '../../i18n/index.ts'
import { copyText, shareLink } from '../../lib/share.ts'
import { useToast } from '../../lib/toast.ts'
import { Button, Card, CopyIcon, ShareIcon } from '../ui/index.ts'

export interface InviteCodeCardProps {
  code: string
  challengeName: string
}

/** Dashed card with the invite code, Copy and Share link. */
export function InviteCodeCard({ code, challengeName }: InviteCodeCardProps) {
  const t = useT()
  const toast = useToast()

  async function copy() {
    toast({
      message: (await copyText(code))
        ? t.challengeDetail.codeCopied
        : t.challengeDetail.couldNotCopy,
    })
  }

  async function share() {
    const outcome = await shareLink({
      title: t.challengeDetail.shareTitle(challengeName),
      text: t.challengeDetail.shareText(challengeName, code),
      url: inviteUrl(code),
    })
    if (outcome === 'copied') toast({ message: t.challengeDetail.linkCopied })
    else if (outcome === 'failed')
      toast({ message: t.challengeDetail.couldNotShare })
  }

  return (
    <Card
      variant="dashed"
      className="flex items-center justify-between gap-3 px-4 py-3.5"
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] text-muted">
          {t.challengeDetail.inviteCode}
        </span>
        <span className="text-lg font-semibold tracking-[0.08em]">{code}</span>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={copy}>
          <CopyIcon size={16} />
          {t.challengeDetail.copy}
        </Button>
        <Button variant="inverse" size="sm" onClick={share}>
          <ShareIcon size={16} />
          {t.challengeDetail.shareLink}
        </Button>
      </div>
    </Card>
  )
}
