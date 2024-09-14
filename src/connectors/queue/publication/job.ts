import { Job as BullJob, DoneCallback, ProcessCallbackFunction } from 'bull'

export interface ErrorHandlingJob {
  handleError(e: unknown): void
}

export abstract class Job<T = any> {
  job!: BullJob<T>
  done!: DoneCallback

  abstract handle(): Promise<any>

  setJob(job: BullJob) {
    this.job = job
  }

  setDoneCallback(done: DoneCallback) {
    this.done = done
  }
}

export function chainJobs<T>(callback: () => Job<T>[]): ProcessCallbackFunction<T> {
  return async (job, done) => {
    const jobs = callback()

    for (const current of jobs) {
      current.setJob(job)
      current.setDoneCallback(done)

      try {
        const result = await current.handle()

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
