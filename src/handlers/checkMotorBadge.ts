import type { APIGatewayProxyResult } from 'aws-lambda'

import { environment } from '#common/environment.js'
import { BadgeService } from '#connectors/badgeService.js'

import { connections } from '../connections.js'

const badgeService = new BadgeService(connections)

export const handler = async (): Promise<APIGatewayProxyResult> => {
  try {
    await badgeService.checkMotorBadge(environment.motorBadgeThreshold)

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
