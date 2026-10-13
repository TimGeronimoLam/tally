/**
 * Source of truth for every string the UI shows. Other locales are typed
 * against this object, so a missing or extra key fails `tsc`. Messages
 * that need values are functions; each locale handles its own plurals and
 * word order inside them.
 */
export const en = {
  /** BCP 47 primary subtag; also the key in src/i18n/locale.ts. */
  locale: 'en',
  /** The language's own name, for the picker. */
  name: 'English',

  /** 1 → "1st", 2 → "2nd", 11 → "11th", 23 → "23rd" */
  ordinal(n: number): string {
    const mod100 = n % 100
    if (mod100 >= 11 && mod100 <= 13) return `${n}th`
    switch (n % 10) {
      case 1:
        return `${n}st`
      case 2:
        return `${n}nd`
      case 3:
        return `${n}rd`
      default:
        return `${n}th`
    }
  },

  common: {
    cancel: 'Cancel',
    save: 'Save',
    notNow: 'Not now',
    back: 'Back',
    dismiss: 'Dismiss',
    delete: 'Delete',
    edit: 'Edit',
    loading: 'Loading…',
    refreshing: 'Refreshing…',
    somethingWentWrong: 'Something went wrong',
    you: 'You',
    newButton: 'New',
  },

  tabs: {
    log: 'Log',
    stats: 'Stats',
    challenges: 'Challenges',
    achievements: 'Achievements',
    account: 'Account',
  },

  /** Display names for the built-in units. Unknown units show as stored. */
  units: {
    reps: 'reps',
    sec: 'sec',
    min: 'min',
    km: 'km',
    kg: 'kg',
  } as Record<string, string>,

  /** Built-in exercise names (src/db/builtins.ts); they follow the language. */
  defaultExercises: {
    pushups: 'Pushups',
    squats: 'Squats',
    pullups: 'Pull-ups',
    plank: 'Plank',
  },

  log: {
    title: 'Log',
    addExerciseHint: 'Add an exercise to start logging.',
    today: 'Today',
    logButton: 'Log',
    undo: 'Undo',
    logged: (amount: string, unit: string) => `${amount} ${unit} logged`,
    /** "pushups" / "sec plank": how an exercise reads after a number. */
    amountLabel: (name: string, unit: string | null) =>
      unit ? `${unit} ${name.toLowerCase()}` : name.toLowerCase(),
    achievementUnlocked: (title: string) => `Achievement unlocked: ${title}`,
    tapAgainToEdit: 'Tap again to edit',
    addExercise: 'Add exercise',
    keypadDelete: 'Delete',
  },

  exerciseSheet: {
    newTitle: 'New exercise',
    editTitle: 'Edit exercise',
    name: 'Name',
    namePlaceholder: 'e.g. Burpees',
    unit: 'Unit',
    archive: 'Archive',
    archived: (name: string) => `${name} archived`,
  },

  stats: {
    title: 'Stats',
    meta: 'Last 3 months',
    exercise: 'Exercise',
    all: 'All',
    total: 'total',
    today: 'Today',
    yesterday: 'Yesterday',
    currentStreak: 'Current streak',
    longest: 'Longest',
    days: 'days',
    thisWeek: 'This week',
    allTime: 'All-time',
    bestDay: 'Best day',
    dailyAvg: 'Daily avg',
    perDay: 'Per day',
    range: 'Range',
    rangeDays: (n: number) => `${n}d`,
    perDayChart: (unit: string, days: number) =>
      `${unit} per day, last ${days} days`,
    cellLabel: (date: string, total: string, unit: string) =>
      `${date}: ${total} ${unit}`,
    heatmapHint: 'Tap a day to see its total',
    less: 'Less',
    more: 'More',
  },

  achievements: {
    title: 'Achievements',
    meta: (unlocked: number, total: number) => `${unlocked} of ${total}`,
    /** Screen-reader suffix after a locked badge's title. */
    locked: '(locked)',
    sections: {
      milestones: 'Milestones',
      streaks: 'Streaks',
      consistency: 'Consistency',
      social: 'Social',
    },
    reps: {
      title: (total: string) => `${total} reps`,
      description: (total: string) => `Log ${total} in total`,
      progress: (sofar: string) => `${sofar} so far`,
    },
    streak: {
      title: (days: number) => `${days}-day streak`,
      description: (days: number) => `Log ${days} days in a row`,
      progress: (best: number) => `${best} best so far`,
    },
    fullMonth: { title: 'Full month', description: 'Log every day of a month' },
    earlyBird: {
      title: 'Early bird',
      description: '10 logs before 7am',
      progress: (n: number) => `${n} of 10 before 7am`,
    },
    variety: {
      title: 'Variety',
      description: 'Track 5 exercises',
      progress: (n: number) => `${n} of 5 exercises`,
    },
    firstChallenge: {
      title: 'First challenge',
      description: 'Join a challenge',
    },
    challengeWon: { title: 'Won a challenge', description: 'Finish first' },
    host: { title: 'Host', description: 'Start a challenge' },
  },

  challenges: {
    title: 'Challenges',
    codeLabel: 'Challenge code',
    codePlaceholder: 'Enter a code, e.g. 7K2QXY',
    join: 'Join',
    codeFormat: 'Codes are 6 letters or digits',
    notConfigured:
      'Challenges need the Tally server, which this build is not configured for.',
    active: 'Active',
    past: 'Past',
    noneActive:
      "No active challenges. Start one with New, or enter a friend's code above.",
    won: 'Won',
    placing: (rank: string, members: number) => `${rank} of ${members}`,
    more: (n: number) => `${n} more`,
    progressToGoal: 'Progress to goal',
    today: (delta: string) => `+${delta} today`,
    youSuffix: '(you)',
    /** Goal types, keyed by GoalType. */
    goalType: { most_reps: 'Most reps', first_to: 'First to' },
    /** Subtitle pieces: "Pushups · Most reps · 19 days left" */
    subtitle: {
      mostReps: 'Most reps',
      firstTo: (goal: string) => `First to ${goal}`,
      ended: (date: string) => `ended ${date}`,
      starts: (date: string) => `starts ${date}`,
      people: (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`,
      daysLeft: (n: number) => `${n} ${n === 1 ? 'day' : 'days'} left`,
    },
  },

  challengeDetail: {
    title: 'Challenge',
    backLabel: 'Back to challenges',
    notOnList: 'This challenge is not on your list.',
    share: 'Share challenge',
    shareTitle: (name: string) => `Join ${name} on Tally`,
    shareText: (name: string, code: string) =>
      `Join my challenge "${name}" with code ${code}`,
    linkCopied: 'Link copied',
    couldNotShare: 'Could not share',
    firstToWins: (goal: string) => `First to ${goal} wins`,
    mostRepsWins: 'Most reps wins',
    ended: 'Ended',
    startsIn: 'Starts in',
    daysLeft: 'Days left',
    yourUnit: (unit: string) => `Your ${unit}`,
    toGoal: 'To goal',
    lead: 'Lead',
    toFirst: 'To 1st',
    leaderboard: 'Leaderboard',
    host: 'Host',
    endNow: 'End challenge now',
    deleteChallenge: 'Delete challenge',
    logExercise: (exercise: string) => `Log ${exercise.toLowerCase()}`,
    endTitle: 'End challenge now?',
    endMessage: (name: string) =>
      `"${name}" closes for everyone right away. Totals so far become the final standings. This cannot be undone.`,
    ending: 'Ending…',
    endConfirm: 'End challenge',
    endedToast: 'Challenge ended. Final standings are in.',
    couldNotEnd: 'Could not end',
    deleteTitle: 'Delete challenge?',
    deleteMessage: (name: string, members: number) =>
      `"${name}" and its leaderboard are removed for all ${members} ${members === 1 ? 'member' : 'members'}. Everyone keeps their logged reps. This cannot be undone.`,
    deleting: 'Deleting…',
    deletedToast: 'Challenge deleted',
    couldNotDelete: 'Could not delete',
    editChallenge: 'Edit challenge',
    leaveChallenge: 'Leave challenge',
    leaveTitle: 'Leave challenge?',
    leaveMessage: (name: string, code: string) =>
      `You drop off the "${name}" leaderboard. Your logged reps stay yours. To come back, join again with the code ${code}.`,
    leaving: 'Leaving…',
    leftToast: 'You left the challenge',
    couldNotLeave: 'Could not leave',
    inviteCode: 'Invite code',
    copy: 'Copy',
    shareLink: 'Share link',
    codeCopied: 'Code copied',
    couldNotCopy: 'Could not copy',
  },

  newChallenge: {
    title: 'New challenge',
    exercise: 'Exercise',
    createExercise: (name: string) => `+ Create ${name}`,
    name: 'Name',
    namePlaceholder: 'e.g. October Pushups',
    /** Default title: "October Pushups" */
    defaultTitle: (month: string, exercise: string) => `${month} ${exercise}`,
    goal: 'Goal',
    goalType: 'Goal type',
    target: (unit: string) => `Target (${unit})`,
    targetPlaceholder: 'e.g. 1000',
    duration: 'Duration',
    /** Duration presets, keyed by DurationValue. */
    durations: {
      '3d': '3 days',
      '1w': '1 week',
      '1m': '1 month',
      custom: 'Custom',
    },
    starts: 'Starts',
    ends: 'Ends',
    customHint: 'Runs from the start of the first day to the end of the last.',
    customInvalid: 'Pick an end date that is today or later, after the start.',
    yourName: 'Your name on the leaderboard',
    namePlaceholderPerson: 'e.g. Tim',
    creating: 'Creating…',
    create: 'Create challenge',
    createdToast: 'Challenge created. Share the code!',
    couldNotCreate: 'Could not create',
    keepChallengesHint:
      'Add an email in Account to keep your challenges if you switch phones',
  },

  editChallenge: {
    title: 'Edit challenge',
    backLabel: 'Back to challenge',
    appliesToEveryone: 'Changes apply to everyone',
    save: 'Save changes',
    saving: 'Saving…',
    savedToast: 'Challenge updated',
    couldNotSave: 'Could not save',
    notEditable: 'Only the host can edit a challenge, and only before it ends.',
  },

  join: {
    lookingUp: (code: string) => `Looking up ${code}…`,
    notFound: 'No challenge found',
    noMatch: (code: string) =>
      `Nothing matches the code ${code}. Check it with whoever shared it.`,
    backToChallenges: 'Back to challenges',
    haveOnHomeScreen: 'Have Tally on your home screen?',
    openedInBrowser: (code: string) =>
      `This link opened in the browser instead. Open the app, go to Challenges and enter the code ${code} there.`,
    copyCode: 'Copy code',
    updateName: 'Update your name',
    joinTitle: 'Join the challenge',
    everySetCounts: (exercise: string) =>
      `Every ${exercise.toLowerCase()} set you log on this phone counts toward it.`,
    nameLabel: 'Name on the leaderboard',
    joining: 'Joining…',
    joinButton: 'Join challenge',
    youreIn: (name: string) => `You're in: ${name}`,
    couldNotJoin: 'Could not join',
    switchingPhones: 'Switching phones later?',
    signInToKeep: 'Sign in to keep your spot and sync your reps.',
    signIn: 'Sign in',
    couldNotLoad: 'Could not load',
  },

  account: {
    title: 'Account',
    appearance: 'Appearance',
    theme: 'Theme',
    themes: { system: 'System', light: 'Light', dark: 'Dark' },
    language: 'Language',
    languageSystem: 'System',
    languageSystemDetail: (name: string) => `System (${name})`,
    exercises: 'Exercises',
    addExercise: 'Add exercise',
    archived: 'Archived',
    restore: 'Restore',
    data: 'Data',
    exportJson: 'Export JSON',
    entries: (n: string) => `${n} entries`,
    import: 'Import',
    imported: (n: string) => `Imported ${n} entries`,
    importFailed: 'Import failed',
    deleteAll: 'Delete all data',
    deleteAllTitle: 'Delete all data?',
    deleteAllMessage:
      'Every exercise and entry on this device will be removed. This cannot be undone. Export first if you want a copy.',
    deleteEverything: 'Delete everything',
    allDeleted: 'All data deleted',
    lastError: 'Last error',
    clear: 'Clear',
  },

  sync: {
    syncing: 'Syncing…',
    failed: (error: string) => `Sync failed: ${error}`,
    lastSynced: (time: string) => `Last synced ${time}`,
    waitingFirst: 'Waiting for first sync',
    syncNow: 'Sync now',
    signOut: 'Sign out',
    signedOut: 'Signed out. Your data stays on this phone.',
    localOnly: 'Local only',
    localOnlyBody:
      'Your data lives on this device. Sign in to back it up and sync across phones.',
    notConfiguredBody:
      'Your data lives on this device. Sync is not configured in this build.',
    signInWithEmail: 'Sign in with email',
    yourName: 'Your name',
    addYourName: 'Add your name',
    nameOnLeaderboards: 'Name on leaderboards',
    shownOnLeaderboards: 'Shown on challenge leaderboards',
    shownToOthers: 'Shown to others on challenge leaderboards.',
    name: 'Name',
    nameLength: (max: number) => `Use 1 to ${max} characters`,
    signIn: 'Sign in',
    signInDescription:
      "We'll email you a one-time code. No password needed; your account is created the first time.",
    sendCode: 'Send code',
    sending: 'Sending…',
    email: 'Email',
    emailInvalid: 'Enter a valid email address',
    enterCode: 'Enter your code',
    codeSent: (email: string) => `We sent a code to ${email}. Enter it here.`,
    code: 'Code',
    signingIn: 'Signing in…',
    wholeCode: 'Enter the whole code from the email',
    codeWrong: 'That code is wrong or has expired. Ask for a new one.',
    signedInAs: (email: string) => `Signed in as ${email}`,
    saving: 'Saving…',
  },

  install: {
    title: 'Add Tally to your home screen',
    /** Rendered around the share icon: "Tap [icon] Share, then …" */
    iosBefore: 'Tap',
    iosAfter:
      'Share, then “Add to Home Screen”. Opens full-screen and works offline.',
    prompt: 'Opens full-screen like an app and works offline.',
    install: 'Install',
    gotIt: 'Got it',
  },

  offline: "Offline · logging still works, sync resumes when you're back",

  errorBoundary: {
    title: 'Something went wrong',
    body: 'Your data is still on this phone. Reloading usually fixes it.',
    reload: 'Reload',
  },

  /** Messages thrown from non-UI code and shown in toasts. */
  errors: {
    needServer: 'Challenges need the Tally server',
    couldNotSignIn: 'Could not sign in',
    localDataNotReady:
      'Local data did not get ready in time. Please try again.',
    couldNotCreateChallenge: 'Could not create challenge',
    codeCollision: 'Could not create challenge: code collision',
    couldNotLookUp: 'Could not look up challenge',
    couldNotJoin: 'Could not join',
    couldNotEnd: 'Could not end challenge',
    couldNotDelete: 'Could not delete challenge',
    couldNotLeave: 'Could not leave challenge',
    couldNotUpdate: 'Could not update challenge',
    couldNotLoadChallenges: 'Could not load challenges',
    couldNotLoadLeaderboard: 'Could not load leaderboard',
    syncNotConfigured: 'Sync is not configured in this build',
    notExportFile: 'Not a Tally export file',
  },
}

export type Messages = typeof en
