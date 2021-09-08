import { UserToTopicsResolver } from 'definitions'

const resolver: UserToTopicsResolver = async (
  { id },
  { input },
  { dataSources: { atomService }, viewer }
) => {
  const isViewer = viewer.id === id
  const isPublicOnly = !!input?.public || !isViewer

  return atomService.findMany({
    table: 'topic',
    where: { userId: id, ...(isPublicOnly ? { public: true } : {}) },
  })
}

export default resolver
