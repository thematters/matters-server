import type { Connections } from 'definitions'

import { CampaignService, SystemService } from 'connectors'

import { genConnections, closeConnections, testClient } from '../utils'

let connections: Connections
let campaignService: CampaignService
let systemService: SystemService

beforeAll(async () => {
  connections = await genConnections()
  campaignService = new CampaignService(connections)
  systemService = new SystemService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('create or update wrting challenges', () => {
  const PUT_WRITING_CHALLENGE = /* GraphQL */ `
    mutation ($input: PutWritingChallengeInput!) {
      putWritingChallenge(input: $input) {
        id
        shortHash
        name
        description
        cover
        link
        applicationPeriod {
          start
          end
        }
        writingPeriod {
          start
          end
        }
        stages {
          name
          period {
            start
            end
          }
        }
        state
      }
    }
  `
  test('create success', async () => {
    const server = testClient({ connections, isAuth: true, isAdmin: true })
    console.log(server)
    console.log(PUT_WRITING_CHALLENGE)
    console.log(campaignService)
    console.log(systemService)
  })
})
