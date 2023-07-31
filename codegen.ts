import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  overwrite: true,
  schema: 'schema.graphql',
  generates: {
    'src/definitions/schema.d.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        useIndexSignature: true,
        typesPrefix: 'GQL',
        namingConvention: {
          enumValues: 'keep',
        },
        inputMaybeValue: 'T | undefined',
        mapperTypeSuffix: 'Model',
        mappers: {
          User: './index#Viewer',
          UserInfo: './index#Viewer',
          UserStatus: './index#Viewer',
          UserActivity: './index#Viewer',
          UserSettings: './index#Viewer',
          UserAnalytics: './index#Viewer',
          UserOSS: './index#Viewer',
          Recommendation: './index#Viewer',
          Following: './index#Viewer',
          Liker: './index#Viewer',
          Wallet: './index#Viewer',
          Tag: './tag#Tag',
          TagOSS: './tag#Tag',
          Collection: './collection#Collection',
          Comment: './comment#Comment',
          Article: './draft#Draft',
          ArticleAccess: './draft#Draft',
          ArticleOSS: './draft#Draft',
          ArticleContents: './draft#Draft',
          Circle: './circle#Circle',
        },
        contextType: './index#Context',
        makeResolverTypeCallable: true,
        onlyResolveTypeForInterfaces: true,
      },
    },
  },
}

export default config
