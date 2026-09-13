/** True when advancing from `index` leaves the Discover queue with no record. */
export function willExhaustDiscoverQueue(index: number, queueLength: number): boolean {
  return queueLength > 0 && index + 1 >= queueLength;
}
