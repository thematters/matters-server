import { DoneCallback, Job } from 'bull'
import { ChainedJob, ErrorHandlingJob, SharedData, chainJobs } from '../job'

describe('SharedData', () => {
  it('can put and get data from the storage', () => {
    const data = new SharedData()
    data.set('foo', 'bar')
    expect(data.get('foo')).toBe('bar')
  })

  it('can initialize with existing data', () => {
    const data = new SharedData({ foo: 'bar' })
    expect(data.get('foo')).toBe('bar')
  })

  it('can determine if data exists in the storage', () => {
    const data = new SharedData({ foo: 'bar' })
    expect(data.has('foo')).toBe(true)
    expect(data.has('bar')).toBe(false)
  })

  it('can get all data from the storage', () => {
    const data = new SharedData({ one: 'foo' })
    data.set('two', 'bar')
    expect(data.all()).toMatchObject({ one: 'foo', two: 'bar' })
  })

  describe('remember', () => {
    it('returns the data when exists in the storage', async () => {
      const data = new SharedData({ foo: 'bar' })
      const result = await data.remember('foo', async () => 'baz')
      expect(result).toBe('bar')
    })

    it('resolves the data from callback when data does not exist', async () => {
      const data = new SharedData()
      const result = await data.remember('foo', async () => 'baz')
      expect(result).toBe('baz')
    })
  })
})

describe('chainJobs', () => {
  it('can chain jobs', async () => {
    let output = ''
    const mockJob = {} as unknown as jest.Mocked<Job>
    const run = chainJobs(() => ([
      new (class extends ChainedJob {
        async handle() {
          output += 'foo'
        }
      })(),
      new (class extends ChainedJob {
        async handle() {
          output += 'bar'
        }
      })(),
    ]))
    await run(mockJob, jest.fn())
    expect(output).toBe('foobar')
  })

  it('can terminate the job early', async () => {
    let output = ''
    const mockJob = {} as unknown as jest.Mocked<Job>
    const run = chainJobs(() => ([
      new (class extends ChainedJob {
        async handle() {
          return false
        }
      })(),
      new (class extends ChainedJob {
        async handle() {
          output += 'foo'
        }
      })(),
    ]))
    await run(mockJob, jest.fn())
    expect(output).toBe('')
  })

  it('throws error in the job by default', async () => {
    const mockJob = {} as unknown as jest.Mocked<Job>
    const run = chainJobs(() => ([
      new (class extends ChainedJob {
        async handle() {
          throw new Error('Something went wrong!')
        }
      })(),
    ]))
    expect(async () => await run(mockJob, jest.fn()))
      .rejects
      .toThrow('Something went wrong!')
  })

  it('can have own error handler', async () => {
    let handled = false
    const mockJob = {} as unknown as jest.Mocked<Job>
    const run = chainJobs(() => ([
      new (class extends ChainedJob implements ErrorHandlingJob {
        async handle() {
          throw new Error('Something went wrong!')
        }

        handleError(): void {
          handled = true
        }
      })(),
    ]))
    await run(mockJob, jest.fn())
    expect(handled).toBe(true)
  })
})
