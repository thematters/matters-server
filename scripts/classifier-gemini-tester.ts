/**
 * This script is designed to test LLM models from Google Cloud to classify
 * articles as "normal" or "spam", addressing the issues of spam content
 * in latest feeds. Environment variables are loaded from ".env" file.
 *
 * Usage:
 * ts-node classifier-gemini-tester.ts <article-hash> [<article-hash>] ...
 *
 * Example:
 * To use a different LLM model, configure the environment varaible
 * `MATTERS_CLASSIFICATION_GEMINI_MODEL`:
 *
 * MATTERS_CLASSIFICATION_GEMINI_MODEL=gemini-pro-experimental \
 * ts-node classifier-gemini-tester.ts <article-hash>
 */

import 'dotenv/config'
import { VertexAI } from '@google-cloud/vertexai'
import pLimit from 'p-limit'

import { Gemini } from '../src/connectors/classification/gemini'
import { Classification } from '../src/connectors/classification/manager'

const endpoint =
  process.env.MATTERS_ENDPOINT || 'https://server.matters.town/graphql'
const articleUrlPrefix =
  process.env.MATTERS_ARTICLE_URL_PREFIX || 'https://matters.town/a/'
const shortHashLength = 12
const minuteInMs = 60 * 1000
const apiQuotaPerMinute = +(process.env.API_QUOTA_PER_MINUTE ?? 5)
const apiDelayTime = minuteInMs
const limit = pLimit(apiQuotaPerMinute)

async function getArticle(hash: string) {
  const isShortHash = hash.length === shortHashLength
  const hashName = isShortHash ? 'shortHash' : 'mediaHash'

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        query {
          article(input: { ${hashName} : "${hash}" }) {
            id
            title
            summary
            content
            shortHash
          }
        }
      `,
    }),
  })

  const { data } = await response.json()

  return data.article
}

function formatOutput(
  result: Array<
    | {
        article: any
        classification: Classification | null
      }
    | undefined
  >
) {
  const normals = []
  const spams = []
  const unclassifieds = []

  for (const item of result) {
    if (!item) {
      continue
    }

    switch (item.classification) {
      case Classification.NORMAL:
        normals.push(item.article)
        break
      case Classification.SPAM:
        spams.push(item.article)
        break
      default:
        unclassifieds.push(item.article)
        break
    }
  }

  outputIfNecessary('Normal Articles', normals)
  outputIfNecessary('Spam Articles', spams)
  outputIfNecessary('Unclassified Articles', unclassifieds)
}

function outputIfNecessary(title: string, articles: any[]) {
  if (articles.length === 0) {
    return
  }

  console.log(`\n## ${title}\n`)

  for (const article of articles) {
    console.log(`- [${article.title}](${articleUrlPrefix}${article.shortHash})`)
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function enqueue(gemini: Gemini, hash: string) {
  return limit(async () => {
    const article = await getArticle(hash)

    if (!article) {
      console.log(`- **not-exists** ${hash}`)
      return
    }

    const classification = await gemini.classify(
      `${article.title}\n\n${article.summary}\n\n${article.content}`
    )

    console.log(`- **${classification}** ${article.title}`)

    if (limit.pendingCount > 0) {
      await delay(apiDelayTime)
    }

    return { article, classification }
  })
}

;(async () => {
  const client = new VertexAI({
    project: process.env.MATTERS_CLASSIFICATION_GEMINI_PROJECT,
    location: process.env.MATTERS_CLASSIFICATION_GEMINI_LOCATION,
    googleAuthOptions: {
      keyFile: process.env.MATTERS_CLASSIFICATION_GEMINI_KEY_FILE,
    },
  })
  const model =
    process.env.MATTERS_CLASSIFICATION_GEMINI_MODEL || 'gemini-1.5-flash-001'
  const gemini = new Gemini(client, model)

  const tasks = []
  const hashes = process.argv.slice(2)

  if (hashes.length === 0) {
    console.error('Please provide at least one article hash.')
    process.exit(1)
  }

  for (const hash of hashes) {
    tasks.push(enqueue(gemini, hash))
  }

  formatOutput(await Promise.all(tasks))

  console.log(`\nClassified with model \`${model}\``)
})()
