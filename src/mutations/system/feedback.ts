import { Resolver } from 'definitions'

const resolver: Resolver = async (
  root,
  { input: { category, description, contact, assetIds } },
  { viewer, dataSources: { systemService } }
) => {
  if (!viewer.id) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  await systemService.feedback(
    viewer.id,
    category,
    description,
    contact,
    assetIds
  )

  return true
}

export default resolver
