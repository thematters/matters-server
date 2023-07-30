import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  overwrite: true,
  schema: 'schema.graphql',
  generates: {
    'src/definitions/schema.d.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        contextType: './index#Context',
        typesPrefix: 'GQL',
        namingConvention: {
          enumValues: 'keep',
        },
        inputMaybeValue: 'T | undefined',
        mappers: {
          User: './index#User',
          Tag: './tag#Tag',
          Collection: './collection#Collection',
        },
      },
    },
  },
}

export default config
