import { UserInputError } from '#common/errors.js'
import actFediverse from '#mutations/fediverse/actFediverse.js'
import pruneFediverseSocialData from '#mutations/fediverse/pruneFediverseSocialData.js'
import refreshFediverseProfile from '#mutations/fediverse/refreshFediverseProfile.js'
import resolveFediverseReport from '#mutations/system/resolveFediverseReport.js'
import { jest } from '@jest/globals'

const createContext = (federationOverrides: Record<string, unknown> = {}) => {
  const validateUserState = jest.fn()
  const loadAuthorFederationSetting = jest.fn(async () => ({
    state: 'enabled',
  }))
  const federationExportService = {
    loadAuthorFederationSetting,
    ...federationOverrides,
  }

  return {
    context: {
      viewer: {
        id: '2',
        userName: 'mashbean',
      },
      dataSources: {
        userService: { validateUserState },
        federationExportService,
      },
    },
    federationExportService,
  }
}

describe('Fediverse social mutations', () => {
  test('runs a validated social action for an enabled viewer', async () => {
    const runSocialAction = jest.fn(async () => ({
      status: 'queued',
      activityId: 'https://matters.town/ap/activities/follow-1',
    }))
    const { context } = createContext({ runSocialAction })

    await expect(
      (actFediverse as any)(
        null,
        {
          input: {
            action: 'follow',
            account: '@alice@social.example',
          },
        },
        context
      )
    ).resolves.toMatchObject({
      status: 'queued',
    })
    expect(runSocialAction).toHaveBeenCalledWith({
      actorHandle: 'mashbean',
      actorId: '2',
      input: {
        action: 'follow',
        account: '@alice@social.example',
      },
    })
  })

  test.each([
    {
      input: { action: 'follow' },
      message: 'remote actor account or ID is required',
    },
    {
      input: { action: 'unfollow' },
      message: 'remote actor ID is required',
    },
    {
      input: { action: 'block' },
      message: 'remote actor ID is required',
    },
    {
      input: {
        action: 'report',
        remoteActorId: 'https://social.example/users/alice',
      },
      message: 'report reason is required',
    },
    {
      input: {
        action: 'like',
        remoteActorId: 'https://social.example/users/alice',
      },
      message: 'remote object ID is required',
    },
  ])('rejects invalid $input.action input', async ({ input, message }) => {
    const runSocialAction = jest.fn()
    const { context } = createContext({ runSocialAction })

    await expect(
      (actFediverse as any)(null, { input }, context)
    ).rejects.toThrow(new UserInputError(message))
    expect(runSocialAction).not.toHaveBeenCalled()
  })

  test('refreshes the enabled viewer profile', async () => {
    const refreshSocialProfile = jest.fn(async () => true)
    const { context } = createContext({ refreshSocialProfile })

    await expect(
      (refreshFediverseProfile as any)(null, {}, context)
    ).resolves.toBe(true)
    expect(refreshSocialProfile).toHaveBeenCalledWith('2')
  })

  test('forwards bounded retention input with the operator identity', async () => {
    const pruneGatewaySocialData = jest.fn(async () => true)
    const { context } = createContext({ pruneGatewaySocialData })

    await expect(
      (pruneFediverseSocialData as any)(
        null,
        { input: { retentionDays: 30, maxItems: 1_000 } },
        context
      )
    ).resolves.toBe(true)
    expect(pruneGatewaySocialData).toHaveBeenCalledWith({
      operatorId: '2',
      retentionDays: 30,
      maxItems: 1_000,
    })

    await (pruneFediverseSocialData as any)(null, { input: null }, context)
    expect(pruneGatewaySocialData).toHaveBeenLastCalledWith({
      operatorId: '2',
      retentionDays: undefined,
      maxItems: undefined,
    })
  })

  test('forwards a trimmed operator resolution to the gateway', async () => {
    const resolveGatewayAbuseCase = jest.fn(async () => true)
    const context = {
      viewer: { id: '9' },
      dataSources: {
        federationExportService: { resolveGatewayAbuseCase },
      },
    }

    await expect(
      (resolveFediverseReport as any)(
        null,
        {
          input: {
            id: 'report-1',
            resolution: '  reviewed and blocked  ',
          },
        },
        context
      )
    ).resolves.toBe(true)
    expect(resolveGatewayAbuseCase).toHaveBeenCalledWith({
      id: 'report-1',
      operatorId: '9',
      resolution: 'reviewed and blocked',
    })
  })
})
