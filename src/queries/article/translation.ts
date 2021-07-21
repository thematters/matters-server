import { gcp } from 'connectors'
import { ArticleToTranslationResolver } from 'definitions'

const resolver: ArticleToTranslationResolver = async (
  { content: originContent, title: originTitle },
  { input },
  { viewer }
) => {
  const title = await gcp.translate({
    content: originTitle,
    target: input ? input.language : viewer.language,
  })

  const content = await gcp.translate({
    content: originContent,
    target: input ? input.language : viewer.language,
  })

  return title && content
    ? {
        // obsolete
        originLanguage: '',
        title,
        content,
      }
    : null
}
export default resolver
