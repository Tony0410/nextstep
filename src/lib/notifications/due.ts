export function isDue(scheduledTime: string, now: Date): boolean {
  const [hours, minutes] = scheduledTime.split(':').map(Number)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const schedMinutes = hours * 60 + minutes

  // The sender is expected to run every minute. Matching the exact minute
  // prevents the same reminder from being sent repeatedly across a tolerance window.
  return nowMinutes === schedMinutes
}
