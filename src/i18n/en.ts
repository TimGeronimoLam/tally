/**
 * Source of truth for every string the UI shows. Other locales are typed
 * against this object, so a missing or extra key fails `tsc`. Messages
 * that need values are functions; each locale handles its own plurals and
 * word order inside them.
 */
export const en = {
  /** BCP 47 primary subtag; also the key in src/i18n/messages.ts. */
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
    since: (month: string) => `Since ${month}`,
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
    perMonth: 'Per month',
    range: 'Range',
    rangeWeek: 'Week',
    rangeMonth: 'Month',
    rangeYear: 'Year',
    earlier: 'Earlier',
    later: 'Later',
    perDayChart: (unit: string, period: string) => `${unit} per day, ${period}`,
    perMonthChart: (unit: string, period: string) =>
      `${unit} per month, ${period}`,
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
    firstLog: { title: 'First log', description: 'Log your first set' },
    bigDay: {
      title: (total: string) => `${total} in a day`,
      description: (total: string) => `Log ${total} on a single day`,
      progress: (best: string) => `${best} best day so far`,
    },
    bigSet: {
      title: (amount: string) => `Set of ${amount}`,
      description: (amount: string) => `Log ${amount} in one go`,
      progress: (best: string) => `${best} biggest set so far`,
    },
    comeback: {
      title: 'Comeback',
      description: 'Log again after a month off',
    },
    nightOwl: {
      title: 'Night owl',
      description: '10 logs after 10pm',
      progress: (n: number) => `${n} of 10 after 10pm`,
    },
    weekends: {
      title: 'Weekend warrior',
      description: 'Log on 10 weekend days',
      progress: (n: number) => `${n} of 10 weekend days`,
    },
    collector: {
      title: 'Collector',
      description: 'Track 10 exercises',
      progress: (n: number) => `${n} of 10 exercises`,
    },
    activeDays: {
      title: (days: number) => `${days} active days`,
      description: (days: number) => `Log on ${days} different days`,
      progress: (n: number, days: number) => `${n} of ${days} days`,
    },
    busyDay: {
      title: 'Busy day',
      description: '10 sets in one day',
      progress: (best: number) => `${best} sets best so far`,
    },
    oneYear: {
      title: 'One year',
      description: 'Log a year after your first entry',
    },
    challenges: {
      title: (n: number) => `${n} challenges`,
      description: (n: number) => `Join ${n} challenges`,
      progress: (sofar: number, n: number) => `${sofar} of ${n} joined`,
    },
    hosted: {
      title: 'Regular host',
      description: 'Start 3 challenges',
      progress: (n: number) => `${n} of 3 started`,
    },
    wins: {
      title: 'Champion',
      description: 'Win 3 challenges',
      progress: (n: number) => `${n} of 3 won`,
    },
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
    publicSection: 'Public',
    nonePublic:
      'No public challenges right now. Switch on Public when you create one to list it here.',
    won: 'Won',
    placing: (rank: string, members: number) => `${rank} of ${members}`,
    more: (n: number) => `${n} more`,
    progressToGoal: 'Progress to goal',
    reached: 'Goal reached',
    missed: 'Goal missed',
    team: 'Team',
    teamProgress: 'Team progress',
    today: (delta: string) => `+${delta} today`,
    youSuffix: '(you)',
    /** Goal types, keyed by GoalType. */
    goalType: {
      most_reps: 'Most reps',
      first_to: 'First to',
      team: 'Together',
    },
    /** Subtitle pieces: "Pushups · Most reps · 19 days left" */
    subtitle: {
      mostReps: 'Most reps',
      firstTo: (goal: string) => `First to ${goal}`,
      team: (goal: string) => `Together to ${goal}`,
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
    teamGoal: (goal: string) => `Together to ${goal}`,
    mostRepsWins: 'Most reps wins',
    ended: 'Ended',
    startsIn: 'Starts in',
    daysLeft: 'Days left',
    yourUnit: (unit: string) => `Your ${unit}`,
    toGoal: 'To goal',
    lead: 'Lead',
    toFirst: 'To 1st',
    leaderboard: 'Leaderboard',
    contributions: 'Contributions',
    teamPerDay: (n: string, unit: string) => `${n} ${unit} a day to make it`,
    teamReached: 'Goal reached together',
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

  memberStats: {
    title: 'Member',
    backLabel: 'Back to challenge',
    notInChallenge: 'This member is no longer in the challenge.',
    total: (unit: string) => `Total ${unit}`,
    finalStreak: 'Final streak',
    activeDays: 'Active days',
    ofDays: (n: number) => `of ${n}`,
    startsOn: (date: string) =>
      `The challenge starts ${date}. Stats show up once it does.`,
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
    teamTarget: (unit: string) => `Shared target (${unit})`,
    teamHint: 'Everything the members log counts towards one total.',
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
    public: 'Public',
    publicHint: 'Listed under Challenges, so anyone can find and join it.',
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
    deleteAccount: 'Delete account',
    deletingAccount: 'Deleting account…',
    deleteAccountTitle: 'Delete your account?',
    deleteAccountMessage: (email: string) =>
      `Your account (${email}) and everything in it are deleted for good: your sets, your photo, your place in challenges, and the challenges you host, for everyone in them. This phone is cleared too. This cannot be undone. Export first if you want a copy.`,
    accountDeleted: 'Account deleted',
    accountNotDeleted: 'Account not deleted',
    lastError: 'Last error',
    clear: 'Clear',
    about: 'About',
  },

  sync: {
    syncing: 'Syncing…',
    failed: (error: string) => `Sync failed: ${error}`,
    lastSynced: (time: string) => `Last synced ${time}`,
    waitingFirst: 'Waiting for first sync',
    syncNow: 'Sync now',
    signOut: 'Sign out',
    signedOut: 'Signed out',
    signOutTitle: 'Sign out?',
    signOutMessage:
      'Your sets stay in your account and leave this phone. Sign in again to get them back.',
    signOutUnsynced:
      'Your latest sets are not backed up yet. Check your connection, then try again.',
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
    photo: 'Profile photo',
    addPhoto: 'Add photo',
    changePhoto: 'Change photo',
    choosePhoto: 'Choose photo',
    removePhoto: 'Remove photo',
    photoShownTo:
      'Shown next to your name on leaderboards. Everyone in your challenges can see it, in public ones too.',
    photoSaved: 'Photo saved',
    photoRemoved: 'Photo removed',
    photoUnreadable: "That image can't be opened. Try another one.",
    photoNeedsSignIn: 'Sign in with email to add a photo.',
    photoNotSaved: 'Photo not saved',
    saving: 'Saving…',
  },

  reminders: {
    title: 'Notifications',
    daily: 'Daily reminder',
    time: 'Time',
    /** iOS in a Safari tab: web push needs the Home Screen app. */
    installFirst: 'Install Tally first',
    unsupported: 'Not supported here',
    denied: 'Blocked in system settings',
    notAllowed: 'Allow notifications to get a reminder',
    enabled: (time: string) => `Reminder set for ${time}`,
    disabled: 'Reminder off',
    /** The notification itself, sent by the server in the device's language. */
    pushTitle: 'Time for a set',
    pushBody: 'Nothing logged today yet. One quick set counts.',
    /** Switch for the "someone passed you" challenge alerts. */
    overtaken: 'When someone passes you',
    overtakenOn: "You'll hear when someone passes you",
    overtakenOff: 'Challenge alerts off',
    /** Challenge alert body, under the challenge's name; place is ordinal(rank). */
    passedBody: (name: string, place: string) =>
      `${name} just passed you. You're ${place} now.`,
    passedBodyAnonymous: (place: string) =>
      `Someone just passed you. You're ${place} now.`,
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

  /** Versions and what changed in each; CHANGELOG.md has the developer's log. */
  changelog: {
    title: "What's new",
    whatsNew: "What's new",
    version: (v: string) => `Version ${v}`,
    /** Tag on the release this build is. */
    current: 'Current',
    /** Log-screen notice after an update. */
    updated: (v: string) => `Tally updated to ${v}`,
    /** Per version, newest first; one sentence per change, as the user sees it. */
    notes: {
      '1.5.0': [
        '31 achievement badges: 19 new ones across all four sections.',
        'A push alert when someone passes you in a challenge. Turn it on under Account → Notifications.',
        'The stats chart follows the calendar: weeks run Monday to Sunday, months from the 1st, years from January.',
        "Version numbers and this What's new page. After an update, the Log screen points here once.",
      ],
      '1.4.0': [
        'Public challenges: a host can list a challenge for everyone, and the Challenges tab shows open ones to join.',
        'Team goals: a challenge can set one shared total for everyone to reach together.',
        'Background loads that fail retry quietly instead of showing an error.',
      ],
      '1.3.0': [
        'Tap a member on a challenge leaderboard to see their stats for it, day by day.',
      ],
      '1.2.0': [
        'Stats reach back through all your history, with even bars.',
        'A challenge’s “today” starts at local midnight, like the stats.',
      ],
      '1.1.1': ['Signing in again no longer doubles entries.'],
      '1.1.0': [
        'Six more languages: German, French, Spanish, Italian, Dutch and Portuguese. The app follows your phone; Account → Language overrides it.',
        'A daily push reminder to log your reps (Account → Notifications).',
        'A more native feel: screen transitions, haptics, pull to refresh on challenges.',
        'Members can leave a challenge; hosts can edit one.',
        'Built-in exercises follow the app language.',
        'A long press on the keypad still counts, and the page no longer rubber-bands.',
      ],
      '1.0.0': [
        'Log a set with one tap and one number. Works offline.',
        'Stats: heatmap, streaks and a bar chart.',
        'Achievements.',
        'Sign in with an emailed code to sync across phones.',
        'Challenges with friends: invite codes, leaderboards, custom dates.',
        'Light and dark mode, home-screen install, export and import.',
      ],
    },
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
    otherAccountData:
      'This phone holds sets from another account. Sign in with that email, or delete all data in Account.',
    captchaFailed: 'Could not confirm you are human. Please try again.',
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
    couldNotLoadPublicChallenges: 'Could not load public challenges',
    couldNotLoadLeaderboard: 'Could not load leaderboard',
    couldNotLoadMemberStats: 'Could not load stats',
    syncNotConfigured: 'Sync is not configured in this build',
    notExportFile: 'Not a Tally export file',
  },
}

export type Messages = typeof en
