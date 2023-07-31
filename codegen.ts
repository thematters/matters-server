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
          User: './user#GQLUser',
          UserInfo: './user#GQLUser',
          UserStatus: './user#GQLUser',
          UserActivity: './user#GQLUser',
          UserSettings: './user#GQLUser',
          UserAnalytics: './user#GQLUser',
          UserOSS: './user#GQLUser',
          Recommendation: './user#GQLUser',
          Following: './user#GQLUser',
          Liker: './user#GQLUser',
          Wallet: './user#GQLUser',
          Tag: './tag#Tag',
          TagOSS: './tag#Tag',
          Collection: './collection#Collection',
          Comment: './comment#Comment',
          Article: './draft#Draft',
          ArticleAccess: './draft#Draft',
          ArticleOSS: './draft#Draft',
          ArticleContents: './draft#Draft',
          Circle: './circle#Circle',
          StripeAccount: './payment#PayoutAccount',
          Transaction: './index#Transaction',
        },
        contextType: './index#Context',
        makeResolverTypeCallable: true,
        onlyResolveTypeForInterfaces: true,
        enumsAsTypes: true,
      },
    },
  },
}

export default config
