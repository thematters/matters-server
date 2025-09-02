import type { Connections } from '#definitions/index.js'

import { PublicationService } from '../article/publicationService.js'
import { MomentService } from '../momentService.js'
import { UserService } from '../userService.js'
import { UserWorkService } from '../userWorkService.js'
import { genConnections, closeConnections } from './utils.js'

let connections: Connections
let userWorkService: UserWorkService
let userService: UserService
let momentService: MomentService
let publicationService: PublicationService

beforeAll(async () => {
  connections = await genConnections()
  userWorkService = new UserWorkService(connections)
  userService = new UserService(connections)
  momentService = new MomentService(connections)
  publicationService = new PublicationService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('totalPinnedWorks', () => {
  test('get 0 pinned works', async () => {
    const res = await userWorkService.totalPinnedWorks('1')
    expect(res).toBe(0)
  })
  test('get 1 pinned works', async () => {
    await connections
      .knex('collection')
      .insert({ authorId: '1', title: 'test', pinned: true })
    const res = await userWorkService.totalPinnedWorks('1')
    expect(res).toBe(1)
  })
})

describe('findWritingsByUser', () => {
  test('find nothing', async () => {
    const user = await userService.create({ userName: 'testFindWritings1' })
    const res = await userWorkService.findWritingsByUser(user.id)
    expect(res.length).toEqual(0)
  })
  test('find 1 record', async () => {
    const user = await userService.create({ userName: 'testFindWritings2' })
    const moment = await momentService.create({ content: 'test' }, user)
    const records = await userWorkService.findWritingsByUser(user.id)
    expect(records[0].id).toBe(moment.id)
    expect(records[0].type).toBe('Moment')
  })
  test('find multi records', async () => {
    const user = await userService.create({ userName: 'testFindWritings3' })
    await momentService.create({ content: 'test' }, user)
    await momentService.create({ content: 'test' }, user)
    await publicationService.createArticle({
      title: 'test',
      content: 'test',
      authorId: user.id,
    })

    const records = await userWorkService.findWritingsByUser(user.id)
    expect(records.length).toEqual(3)
  })
})
