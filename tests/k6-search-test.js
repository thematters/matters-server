import http from 'k6/http'
import { SharedArray } from 'k6/data'
import { check, fail } from 'k6'

// usage:
// k6 run -e RATE=1 -e TYPE=User -e VERSION=v20221212 -e TARGET=dev --duration=30s k6-search-test.js

// env
const target = __ENV.TARGET || 'dev' // or 'prod'
const queryType = __ENV.TYPE || 'User'
const queryVersion = __ENV.VERSION || 'v20221212'
const rate = +__ENV.RATE || 1

const url =
  target === 'dev'
    ? 'https://server-develop.matters.news/graphql'
    : 'http://matters-server-prod.ap-southeast-1.elasticbeanstalk.com/graphql'

export function setup() {
  console.log({ url, queryType, queryVersion, rate })
}

export const options = {
  summaryTrendStats: [
    'avg',
    'min',
    'med',
    'max',
    'p(95)',
    'p(99)',
    'p(99.99)',
    'count',
  ],
  scenarios: {
    contacts: {
      executor: 'constant-arrival-rate',
      duration: '10s',
      rate: rate,
      timeUnit: '1s',
      preAllocatedVUs: rate,
      maxVUs: rate * 5,
    },
  },
  thresholds: {
    http_req_duration: [queryType === 'Article' ? 'p(99)<1000' : 'p(99)<500'], // 99% of requests must complete below 1.5s
  },
}

