import type {
  Context,
  APIGatewayProxyResult,
  APIGatewayEvent,
} from 'aws-lambda'

import { BadgeService } from '#connectors/index.js'

import { connections } from '../connections.js'

const badgeService = new BadgeService(connections)

export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`)
  console.log(`Context: ${JSON.stringify(context, null, 2)}`)

  try {
    const threshold = Math.max(
      5,
      Number.parseInt(event?.queryStringParameters?.threshold || '100', 10)
    )
    await badgeService.checkMotorBadge(threshold)

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Successfully checked and updated motor badges.',
      }),
    }
  } catch (error) {
    console.error('Error in checkMotorBadge handler:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal server error while checking motor badges.',
      }),
    }
  }
}
