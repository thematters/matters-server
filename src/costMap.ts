const CONNECTION_INPUT_COST = {
  multipliers: ['input.first'],
  useMultipliers: true,
  complexity: 1,
}

export default {
  Query: {
    frequentSearch: CONNECTION_INPUT_COST,
    search: CONNECTION_INPUT_COST,
  },
  OSS: {
    users: CONNECTION_INPUT_COST,
    articles: CONNECTION_INPUT_COST,
    tags: CONNECTION_INPUT_COST,
    skippedListItems: CONNECTION_INPUT_COST,
  },
  Article: {
    collectedBy: CONNECTION_INPUT_COST,
    collection: CONNECTION_INPUT_COST,
    relatedArticles: CONNECTION_INPUT_COST,
    subscribers: CONNECTION_INPUT_COST,
    comments: CONNECTION_INPUT_COST,
    responses: CONNECTION_INPUT_COST,
  },
  Tag: {
    articles: CONNECTION_INPUT_COST,
  },
  Comment: {
    comments: CONNECTION_INPUT_COST,
  },
  Draft: {
    collection: CONNECTION_INPUT_COST,
  },
  User: {
    articles: CONNECTION_INPUT_COST,
    drafts: CONNECTION_INPUT_COST,
    commentedArticles: CONNECTION_INPUT_COST,
    subscriptions: CONNECTION_INPUT_COST,
    followers: CONNECTION_INPUT_COST,
    followees: CONNECTION_INPUT_COST,
    notices: CONNECTION_INPUT_COST,
  },
  Recommendation: {
    followeeArticles: CONNECTION_INPUT_COST,
    newest: CONNECTION_INPUT_COST,
    hottest: CONNECTION_INPUT_COST,
    icymi: CONNECTION_INPUT_COST,
    tags: CONNECTION_INPUT_COST,
    topics: CONNECTION_INPUT_COST,
    authors: CONNECTION_INPUT_COST,
  },
  UserActivity: {
    history: CONNECTION_INPUT_COST,
    recentSearches: CONNECTION_INPUT_COST,
  },
}
