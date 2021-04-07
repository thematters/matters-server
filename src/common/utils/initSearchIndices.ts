import elasticsearch from '@elastic/elasticsearch'
import 'module-alias/register'

import { environment } from 'common/environment'
import logger from 'common/logger'
import { ArticleService, TagService, UserService } from 'connectors'

const articleIndexDef = {
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

;(async () => {
  const es = new elasticsearch.Client({
    node: `http://${environment.esHost}:${environment.esPort}`,
  })
  for (const idx of indices) {
    const exists = await es.indices.exists({ index: idx })
    if (exists.statusCode !== 404) {
      logger.info(`deleting es index: ${idx} ...`)
      await es.indices.delete({ index: idx })
    }
  }

  logger.info('creating indices: article, user, tag ...')
  await es.indices.create({
    index: 'article',
    body: articleIndexDef,
  })
  await es.indices.create({
    index: 'user',
    body: userIndexDef,
  })
  await es.indices.create({ index: 'tag' })

  logger.info('indexing articles ...')
  const articleService = new ArticleService()
  await articleService.initSearch()

  logger.info('indexing users...')
  const userService = new UserService()
  await userService.initSearch()

  logger.info('indexing tags...')
  const tagService = new TagService()
  await tagService.initSearch()
  logger.info('done.')
  process.exit()
})()
