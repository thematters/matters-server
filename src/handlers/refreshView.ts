import { MATERIALIZED_VIEW } from '#common/enums/index.js'

import { connections } from '../connections.js'

type RefreshViewEvent = {
  data: {
    viewName: (typeof MATERIALIZED_VIEW)[keyof typeof MATERIALIZED_VIEW]
  }
}

export const handler = async (event: RefreshViewEvent) => {
  const view = event.data.viewName
  if (!Object.values(MATERIALIZED_VIEW).includes(view)) {
    throw Error(`Unexpected view name: ${view}`)
  }

  await connections.knex.raw(`
      refresh materialized view concurrently ${view}
    `)
  console.log(`Refreshed view: ${view}`)
}
