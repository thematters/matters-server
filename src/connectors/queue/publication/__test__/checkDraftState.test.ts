import type { Connections, Draft } from 'definitions'
import { AtomService } from 'connectors/atomService'
import { CheckDraftState } from '../checkDraftState'
import { Job } from 'bull'
import { closeConnections, genConnections } from 'connectors/__test__/utils'
import { PUBLISH_STATE } from 'common/enums'
import { SharedData } from '../job'

let connections: Connections
let atomService: AtomService

beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
}, 30_000)

afterAll(async () => {
  await closeConnections(connections)
})

it('terminates the job if draft does not exist', async () => {
  const mock = {
    data: { draftId: '9999' },
    progress: jest.fn(),
  } as unknown as jest.Mocked<Job>
  const done = jest.fn()
  const job = new CheckDraftState(atomService)
  job.setJob(mock)
  job.setDoneCallback(done)
  expect(await job.handle()).toBe(false)
  expect(done).toHaveBeenCalled()
})

it.each([
  [PUBLISH_STATE.error],
  [PUBLISH_STATE.published],
  [PUBLISH_STATE.unpublished],
])('terminates the job if draft is in state: %s', async (state: string) => {
  const [draft] = await connections.knex.table<Draft>('draft').insert({
    authorId: '1',
    title: 'Greeting',
    publishState: state,
  }).returning('*')
  const mock = {
    data: { draftId: draft.id },
    progress: jest.fn(),
  } as unknown as jest.Mocked<Job>
  const done = jest.fn()
  const job = new CheckDraftState(atomService)
  job.setJob(mock)
  job.setDoneCallback(done)
  expect(await job.handle()).toBe(false)
  expect(done).toHaveBeenCalled()
})

it('passes the checking if draft is in pending state', async () => {
  const [draft] = await connections.knex.table<Draft>('draft').insert({
    authorId: '1',
    title: 'Greeting',
    publishState: PUBLISH_STATE.pending,
  }).returning('*')
  const mock = {
    data: { draftId: draft.id },
    progress: jest.fn(),
  } as unknown as jest.Mocked<Job>
  const shared = new SharedData()
  const job = new CheckDraftState(atomService)
  job.setJob(mock)
  job.setSharedData(shared)
  expect(await job.handle()).toBeUndefined()
  expect(shared.has('draft')).toBe(true)
  expect(shared.get('draft')).toStrictEqual(draft)
})
