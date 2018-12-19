import { Resolver } from 'definitions'

const resolver: Resolver = async (
  _,
  { input: { id } },
  { viewer, assetService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this')
  }

  const asset = await assetService.baseFindByID(id)
  if (!asset) {
    throw new Error('target draft does not exist')
  }
  if (asset.authroId !== viewer.id) {
    throw new Error('disallow to process')
  }
  await assetService.baseDelete(asset.id)

  return true
}
export default resolver
