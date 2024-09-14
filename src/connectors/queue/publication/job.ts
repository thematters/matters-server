import { Job, DoneCallback, ProcessCallbackFunction } from 'bull'

export interface ErrorHandlingJob {
  handleError(e: unknown): void
}

export abstract class ChainedJob<T = any> {
  job!: Job<T>
  done!: DoneCallback

  abstract handle(): Promise<any>

  setJob(job: Job) {
    this.job = job
  }

  setDoneCallback(done: DoneCallback) {
    this.done = done
  }
}

export function chainJobs<T>(callback: () => ChainedJob<T>[]): ProcessCallbackFunction<T> {
  return async (job, done) => {
    const jobs = callback()

    for (const current of jobs) {
      current.setJob(job)
      current.setDoneCallback(done)

      try {
        const result = await current.handle()

        // Here, we have the opportunity to terminate the chained job early
        // if something goes wrong. To do so, simply return false in the
        // job's "handle" method and the subsequent jobs will not run.
        if (result === false) {
          break
        }
      } catch (e) {
        if (!('handleError' in current)) {
          throw e
        }

        (current as ErrorHandlingJob).handleError(e)
      }
    }
  }
}
