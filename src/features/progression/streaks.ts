const millisecondsPerDay = 86_400_000;

function dayNumber(value: string): number {
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp)
    ? Math.floor(timestamp / millisecondsPerDay)
    : Number.NaN;
}

export function calculateStreaks(
  activityDates: readonly string[],
  localToday: string,
): { current: number; longest: number } {
  const today = dayNumber(localToday);
  const days = [
    ...new Set(activityDates.map(dayNumber).filter(Number.isFinite)),
  ]
    .filter((day) => day <= today)
    .sort((first, second) => first - second);

  if (days.length === 0 || !Number.isFinite(today)) {
    return { current: 0, longest: 0 };
  }

  let longest = 1;
  let run = 1;
  for (let index = 1; index < days.length; index += 1) {
    if (days[index] === days[index - 1]! + 1) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
  }

  const latest = days.at(-1)!;
  if (latest < today - 1) return { current: 0, longest };

  let current = 1;
  for (let index = days.length - 1; index > 0; index -= 1) {
    if (days[index - 1] !== days[index]! - 1) break;
    current += 1;
  }

  return { current, longest };
}
