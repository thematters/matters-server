import _get from 'lodash/get'

import { ARTICLE_LICENSE_TYPE, NODE_TYPES } from 'common/enums'
import { toGlobalId } from 'common/utils'

import { putDraft } from './utils'

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
    const tags = ['abc', '123']
    const result = await putDraft({ draft: { id: draftId, tags } })
    expect(_get(result, 'tags.length')).toBe(2)
    expect(_get(result, 'tags.0')).toBe(tags[0])
    expect(_get(result, 'tags.1')).toBe(tags[1])

    // reset tags
    const resetResult1 = await putDraft({
      draft: { id: draftId, tags: null as any },
    })
    expect(_get(resetResult1, 'tags')).toBeNull()

    const resetResult2 = await putDraft({ draft: { id: draftId, tags: [] } })
    expect(_get(resetResult2, 'tags')).toBeNull()
  })

  test('edit draft collection', async () => {
    const collection = [
      toGlobalId({ type: NODE_TYPES.Article, id: 3 }),
      toGlobalId({ type: NODE_TYPES.Article, id: 4 }),
    ]
    const result = await putDraft({ draft: { id: draftId, collection } })
    expect(_get(result, 'collection.totalCount')).toBe(2)
    expect(
      [
        _get(result, 'collection.edges.0.node.id'),
        _get(result, 'collection.edges.1.node.id'),
      ].sort()
    ).toEqual(collection.sort())

    // reset collection
    const resetResult1 = await putDraft({
      draft: { id: draftId, collection: null as any },
    })
    expect(_get(resetResult1, 'collection.totalCount')).toBe(0)

    const resetResult2 = await putDraft({
      draft: { id: draftId, collection: [] },
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
    expect(_get(result, 'license')).toBe(ARTICLE_LICENSE_TYPE.cc_by_nc_nd_2)

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
        license: ARTICLE_LICENSE_TYPE.cc_by_nc_nd_2 as any,
      },
    })
    expect(_get(resetResult1, 'license')).toBe(
      ARTICLE_LICENSE_TYPE.cc_by_nc_nd_2
    )
  })
})
