/**
 * Wrap any promise with a timeout. Returns the fallback value if the promise doesn't resolve in time.
 */
export const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
  const timeout = new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms));
  return Promise.race([promise, timeout]);
};
