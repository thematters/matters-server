import { jest } from '@jest/globals'

import { USER_FEATURE_FLAG_TYPE } from '#common/enums/index.js'
import features from '#queries/user/features.js'

describe('user public-safe features resolver', () => {
  test('exposes selected feature flags for current viewer', async () => {
    const userService = {
      findFeatureFlags: jest.fn(async () => [
        { type: USER_FEATURE_FLAG_TYPE.fediverseBeta },
        { type: USER_FEATURE_FLAG_TYPE.communityWatch },
        { type: USER_FEATURE_FLAG_TYPE.bypassSpamDetection },
      ]),
    }

    const result = await features({ id: '1' } as any, {}, {
      viewer: { id: '1' },
      dataSources: { userService },
    } as any)

    expect(result).toEqual({
      fediverseBeta: true,
      communityWatch: true,
    })
  })

  test('does not expose another user feature eligibility', async () => {
    const userService = {
      findFeatureFlags: jest.fn(),
    }

    const result = await features({ id: '2' } as any, {}, {
      viewer: { id: '1' },
      dataSources: { userService },
    } as any)

    expect(result).toEqual({
      fediverseBeta: false,
      communityWatch: false,
    })
    expect(userService.findFeatureFlags).not.toHaveBeenCalled()
  })

  test('returns default feature eligibility for anonymous viewer', async () => {
    const userService = {
      findFeatureFlags: jest.fn(),
    }

    const result = await features({ id: '1' } as any, {}, {
      viewer: {},
      dataSources: { userService },
    } as any)

    expect(result).toEqual({
      fediverseBeta: false,
      communityWatch: false,
    })
    expect(userService.findFeatureFlags).not.toHaveBeenCalled()
  })
})
