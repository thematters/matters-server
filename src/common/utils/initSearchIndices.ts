import elasticsearch from '@elastic/elasticsearch'
import 'module-alias/register'

import { environment } from 'common/environment'
import logger from 'common/logger'
import { ArticleService, TagService, UserService } from 'connectors'

const articleIndexDef = {
  index: 'article',
  settings: {
    analysis: {
      analyzer: {
        pinyin: {
          tokenizer: 'pinyin_tokenizer',
        },
        tsconvert: {
          type: 'custom',
          char_filter: ['tsconvert'],
          tokenizer: 'ik_max_word',
        },
        synonym: {
          type: 'custom',
          char_filter: ['tsconvert'],
          tokenizer: 'ik_smart',
          filter: ['synonym'],
        },
      },
      tokenizer: {
        tsconvert: {
          type: 'stconvert',
          delimiter: '#',
          keep_both: true,
          convert_type: 't2s',
        },
        pinyin_tokenizer: {
          type: 'pinyin',
          keep_first_letter: false,
          keep_separate_first_letter: false,
          keep_full_pinyin: true,
          keep_original: true,
          limit_first_letter_length: 16,
          lowercase: true,
          remove_duplicated_term: true,
        },
      },
      filter: {
        synonym: {
          type: 'synonym',
          synonyms_path: 'synonyms.txt',
        },
        tsconvert: {
          type: 'stconvert',
          delimiter: '#',
          keep_both: true,
          convert_type: 't2s',
        },
      },
      char_filter: {
        tsconvert: {
          type: 'stconvert',
          convert_type: 't2s',
        },
      },
    },
  },
  mappings: {
    properties: {
      id: {
        type: 'long',
      },
      authorId: {
        type: 'long',
      },
      userName: {
        type: 'completion',
      },
      displayName: {
        type: 'completion',
        analyzer: 'pinyin',
        fields: {
          raw: {
            type: 'text',
            analyzer: 'tsconvert',
          },
        },
      },
      title: {
        type: 'text',
        index: true,
        analyzer: 'tsconvert',
        fields: {
          synonyms: {
            type: 'text',
            analyzer: 'synonym',
          },
        },
      },
      content: {
        type: 'text',
        index: true,
        analyzer: 'tsconvert',
        fields: {
          synonyms: {
            type: 'text',
            analyzer: 'synonym',
          },
        },
      },
      embedding_vector: {
        type: 'binary',
        doc_values: true,
      },
      factor: { type: 'text' },
    },
  },
}

const userIndexDef = {
  index: 'user',
  settings: {
    analysis: {
      analyzer: {
        pinyin: {
          tokenizer: 'pinyin_tokenizer',
        },
        tsconvert: {
          type: 'custom',
          char_filter: ['tsconvert'],
          tokenizer: 'ik_max_word',
        },
        synonym: {
          type: 'custom',
          char_filter: ['tsconvert'],
          tokenizer: 'ik_smart',
          filter: ['synonym'],
        },
      },
      tokenizer: {
        tsconvert: {
          type: 'stconvert',
          delimiter: '#',
          keep_both: true,
          convert_type: 't2s',
        },
        pinyin_tokenizer: {
          type: 'pinyin',
          keep_first_letter: false,
          keep_separate_first_letter: false,
          keep_full_pinyin: true,
          keep_original: true,
          limit_first_letter_length: 16,
          lowercase: true,
          remove_duplicated_term: true,
        },
      },
      filter: {
        synonym: {
          type: 'synonym',
          synonyms_path: 'synonyms.txt',
        },
        tsconvert: {
          type: 'stconvert',
          delimiter: '#',
          keep_both: true,
          convert_type: 't2s',
        },
      },
      char_filter: {
        tsconvert: {
          type: 'stconvert',
          convert_type: 't2s',
        },
      },
    },
  },
  mappings: {
    properties: {
      id: {
        type: 'long',
      },
      userName: {
        type: 'completion',
      },
      displayName: {
        type: 'completion',
        analyzer: 'pinyin',
        fields: {
          raw: {
            type: 'text',
            analyzer: 'tsconvert',
          },
        },
      },
      description: {
        type: 'text',
        index: true,
        analyzer: 'tsconvert',
      },
      embedding_vector: {
        type: 'binary',
        doc_values: true,
      },
      factor: {
        type: 'text',
      },
    },
  },
}

const indices = ['article', 'user', 'tag']

async function main() {
  const es = new elasticsearch.Client({
    node: `http://${environment.esHost}:${environment.esPort}`,
  })

  logger.info(
    `connecting node: http://${environment.esHost}:${environment.esPort}`
  )

  await Promise.all(
    indices.map(async (idx) => {
      const exists = await es.indices.exists({ index: idx })
      if (exists) {
        logger.info(`deleting es index: ${idx} ...`)
        await es.indices.delete({ index: idx })
      }
    })
  )

  logger.info('creating indices: article, user, tag ...')
  await Promise.all([
    es.indices.create(articleIndexDef),
    es.indices.create(userIndexDef),
    es.indices.create({ index: 'tag' }),
  ])

  // logger.info('indexing articles ...')
  const articleService = new ArticleService()
  // await articleService.initSearch()

  // logger.info('indexing users...')
  const userService = new UserService()
  // await userService.initSearch()

  // logger.info('indexing tags...')
  const tagService = new TagService()

  logger.info('indexing: article, user, tag ...')
  await Promise.all([
    articleService.initSearch(),
    userService.initSearch(),
    tagService.initSearch(),
  ])

  logger.info('done.')
  process.exit()
}

if (require.main === module) {
  main().catch((err) => {
    console.error(new Date(), 'ERROR:', err)
    process.exit(1)
  })
}
