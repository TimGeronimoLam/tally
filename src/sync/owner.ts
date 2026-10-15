/**
 * Local rows belong to at most one account, the sync owner. Ids are shared
 * with the server, so a row the owner's account already holds must never be
 * pushed again under another id: that is how entries got doubled when a
 * device went A → anonymous → A. The rules here keep that from happening.
 */

/** The account the local rows were last synced with. */
export interface SyncOwner {
  id: string
  /**
   * Whether that account is anonymous (a silent challenge or reminder
   * sign-in). Devices from before this flag have `undefined`; it is filled
   * in at the next sync with that account.
   */
  anonymous: boolean | undefined
}

export interface SessionUser {
  id: string
  anonymous: boolean
}

export type OwnerAction =
  /** Never synced: the rows are free to be pushed to this account. */
  | 'adopt'
  /** Same account: carry on. */
  | 'keep'
  /**
   * An anonymous account's rows move to the email account that signed in
   * (with fresh ids: the server already holds them under the old user).
   * Only an anonymous owner moves, so nothing that came from an email
   * account is ever copied back into it.
   */
  | 'move'
  /**
   * The rows belong to a different email account: syncing with this user
   * would copy them. Sign out (which clears the device) first.
   */
  | 'refuse'

export function planOwner(
  owner: SyncOwner | null,
  user: SessionUser,
): OwnerAction {
  if (!owner) return 'adopt'
  if (owner.id === user.id) return 'keep'
  // An anonymous session appears after a session was lost, not after a
  // sign-out (that clears the owner), so the rows still belong to someone.
  if (user.anonymous) return 'refuse'
  if (owner.anonymous === false) return 'refuse'
  return 'move'
}
