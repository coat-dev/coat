/**
 * Handles rejections for the promise to be able to delay its
 * handling to a later point in the execution flow and prevent
 * unhandled promise rejections
 *
 * @param promise The promise which will be await later in the execution flow
 */
export function handlePromise<T>(promise: Promise<T>): Promise<T> {
  promise.catch(() => {
    // Empty catch block to prevent unhandled promise rejectins
  });
  return promise;
}
