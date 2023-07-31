import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  overwrite: true,
  schema: 'schema.graphql',
  generates: {
    'src/definitions/schema.d.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        useIndexSignature: true,
        contextType: './index#Context',
        typesPrefix: 'GQL',
        namingConvention: {
          enumValues: 'keep',
        },
        inputMaybeValue: 'T | undefined',
        mapperTypeSuffix: 'Model',
        mappers: {
          User: './index#User',
          UserInfo: './index#User',
          UserStatus: './index#User',
          Wallet: './index#User',
          Tag: './tag#Tag',
          Collection: './collection#Collection',
        },
      },
    },
  },
}

export default config
