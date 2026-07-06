import type { Connections } from '#definitions/index.js'

import { USER_STATE } from '#common/enums/index.js'
import { AtomService } from '../atomService.js'
import { UserService } from '../userService.js'
import { genConnections, closeConnections } from './utils.js'

let connections: Connections
let userService: UserService
let atomService: AtomService

// a seed user with no spam/frozen entanglement, reused across cases
const USER_ID = '4'

beforeAll(async () => {
  connections = await genConnections()
  userService = new UserService(connections)
  atomService = new AtomService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

const seedContent = async () => {
  const article = await atomService.create({
    table: 'article',
    data: {
      authorId: USER_ID,
      state: 'active',
      shortHash: 'freezeSpamArticle01',
      isSpam: null,
    },
  })
  const comment = await atomService.create({
    table: 'comment',
    data: {
      uuid: '00000000-0000-4000-8000-00000000fa01',
      authorId: USER_ID,
      state: 'active',
      content: 'freeze-spam-comment',
      type: 'article',
      targetId: article.id,
      targetTypeId: '4',
      isSpam: null,
    },
  })
  const moment = await atomService.create({
    table: 'moment',
    data: {
      shortHash: 'freezeSpamMoment01',
      authorId: USER_ID,
      state: 'active',
      content: 'freeze-spam-moment',
      isSpam: null,
    },
  })
  return { article, comment, moment }
}

const readSpam = async () => {
  const [article, comment, moment] = await Promise.all([
    atomService.findFirst({
      table: 'article',
      where: { authorId: USER_ID, shortHash: 'freezeSpamArticle01' },
    }),
    atomService.findFirst({
      table: 'comment',
      where: { authorId: USER_ID, content: 'freeze-spam-comment' },
    }),
    atomService.findFirst({
      table: 'moment',
      where: { authorId: USER_ID, content: 'freeze-spam-moment' },
    }),
  ])
  return {
    article: article?.isSpam,
    comment: comment?.isSpam,
    moment: moment?.isSpam,
  }
}

describe('freezeUser / unfreezeUser spam marking', () => {
  beforeEach(async () => {
    await atomService.deleteMany({
      table: 'comment',
      where: { authorId: USER_ID, content: 'freeze-spam-comment' },
    })
    await atomService.deleteMany({
      table: 'moment',
      where: { authorId: USER_ID, content: 'freeze-spam-moment' },
    })
    await atomService.deleteMany({
      table: 'article',
      where: { authorId: USER_ID, shortHash: 'freezeSpamArticle01' },
    })
    await atomService.update({
      table: 'user',
      where: { id: USER_ID },
      data: { state: USER_STATE.active },
    })
  })

  test('freeze marks all content spam, unfreeze reverts to null', async () => {
    await seedContent()
    expect(await readSpam()).toEqual({
      article: null,
      comment: null,
      moment: null,
    })

    await userService.freezeUser(USER_ID)
    expect(await readSpam()).toEqual({
      article: true,
      comment: true,
      moment: true,
    })

    await userService.unfreezeUser(USER_ID, USER_STATE.active)
    expect(await readSpam()).toEqual({
      article: null,
      comment: null,
      moment: null,
    })
  })

  test('freeze does not overwrite an existing is_spam=false verdict', async () => {
    const { article } = await seedContent()
    await atomService.update({
      table: 'article',
      where: { id: article.id },
      data: { isSpam: false },
    })

    await userService.freezeUser(USER_ID)

    const after = await readSpam()
    // manual "not spam" verdict is preserved; the rest are marked
    expect(after.article).toBe(false)
    expect(after.comment).toBe(true)
    expect(after.moment).toBe(true)

    // unfreeze must not resurrect the false verdict into null
    await userService.unfreezeUser(USER_ID, USER_STATE.active)
    expect((await readSpam()).article).toBe(false)
  })
})
