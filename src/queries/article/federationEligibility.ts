import type { GQLArticleResolvers } from '#definitions/index.js'

import {
  FEDERATION_ARTICLE_SETTING,
  resolveFederationExportGateForRow,
} from '#connectors/article/federationExportService.js'

const resolver: GQLArticleResolvers['federationEligibility'] = async (
  { id }: { id: string },
  _: unknown,
  { dataSources: { federationExportService } }: any
) => {
  const [row] = await federationExportService.loadSelectedArticleRows([id], {
    includeFederationSettings: true,
  })

  if (!row) {
    return {
      eligible: false,
      reason: 'article_not_public',
      effectiveArticleSetting: FEDERATION_ARTICLE_SETTING.inherit,
    }
  }

  return resolveFederationExportGateForRow(row)
}

export default resolver
