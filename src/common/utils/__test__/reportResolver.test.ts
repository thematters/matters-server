import { jest } from '@jest/globals'

import { NODE_TYPES } from '#common/enums/index.js'
import report from '#queries/system/report.js'
import { Base64 } from 'js-base64'

const reportResolver = report as any

describe('report resolver', () => {
  test('keeps community watch report ids distinct', () => {
    const prefixed = reportResolver.id(
      { id: 'cw:42', source: 'community_watch' },
      {},
      {},
      {}
    )
    const unprefixed = reportResolver.id(
      { id: '42', source: 'community_watch' },
      {},
      {},
      {}
    )
    const direct = reportResolver.id({ id: '42' }, {}, {}, {})

    expect(Base64.decode(prefixed)).toBe(`${NODE_TYPES.Report}:cw:42`)
    expect(Base64.decode(unprefixed)).toBe(`${NODE_TYPES.Report}:cw:42`)
    expect(Base64.decode(direct)).toBe(`${NODE_TYPES.Report}:42`)
  })

  test('resolves report source and community watch audit record', async () => {
    const findCommunityWatchActionById = jest.fn(async (id: string) => ({
      id,
      uuid: 'action-42',
    }))
    const context = {
      dataSources: {
        commentService: {
          findCommunityWatchActionById,
        },
      },
    }

    expect(reportResolver.source({ id: '1' }, {}, {}, {})).toBe('direct')
    expect(
      reportResolver.source(
        { id: 'cw:42', source: 'community_watch' },
        {},
        {},
        {}
      )
    ).toBe('community_watch')
    expect(
      reportResolver.communityWatchAction(
        { id: '1', source: 'direct' },
        {},
        context as any,
        {}
      )
    ).toBeNull()
    await expect(
      reportResolver.communityWatchAction(
        { id: 'cw:42', source: 'community_watch' },
        {},
        context as any,
        {}
      )
    ).resolves.toMatchObject({ id: '42', uuid: 'action-42' })
    await expect(
      reportResolver.communityWatchAction(
        { id: '43', source: 'community_watch' },
        {},
        context as any,
        {}
      )
    ).resolves.toMatchObject({ id: '43', uuid: 'action-42' })
    expect(findCommunityWatchActionById).toHaveBeenCalledWith('42')
    expect(findCommunityWatchActionById).toHaveBeenCalledWith('43')
  })
})
