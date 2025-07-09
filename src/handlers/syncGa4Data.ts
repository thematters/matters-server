import { GA4Service, getLocalDateString } from '#connectors/ga4Service.js'

import { connections } from '../connections.js'

// AWS EventBridge can configure the input event sent to Lambda,
// see https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-transform-target-input.html for info.
type Event = {
  type: 'today' | 'yesterday' | '2 days ago' | '3 days ago'
}

const ga4Service = new GA4Service(connections)

export const handler = async (event: Event) => {
  console.log('event: ', event)
  const startDate = getDate(event.type)
  const endDate = startDate
  const data = await ga4Service.fetchGA4Data({ startDate, endDate })
  const convertedData = await ga4Service.convertAndMerge(data)
  await ga4Service.saveGA4Data(convertedData, { startDate, endDate })
}

// helper functions
const getDate = (type: Event['type']) => {
  const date = new Date()
  if (type === 'yesterday') {
    date.setDate(date.getDate() - 1)
  } else if (type === '2 days ago') {
    date.setDate(date.getDate() - 2)
  } else if (type === '3 days ago') {
    date.setDate(date.getDate() - 3)
  }
  return getLocalDateString(date)
}
