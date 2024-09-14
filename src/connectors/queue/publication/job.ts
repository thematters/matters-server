import { Job, DoneCallback, ProcessCallbackFunction } from 'bull'

export interface ErrorHandlingJob {
  handleError(e: unknown): void
}

export abstract class ChainedJob<T = any> {
  job!: Job<T>
  done!: DoneCallback
  shared: SharedData = new SharedData()

  abstract handle(): Promise<any>

  setJob(job: Job) {
    this.job = job
  }

  setDoneCallback(done: DoneCallback) {
    this.done = done
  }

  setSharedData(data: SharedData) {
    this.shared = data
  }
}

export class SharedData {
  constructor(
    private data: Record<string, any> = {}
  ) {
    //
  }

  set<T = any>(key: string, value: T): T {
    return this.data[key] = value
  }

  get<T>(key: string): T {
    return this.data[key]
  }

  has(key: string) {
    return key in this.data
  }

  async remember<T>(key: string, callback: () => Promise<T>) {
    if (this.has(key)) {
      return this.get<T>(key)
    }

    return this.set<T>(key, await callback())
  }

  all() {
    return this.data
  }
}

export function chainJobs<T>(callback: () => ChainedJob<T>[]): ProcessCallbackFunction<T> {
  return async (job, done) => {
    const jobs = callback()
    const shared = new SharedData()

    for (const current of jobs) {
      current.setJob(job)
      current.setDoneCallback(done)
      current.setSharedData(shared)

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
