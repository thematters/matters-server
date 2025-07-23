import type { GQLResolvers } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId, fromDatetimeRangeString } from '#common/utils/index.js'

import channel from './channel.js'
import channels from './channels.js'
import CurationChannelArticles from './curation/articles.js'
import CurationChannelName from './curation/name.js'
import CurationChannelNavbarTitle from './curation/navbarTitle.js'
import CurationChannelNote from './curation/note.js'
import TopicChannelArticles from './topic/articles.js'
import TopicChannelName from './topic/name.js'
import TopicChannelNavbarTitle from './topic/navbarTitle.js'
import TopicChannelNote from './topic/note.js'
import TopicChannelFeedback from './topicChannelFeedback.js'

const schema: GQLResolvers = {
  Query: {
    channel,
    channels,
  },
  TopicChannel: {
    id: ({ id }) => toGlobalId({ type: NODE_TYPES.TopicChannel, id }),
    name: TopicChannelName,
    note: TopicChannelNote,
    navbarTitle: TopicChannelNavbarTitle,
    articles: TopicChannelArticles,
  },
  TopicChannelFeedback,
  CurationChannel: {
    id: ({ id }) => toGlobalId({ type: NODE_TYPES.CurationChannel, id }),
    name: CurationChannelName,
    note: CurationChannelNote,
    navbarTitle: CurationChannelNavbarTitle,
    activePeriod: ({ activePeriod }) =>
      fromDatetimeRangeString(activePeriod as string),
    articles: CurationChannelArticles,
  },
  Channel: {
    __resolveType: ({ __type }: any) => __type,
  },
}

export default schema