const genPayload = (key) => {
  const escaped = key.replace(/"/g, '\\"')
  //console.log({key})
  const queryUser = `{"operationName":"SearchAggregateUsersPublic","variables":{"key":"${escaped}"},"query":"query SearchAggregateUsersPublic($key: String!, $after: String, $version: SearchAPIVersion = ${queryVersion}) {\\n  search(input: {type: User, version: $version, first: 30, key: $key, after: $after}) {\\n    pageInfo {\\n      startCursor\\n      endCursor\\n      hasNextPage\\n      __typename\\n    }\\n    edges {\\n      cursor\\n      node {\\n        ... on User {\\n          ...UserDigestConciseUser\\n          __typename\\n        }\\n        __typename\\n      }\\n      __typename\\n    }\\n    __typename\\n  }\\n}\\n\\nfragment UserDigestConciseUser on User {\\n  id\\n  userName\\n  displayName\\n  status {\\n    state\\n    __typename\\n  }\\n  ...AvatarUser\\n  ...AvatarUserLogbook\\n  __typename\\n}\\n\\nfragment AvatarUser on User {\\n  avatar\\n  liker {\\n    civicLiker\\n    __typename\\n  }\\n  info {\\n    badges {\\n      type\\n      __typename\\n    }\\n    __typename\\n  }\\n  __typename\\n}\\n\\nfragment AvatarUserLogbook on User {\\n  info {\\n    cryptoWallet {\\n      id\\n      address\\n      hasNFTs\\n      __typename\\n    }\\n    __typename\\n  }\\n  __typename\\n}\\n"}`
  const queryTag = `{"operationName":"SearchAggregateTagsPublic","variables":{"key":"${escaped}"},"query":"query SearchAggregateTagsPublic($key: String!, $after: String, $version: SearchAPIVersion = ${queryVersion}) {\\n  search(input: {type: Tag, version: $version, first: 30, key: $key, after: $after}) {\\n    pageInfo {\\n      startCursor\\n      endCursor\\n      hasNextPage\\n      __typename\\n    }\\n    edges {\\n      cursor\\n      node {\\n        ... on Tag {\\n          ...TagDigestConciseTag\\n          __typename\\n        }\\n        __typename\\n      }\\n      __typename\\n    }\\n    __typename\\n  }\\n}\\n\\nfragment TagDigestConciseTag on Tag {\\n  id\\n  content\\n  numArticles\\n  __typename\\n}\\n"}`
  const queryArticle = JSON.stringify({
    operationName: 'SearchAggregateArticlesPublic',
    persistedQuery: {
      version: 1,
      sha256Hash:
        '9863f9e24556f746211b9f8c9bad61416b7c9dd393f6e8f3107185216d7a5b29',
    },
    variables: { key },
    query: String.raw`### SearchAggregateArticlesPublic
query SearchAggregateArticlesPublic($key: String!, $after: String, $version: SearchAPIVersion = v20221212) {
  search(input: {type: Article, first: 30, version: $version, key: $key, after: $after}) {
    totalCount
    pageInfo {
      startCursor
      endCursor
      hasNextPage
      __typename
    }
    edges {
      cursor
      node {
        ... on Article {
          ...ArticleDigestFeedArticlePublic
          ...ArticleDigestFeedArticlePrivate
          __typename
        }
        __typename
      }
      __typename
    }
    __typename
  }
}

fragment ArticleDigestFeedArticlePublic on Article {
  id
  title
  slug
  mediaHash
  articleState: state
  cover
  summary
  author {
    id
    userName
    ...UserDigestMiniUser
    __typename
  }
  access {
    type
    circle {
      id
      name
      ...DigestPlainCircle
      __typename
    }
    __typename
  }
  ...ArticleDigestTitleArticle
  ...FooterActionsArticlePublic
  __typename
}

fragment UserDigestMiniUser on User {
  id
  userName
  displayName
  status {
    state
    __typename
  }
  ...AvatarUser
  ...AvatarUserLogbook
  __typename
}

fragment AvatarUser on User {
  avatar
  liker {
    civicLiker
    __typename
  }
  info {
    badges {
      type
      __typename
    }
    __typename
  }
  __typename
}

fragment AvatarUserLogbook on User {
  info {
    cryptoWallet {
      id
      address
      hasNFTs
      __typename
    }
    __typename
  }
  __typename
}

fragment ArticleDigestTitleArticle on Article {
  id
  title
  articleState: state
  slug
  mediaHash
  author {
    id
    userName
    __typename
  }
  __typename
}

fragment FooterActionsArticlePublic on Article {
  id
  title
  slug
  mediaHash
  createdAt
  author {
    id
    userName
    __typename
  }
  ...DropdownActionsArticle
  ...ActionsReadTimeArticle
  ...ActionsDonationCountArticle
  __typename
}

fragment DropdownActionsArticle on Article {
  id
  ...AppreciatorsDialogArticle
  ...DonatorDialogArticle
  ...FingerprintArticle
  ...ArchiveArticleArticle
  ...StickyButtonArticle
  ...ExtendButtonArticle
  ...RemoveTagButtonArticle
  ...EditArticleButtonArticle
  ...SetTagSelectedButtonArticle
  ...SetTagUnselectedButtonArticle
  __typename
}

fragment AppreciatorsDialogArticle on Article {
  id
  id
  appreciationsReceived(input: {first: 0}) {
    totalCount
    __typename
  }
  __typename
}

fragment DonatorDialogArticle on Article {
  id
  mediaHash
  donationsDialog: transactionsReceivedBy(input: {first: 0, purpose: donation}) {
    totalCount
    __typename
  }
  __typename
}

fragment FingerprintArticle on Article {
  id
  mediaHash
  dataHash
  iscnId
  createdAt
  revisedAt
  author {
    id
    __typename
  }
  access {
    type
    __typename
  }
  drafts {
    iscnPublish
    __typename
  }
  __typename
}

fragment StickyButtonArticle on Article {
  id
  sticky
  author {
    id
    userName
    __typename
  }
  __typename
}

fragment ArchiveArticleArticle on Article {
  id
  articleState: state
  author {
    id
    userName
    __typename
  }
  __typename
}

fragment ExtendButtonArticle on Article {
  id
  articleState: state
  __typename
}

fragment RemoveTagButtonArticle on Article {
  id
  tags {
    id
    creator {
      id
      __typename
    }
    editors {
      id
      __typename
    }
    __typename
  }
  __typename
}

fragment EditArticleButtonArticle on Article {
  id
  mediaHash
  slug
  author {
    id
    userName
    __typename
  }
  __typename
}

fragment SetTagSelectedButtonArticle on Article {
  id
  tags {
    id
    creator {
      id
      __typename
    }
    editors {
      id
      __typename
    }
    __typename
  }
  __typename
}

fragment SetTagUnselectedButtonArticle on Article {
  id
  tags {
    id
    creator {
      id
      __typename
    }
    editors {
      id
      __typename
    }
    __typename
  }
  __typename
}

fragment ActionsReadTimeArticle on Article {
  id
  readTime
  __typename
}

fragment ActionsDonationCountArticle on Article {
  id
  transactionsReceivedBy(input: {first: 0, purpose: donation}) {
    totalCount
    __typename
  }
  __typename
}

fragment DigestPlainCircle on Circle {
  id
  name
  displayName
  __typename
}

fragment ArticleDigestFeedArticlePrivate on Article {
  id
  author {
    ...ArticleFeedFollowButtonUserPrivate
    __typename
  }
  ...FooterActionsArticlePrivate
  __typename
}

fragment FooterActionsArticlePrivate on Article {
  ...BookmarkArticlePrivate
  __typename
}

fragment BookmarkArticlePrivate on Article {
  id
  subscribed
  __typename
}

fragment ArticleFeedFollowButtonUserPrivate on User {
  id
  isFollower
  isFollowee
  __typename
} `,
  })
  if (queryType === 'User') {
    return queryUser
  } else if (queryType === 'Tag') {
    return queryTag
  } else if (queryType == 'Article') {
    return queryArticle
  } else {
    throw queryType
  }
}

const splitLines = (str) => str.split(/\r?\n/)
const keys = new SharedArray('search keys', () =>
  //splitLines(open("./matters-search_key-2022.txt"))
  splitLines(open('./matters-search_key-2022-small.txt'))
)

export default () => {
  const headers = {
    'Content-Type': 'application/json',
  }
  const key = keys[Math.floor(Math.random() * keys.length)]
  const result = http.post(url, genPayload(key), { headers })
  //console.log(result)
  if (!check(result, { 'status code is 200': (obj) => obj.status === 200 })) {
    fail(JSON.stringify(result))
  }
}
