import type { Connections } from '#definitions/index.js'

import { v4 as uuidv4 } from 'uuid'

import { USER_FEATURE_FLAG_TYPE, RESERVED_TAGS } from '#common/enums/index.js'
import { UserInputError, ForbiddenError } from '#common/errors.js'
import { PublicationService } from '../article/publicationService.js'
import { AtomService } from '../atomService.js'
import { TagService } from '../tagService.js'
import { UserService } from '../userService.js'

import { genConnections, closeConnections } from './utils.js'

let connections: Connections
let tagService: TagService
let atomService: AtomService
let publicationService: PublicationService
let userService: UserService

beforeAll(async () => {
  connections = await genConnections()
  tagService = new TagService(connections)
  atomService = new AtomService(connections)
  publicationService = new PublicationService(connections)
  userService = new UserService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

test('countArticles', async () => {
  const count = await tagService.countArticles({ id: '2' })
  expect(count).toBeDefined()
})

describe('findArticles', () => {
  const toIds = (articles: { id: string }[]) => articles.map(({ id }) => id)
  test('id', async () => {
    const articles = await tagService.findArticles({ id: '2' })
    expect(articles).toBeDefined()
  })
  test('excludeRestricted', async () => {
    const articles = await tagService.findArticles({
      id: '2',
      excludeRestricted: true,
    })
    expect(articles).toBeDefined()

    // create a restricted user
    await atomService.deleteMany({ table: 'article_recommend_setting' })
    const article = await atomService.findUnique({
      table: 'article',
      where: { id: articles[0].id },
    })
    await atomService.create({
      table: 'user_restriction',
      data: { userId: article?.authorId, type: 'articleNewest' },
    })
    const excluded3 = await tagService.findArticles({
      id: '2',
      excludeRestricted: true,
    })
    expect(toIds(excluded3)).not.toContain(articles[0].id)
    expect(toIds(excluded3)).toContain(articles[1].id)
  })
  test('exclude spam', async () => {
    const spamThreshold = 0.5
    const articles = await tagService.findArticles({
      id: '2',
      spamThreshold,
    })
    expect(articles).toBeDefined()

    // spam flag is on but no detected articles
    const excluded1 = await tagService.findArticles({
      id: '2',
      spamThreshold,
    })
    expect(toIds(excluded1)).toEqual(toIds(articles))

    // spam detected
    const article = await atomService.update({
      table: 'article',
      where: { id: articles[0].id },
      data: { spamScore: spamThreshold + 0.1 },
    })
    const excluded2 = await tagService.findArticles({
      id: '2',
      spamThreshold,
    })
    expect(toIds(excluded2)).not.toContain(articles[0].id)

    // bypass spam detection
    await userService.updateFeatureFlags(article.authorId, [
      USER_FEATURE_FLAG_TYPE.bypassSpamDetection,
    ])
    const excluded3 = await tagService.findArticles({
      id: '2',
      spamThreshold,
    })
    expect(toIds(excluded3)).toContain(articles[0].id)
  })
})

test('create', async () => {
  const content = 'foo'
  const tag = await tagService.upsert({ content, creator: '0' })
  expect(tag.content).toEqual(content)
  // upsert should be idempotent and return same tag
  const tag2 = await tagService.upsert({ content, creator: '0' })
  expect(tag2.id).toEqual(tag.id)
})

describe('findByAuthorUsage', () => {
  test('find nothing', async () => {
    const user = await userService.create({
      userName: 'test-findByAuthorUsage1',
    })
    const [tags, totalCount] = await tagService.findByAuthorUsage({
      userId: user.id,
    })
    expect(tags.length).toBe(0)
    expect(totalCount).toBe(0)
  })
  test('find tags orders by usage', async () => {
    const user = await userService.create({
      userName: 'test-findByAuthorUsage2',
    })
    const [article1] = await publicationService.createArticle({
      title: 'test',
      content: 'test',
      authorId: user.id,
    })
    const [article2] = await publicationService.createArticle({
      title: 'test',
      content: 'test',
      authorId: user.id,
    })

    await tagService.createArticleTags({
      articleIds: [article1.id],
      creator: article1.authorId,
      tagIds: ['1', '2'],
    })
    await tagService.createArticleTags({
      articleIds: [article2.id],
      creator: article2.authorId,
      tagIds: ['2', '3'],
    })

    const [tags, totalCount] = await tagService.findByAuthorUsage({
      userId: user.id,
    })
    expect(tags[0].id).toBe('2')
    expect(totalCount).toBe(3)

    // test pagination
    const [tags2, totalCount2] = await tagService.findByAuthorUsage({
      userId: user.id,
      take: 1,
      skip: 1,
    })
    expect(tags2[0].id).toBe('3')
    expect(tags2.length).toBe(1)
    expect(totalCount2).toBe(3)
  })
})

test('countMoments', async () => {
  const count = await tagService.countMoments({ id: '2' })
  expect(count).toBeDefined()
})

describe('moments', () => {
  const spamThreshold = 0.5
  let tagId: string
  const momentIds: string[] = []

  const createMoment = async (shortHash: string) => {
    const moment = await atomService.create({
      table: 'moment',
      data: { shortHash, authorId: '1', content: 'moment', state: 'active' },
    })
    await atomService.create({
      table: 'moment_tag',
      data: { momentId: moment.id, tagId },
    })
    return moment.id as string
  }

  beforeAll(async () => {
    const tag = await tagService.upsert({
      content: 'moment-feed-tag',
      creator: '1',
    })
    tagId = tag.id
    // create 3 moments attached with this tag
    momentIds.push(await createMoment('moment-feed-1'))
    momentIds.push(await createMoment('moment-feed-2'))
    momentIds.push(await createMoment('moment-feed-3'))
  })

  const toIds = (moments: { id: string }[]) => moments.map(({ id }) => id)

  test('findMoments orders by id desc', async () => {
    const moments = await tagService.findMoments({ id: tagId })
    expect(toIds(moments)).toEqual([...momentIds].reverse())
  })

  test('findMoments paginates', async () => {
    const page = await tagService.findMoments({ id: tagId }).offset(1).limit(1)
    expect(toIds(page)).toEqual([momentIds[1]])
  })

  test('findMoments excludes spam', async () => {
    const spamId = momentIds[momentIds.length - 1]
    await atomService.update({
      table: 'moment',
      where: { id: spamId },
      data: { spamScore: spamThreshold + 0.1 },
    })
    const moments = await tagService.findMoments({ id: tagId, spamThreshold })
    expect(toIds(moments)).not.toContain(spamId)
    expect(toIds(moments)).toContain(momentIds[0])
  })

  test('countMoments excludes spam', async () => {
    const withSpam = await tagService.countMoments({ id: tagId })
    expect(withSpam).toBe(momentIds.length)
    const withoutSpam = await tagService.countMoments({
      id: tagId,
      spamThreshold,
    })
    expect(withoutSpam).toBe(momentIds.length - 1)
  })
})

describe('findRelatedAuthors', () => {
  let tagId: string
  // article-side authors
  let articleTop: string
  let articleLow: string
  // moment-side authors
  let momentTop: string
  let momentLow: string

  const seedArticleAuthor = async (authorId: string, reads: number) => {
    const [article] = await publicationService.createArticle({
      title: 'related',
      content: 'related',
      authorId,
    })
    await tagService.createArticleTags({
      articleIds: [article.id],
      creator: authorId,
      tagIds: [tagId],
    })
    // reads feed article_stats_materialized (mean_reads)
    await atomService.create({
      table: 'article_read_count',
      data: {
        userId: authorId,
        articleId: article.id,
        count: '1',
        timedCount: String(reads),
      },
    })
    return article.id as string
  }

  const seedMoment = async (
    authorId: string,
    {
      likers = [],
      commenters = [],
    }: { likers?: string[]; commenters?: string[] }
  ) => {
    const moment = await atomService.create({
      table: 'moment',
      data: {
        shortHash: `rel-${authorId}-${Math.random().toString(36).slice(2, 8)}`,
        authorId,
        content: 'moment',
        state: 'active',
      },
    })
    await atomService.create({
      table: 'moment_tag',
      data: { momentId: moment.id, tagId },
    })
    for (const userId of likers) {
      await atomService.create({
        table: 'action_moment',
        data: { userId, action: 'like', targetId: moment.id },
      })
    }
    const { id: momentTypeId } = await atomService.findFirst({
      table: 'entity_type',
      where: { table: 'moment' },
    })
    for (const userId of commenters) {
      await atomService.create({
        table: 'comment',
        data: {
          uuid: uuidv4(),
          content: 'c',
          authorId: userId,
          targetId: moment.id,
          targetTypeId: momentTypeId,
          type: 'moment',
          state: 'active',
        },
      })
    }
    return moment.id as string
  }

  const newUser = async (name: string) => {
    const user = await userService.create({ userName: name })
    return user.id as string
  }

  const refresh = async () => {
    await connections.knex.raw(
      'refresh materialized view article_stats_materialized'
    )
    await connections.knex.raw(
      'refresh materialized view tag_related_authors_materialized'
    )
  }

  beforeAll(async () => {
    const tag = await tagService.upsert({
      content: 'related-authors-tag',
      creator: '1',
    })
    tagId = tag.id

    articleTop = await newUser('rel-article-top')
    articleLow = await newUser('rel-article-low')
    momentTop = await newUser('rel-moment-top')
    momentLow = await newUser('rel-moment-low')

    // article side: two authors with distinct read scores so the top one
    // passes the 25th percentile gate
    await seedArticleAuthor(articleTop, 100)
    await seedArticleAuthor(articleLow, 1)

    // moment side: two authors with distinct engagement; top gets more
    // non-author comments and likes than low
    const liker1 = await newUser('rel-liker-1')
    const liker2 = await newUser('rel-liker-2')
    const commenter1 = await newUser('rel-commenter-1')
    const commenter2 = await newUser('rel-commenter-2')
    await seedMoment(momentTop, {
      likers: [liker1, liker2],
      commenters: [commenter1, commenter2],
    })
    await seedMoment(momentLow, { likers: [liker1], commenters: [] })

    await refresh()
  })

  test('includes both article and moment authors above the threshold', async () => {
    const ids = await tagService.findRelatedAuthors({ id: tagId })
    expect(ids).toContain(articleTop)
    expect(ids).toContain(momentTop)
    // low-engagement authors are gated out by the 25th percentile threshold
    expect(ids).not.toContain(articleLow)
    expect(ids).not.toContain(momentLow)
  })

  test('both sides top authors normalize to 1.0 and land in the top 5', async () => {
    const top5 = await tagService.findRelatedAuthors({ id: tagId, take: 5 })
    expect(top5).toContain(articleTop)
    expect(top5).toContain(momentTop)
  })

  test('ordering is deterministic via author_id tiebreaker', async () => {
    const first = await tagService.findRelatedAuthors({ id: tagId })
    const second = await tagService.findRelatedAuthors({ id: tagId })
    expect(first).toEqual(second)
    // both tied at 1.0 → ordered by ascending author_id among the tie
    const idxTop = first.indexOf(articleTop)
    const idxMoment = first.indexOf(momentTop)
    const bySmallerId =
      Number(articleTop) < Number(momentTop)
        ? idxTop < idxMoment
        : idxMoment < idxTop
    expect(bySmallerId).toBe(true)
  })

  test('excludes likers that are frozen / archived / restricted', async () => {
    // a fresh tag with a single moment author whose only likers are ineligible
    const tag = await tagService.upsert({
      content: 'related-authors-filter-tag',
      creator: '1',
    })
    const localTagId = tag.id
    const author = await newUser('rel-filtered-author')
    const otherAuthor = await newUser('rel-filtered-other')
    const frozen = await newUser('rel-frozen-liker')
    await atomService.update({
      table: 'user',
      where: { id: frozen },
      data: { state: 'frozen' },
    })

    const swapTag = tagId
    tagId = localTagId
    // author's moment is only liked by a frozen user → no eligible engagement
    await seedMoment(author, { likers: [frozen], commenters: [] })
    // give the other author real engagement so a threshold exists
    const liker = await newUser('rel-eligible-liker')
    await seedMoment(otherAuthor, { likers: [liker], commenters: [] })
    tagId = swapTag

    await refresh()

    const ids = await tagService.findRelatedAuthors({ id: localTagId })
    expect(ids).not.toContain(author)
  })

  test('excludes spam comments from the moment engagement score', async () => {
    // the view reads the threshold inline; the seed ships spam_detection off,
    // so turn it on to exercise the spam-comment filter
    const threshold = 0.5
    await atomService.updateMany({
      table: 'feature_flag',
      where: { name: 'spam_detection' },
      data: { flag: 'on', value: threshold },
    })

    const tag = await tagService.upsert({
      content: 'related-authors-spam-comment-tag',
      creator: '1',
    })
    const localTagId = tag.id
    const spammedAuthor = await newUser('rel-spam-commented-author')
    const cleanAuthor = await newUser('rel-clean-commented-author')
    const spamCommenter = await newUser('rel-spam-commenter')
    const cleanCommenter = await newUser('rel-clean-commenter')

    const swapTag = tagId
    tagId = localTagId
    // spammedAuthor's only comment is spam → its engagement drops to zero
    const spammedMomentId = await seedMoment(spammedAuthor, {
      commenters: [spamCommenter],
    })
    await seedMoment(cleanAuthor, { commenters: [cleanCommenter] })
    tagId = swapTag

    const { id: momentTypeId } = await atomService.findFirst({
      table: 'entity_type',
      where: { table: 'moment' },
    })
    await atomService.updateMany({
      table: 'comment',
      where: {
        targetId: spammedMomentId,
        targetTypeId: momentTypeId,
        type: 'moment',
      },
      data: { spamScore: threshold + 0.1 },
    })

    await refresh()

    const ids = await tagService.findRelatedAuthors({ id: localTagId })
    expect(ids).not.toContain(spammedAuthor)
    expect(ids).toContain(cleanAuthor)
  })
})

test('countAuthors', async () => {
  const count = await tagService.countAuthors({ id: '2' })
  expect(count).toBeDefined()
  expect(typeof count).toBe('number')
  expect(count).toBeGreaterThanOrEqual(0)
})

describe('validate', () => {
  const viewerId = '1'
  test('should return content if valid', async () => {
    const content = await tagService.validate('validtag', { viewerId })
    expect(content).toBe('validtag')
  })

  test('should throw UserInputError for bad tag format', async () => {
    await expect(tagService.validate('#badtag', { viewerId })).rejects.toThrow(
      UserInputError
    )
  })

  test('should throw ForbiddenError for reserved tag by normal user', async () => {
    await expect(
      tagService.validate(RESERVED_TAGS[0], { viewerId })
    ).rejects.toThrow(ForbiddenError)
  })
})
