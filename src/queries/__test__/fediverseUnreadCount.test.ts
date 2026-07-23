import { jest } from '@jest/globals'

import viewerFediverseUnreadCount from '../fediverse/viewerFediverseUnreadCount.js'

describe('viewerFediverseUnreadCount', () => {
  test('loads the unread count for an enabled viewer', async () => {
    const validateUserState = jest.fn()
    const loadAuthorFederationSetting = jest.fn(async () => ({
      state: 'enabled',
    }))
    const loadSocialUnreadCount = jest.fn(async () => 7)

    const result = await (viewerFediverseUnreadCount as any)(
      null,
      {},
      {
        viewer: {
          id: '2',
          userName: 'mashbean',
        },
        dataSources: {
          userService: { validateUserState },
          federationExportService: {
            loadAuthorFederationSetting,
            loadSocialUnreadCount,
          },
        },
      }
    )

    expect(validateUserState).toHaveBeenCalledWith({
      id: '2',
      userName: 'mashbean',
    })
    expect(loadAuthorFederationSetting).toHaveBeenCalledWith('2')
    expect(loadSocialUnreadCount).toHaveBeenCalledWith('mashbean')
    expect(result).toBe(7)
  })
})
