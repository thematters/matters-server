import _get from 'lodash/get'

import { ARTICLE_LICENSE_TYPE, NODE_TYPES } from 'common/enums'
import { toGlobalId } from 'common/utils'

import { putDraft } from './utils'

declare global {
  // eslint-disable-next-line no-var
  var mockEnums: any
}

jest.mock('common/enums', () => {
  const originalModule = jest.requireActual('common/enums')
  globalThis.mockEnums = {
    ...originalModule,
    __esModule: true,
  }
  return globalThis.mockEnums
})

describe('put draft', () => {
  let draftId: string

  test('edit draft summary', async () => {
    const { id } = await putDraft({
      draft: {
        title: Math.random().toString(),
        content: Math.random().toString(),
      },
    })
    draftId = id

    const summary = 'my customized summary'
    const result = await putDraft({ draft: { id: draftId, summary } })
    expect(_get(result, 'summary')).toBe(summary)
    expect(_get(result, 'summaryCustomized')).toBe(true)

    // reset summary
    const resetResult1 = await putDraft({
      draft: { id: draftId, summary: null as any },
    })
    expect(_get(resetResult1, 'summary.length')).toBeGreaterThan(0)
    expect(_get(resetResult1, 'summaryCustomized')).toBe(false)

    const resetResult2 = await putDraft({ draft: { id: draftId, summary: '' } })
    expect(_get(resetResult2, 'summaryCustomized')).toBe(false)
  })

  test('edit draft tags', async () => {
    const limit = 4
    globalThis.mockEnums.MAX_TAGS_PER_ARTICLE_LIMIT = limit
    const tags = [
      'abc',
      '123',
      'tags too long | too long | too long | too long | too long', // will be omitted at publishing time
      'tag4',
      'tag5',
    ]

    // create draft setting tags out of limit
    const createFailedRes = await putDraft({
      draft: {
        title: Math.random().toString(),
        content: Math.random().toString(),
        tags: tags.slice(0, limit + 1),
      },
    })
    expect(_get(createFailedRes, 'errors.0.message')).toBe(
      `Not allow more than ${limit} tags on an article`
    )

    // create draft setting tags within limit
    const draft = await putDraft({
      draft: {
        title: Math.random().toString(),
        content: Math.random().toString(),
        tags: tags.slice(0, limit),
      },
    })
    expect(_get(draft, 'tags.length')).toBe(limit)
    expect(_get(draft, 'tags.0')).toBe(tags[0])
    expect(_get(draft, 'tags.1')).toBe(tags[1])
    expect(_get(draft, 'tags.2')).toBe(tags[2])

    // const { publishState } = await publishArticle({ id: draft.id })
    // expect(publishState).toBe(PUBLISH_STATE.pending)
    // to check dbTags.length should be 2;

    draftId = draft.id
    // should retain the tags after setting something else, without changing tags
    const tagsResult1 = await putDraft({
      draft: { id: draftId, summary: 'any-summary' },
    })
    expect(_get(tagsResult1, 'tags.length')).toBe(limit)
    expect(_get(tagsResult1, 'tags.0')).toBe(tags[0])
    expect(_get(tagsResult1, 'tags.1')).toBe(tags[1])

    // create draft setting tags out of limit
    const editFailedRes = await putDraft({
      draft: {
        id: draftId,
        tags: tags.slice(0, limit + 1),
      },
    })
    expect(_get(editFailedRes, 'errors.0.message')).toBe(
      `Not allow more than ${limit} tags on an article`
    )
    // reset tags
    const resetResult1 = await putDraft({
      draft: { id: draftId, tags: null as any },
    })
    expect(_get(resetResult1, 'tags')).toBeNull()

    const resetResult2 = await putDraft({ draft: { id: draftId, tags: [] } })
    expect(_get(resetResult2, 'tags')).toBeNull()
  })

  test('edit draft collection', async () => {
    const limit = 4
    globalThis.mockEnums.MAX_ARTICLES_PER_CONNECTION_LIMIT = limit
    const collection = [
      toGlobalId({ type: NODE_TYPES.Article, id: 3 }),
      toGlobalId({ type: NODE_TYPES.Article, id: 4 }),
      toGlobalId({ type: NODE_TYPES.Article, id: 5 }),
      toGlobalId({ type: NODE_TYPES.Article, id: 6 }),
      toGlobalId({ type: NODE_TYPES.Article, id: 2 }),
    ]

    // create draft setting collection out of limit
    const createFailedRes = await putDraft({
      draft: {
        title: Math.random().toString(),
        content: Math.random().toString(),
        collection: collection.slice(0, limit + 1),
      },
    })
    expect(_get(createFailedRes, 'errors.0.message')).toBe(
      `Not allow more than ${limit} articles in collection`
    )

    // create draft setting collection within limit
    const createSucceedRes = await putDraft({
      draft: {
        title: Math.random().toString(),
        content: Math.random().toString(),
        collection: collection.slice(0, limit),
      },
    })
    expect(_get(createSucceedRes, 'collection.totalCount')).toBe(limit)
    expect([
      _get(createSucceedRes, 'collection.edges.0.node.id'),
      _get(createSucceedRes, 'collection.edges.1.node.id'),
      _get(createSucceedRes, 'collection.edges.2.node.id'),
      _get(createSucceedRes, 'collection.edges.3.node.id'),
    ]).toEqual(collection.slice(0, limit))

    draftId = createSucceedRes.id

    // should retain the collection after setting something else, without changing collection
    const editRes = await putDraft({
      draft: { id: draftId, summary: 'any-summary' },
    })
    expect(_get(editRes, 'collection.totalCount')).toBe(limit)
    expect([
      _get(editRes, 'collection.edges.0.node.id'),
      _get(editRes, 'collection.edges.1.node.id'),
      _get(editRes, 'collection.edges.2.node.id'),
      _get(editRes, 'collection.edges.3.node.id'),
    ]).toEqual(collection.slice(0, limit))

    // edit draft settting collection out of limit
    const editFailedRes = await putDraft({
      draft: {
        id: draftId,
        collection: collection.slice(0, limit + 1),
      },
    })
    expect(_get(editFailedRes, 'errors.0.message')).toBe(
      `Not allow more than ${limit} articles in collection`
    )

    // edit draft settting collection within limit
    const editSucceedRes = await putDraft({
      draft: {
        id: draftId,
        collection: collection.slice(0, limit),
      },
    })
    expect(_get(editSucceedRes, 'collection.totalCount')).toBe(limit)
    expect([
      _get(editSucceedRes, 'collection.edges.0.node.id'),
      _get(editSucceedRes, 'collection.edges.1.node.id'),
      _get(editSucceedRes, 'collection.edges.2.node.id'),
      _get(editSucceedRes, 'collection.edges.3.node.id'),
    ]).toEqual(collection.slice(0, limit))

    // out of limit collection can remain
    const smallerlimit = limit - 1
    globalThis.mockEnums.MAX_ARTICLES_PER_CONNECTION_LIMIT = smallerlimit
    const remainRes = await putDraft({
      draft: {
        id: draftId,
        collection: collection.slice(0, smallerlimit + 1),
      },
    })
    expect(_get(remainRes, 'collection.totalCount')).toBe(smallerlimit + 1)
    expect([
      _get(remainRes, 'collection.edges.0.node.id'),
      _get(remainRes, 'collection.edges.1.node.id'),
      _get(remainRes, 'collection.edges.2.node.id'),
      _get(remainRes, 'collection.edges.3.node.id'),
    ]).toEqual(collection.slice(0, smallerlimit + 1))

    // out of limit collection can not increase
    const increaseRes = await putDraft({
      draft: {
        id: draftId,
        collection: collection.slice(0, smallerlimit + 2),
      },
    })
    expect(_get(increaseRes, 'errors.0.message')).toBe(
      `Not allow more than ${smallerlimit} articles in collection`
    )

    // out of limit collection can decrease
    const decreaseRes = await putDraft({
      draft: {
        id: draftId,
        collection: collection.slice(0, smallerlimit - 1),
      },
    })
    expect(_get(decreaseRes, 'collection.totalCount')).toBe(smallerlimit - 1)

    // reset collection
    const resetResult1 = await putDraft({
      draft: { id: draftId, collection: [] },
    })
    expect(_get(resetResult1, 'collection.totalCount')).toBe(0)

    const resetResult2 = await putDraft({
      draft: { id: draftId, collection: null as any },
    })
    expect(_get(resetResult2, 'collection.totalCount')).toBe(0)
  })

  test('edit draft license', async () => {
    const { id } = await putDraft({
      draft: {
        title: Math.random().toString(),
        content: Math.random().toString(),
      },
    })
    draftId = id

    const result = await putDraft({ draft: { id: draftId } })

    // default license
    expect(_get(result, 'license')).toBe(ARTICLE_LICENSE_TYPE.cc_by_nc_nd_4)

    // set to CC0
    const result2 = await putDraft({
      draft: { id: draftId, license: ARTICLE_LICENSE_TYPE.cc_0 as any },
    })
    expect(_get(result2, 'license')).toBe(ARTICLE_LICENSE_TYPE.cc_0)

    // change license to ARR should succeed
    const changeResult = await putDraft({
      draft: { id: draftId, license: ARTICLE_LICENSE_TYPE.arr as any },
    })
    expect(_get(changeResult, 'license')).toBe(ARTICLE_LICENSE_TYPE.arr)

    // after changing only tags, the license and accessType should remain unchanged
    const changeTagsResult = await putDraft({
      draft: { id: draftId, tags: ['arr license test'] },
    })
    expect(_get(changeTagsResult, 'license')).toBe(ARTICLE_LICENSE_TYPE.arr)

    // reset license
    const resetResult1 = await putDraft({
      draft: {
        id: draftId,
        license: ARTICLE_LICENSE_TYPE.cc_by_nc_nd_4 as any,
      },
    })
    expect(_get(resetResult1, 'license')).toBe(
      ARTICLE_LICENSE_TYPE.cc_by_nc_nd_4
    )
  })

  test('edit draft support settings', async () => {
    const { id } = await putDraft({
      draft: {
        title: Math.random().toString(),
        content: Math.random().toString(),
      },
    })
    draftId = id
    const result = await putDraft({ draft: { id: draftId } })

    // default
    expect(_get(result, 'requestForDonation')).toBe(null)
    expect(_get(result, 'replyToDonator')).toBe(null)

    // set long texts (length > 140) will throw error
    const longText = 't'.repeat(141)
    const result2 = await putDraft({
      draft: { id: draftId, requestForDonation: longText },
    })
    expect(_get(result2, 'errors')).toBeDefined()
    const result3 = await putDraft({
      draft: { id: draftId, replyToDonator: longText },
    })
    expect(_get(result3, 'errors')).toBeDefined()

    // set text
    const text = 't'.repeat(140)
    const result4 = await putDraft({
      draft: { id: draftId, requestForDonation: text, replyToDonator: text },
    })
    expect(_get(result4, 'requestForDonation')).toBe(text)
    expect(_get(result4, 'replyToDonator')).toBe(text)
  })

  test('edit draft comment setting', async () => {
    const { id, canComment } = await putDraft({
      draft: {
        title: Math.random().toString(),
        content: Math.random().toString(),
      },
    })
    // default
    expect(canComment).toBeTruthy()

    // turn off canComment
    draftId = id
    const result = await putDraft({ draft: { id: draftId, canComment: false } })

    expect(_get(result, 'canComment')).toBeFalsy()

    // turn on canComment
    const result2 = await putDraft({ draft: { id: draftId, canComment: true } })

    expect(_get(result2, 'canComment')).toBeTruthy()
  })

  test('edit draft sensitive settings', async () => {
    const { id, sensitiveByAuthor } = await putDraft({
      draft: {
        title: Math.random().toString(),
        content: Math.random().toString(),
      },
    })

    // default
    expect(sensitiveByAuthor).toBeFalsy()

    // turn on by author
    draftId = id
    const result = await putDraft({ draft: { id: draftId, sensitive: true } })
    expect(_get(result, 'sensitiveByAuthor')).toBeTruthy()

    // turn off by author
    const result2 = await putDraft({ draft: { id: draftId, sensitive: false } })
    expect(_get(result2, 'sensitiveByAuthor')).toBeFalsy()
  })
})
