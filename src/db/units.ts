/** Units offered when creating an exercise. Stored as free-form strings. */
export const UNITS = ['reps', 'sec', 'min', 'km', 'kg'] as const

export type Unit = (typeof UNITS)[number]
