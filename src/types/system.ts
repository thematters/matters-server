import {
  AUTH_MODE,
  CACHE_TTL,
  NODE_TYPES,
  SCOPE_GROUP,
} from '#common/enums/index.js'

const UPLOAD_RATE_LIMIT = 40 // 20 pictures per 12 minutes, `directImageUpload` called twice for each picture

export default /* GraphQL */ `
  extend type Query {
    node(input: NodeInput!): Node @privateCache @logCache(type: "${NODE_TYPES.Node}")
    nodes(input: NodesInput!): [Node!] @complexity(value: 1, multipliers: ["input.ids"]) @privateCache @logCache(type: "${NODE_TYPES.Node}")
    frequentSearch(input: FrequentSearchInput!): [String!] @cacheControl(maxAge: ${CACHE_TTL.PUBLIC_SEARCH})
    search(input: SearchInput!): SearchResultConnection! @complexity(multipliers: ["input.first"], value: 1) @privateCache @cacheControl(maxAge: ${CACHE_TTL.PUBLIC_SEARCH})
    official: Official! @privateCache
    oss: OSS! @auth(mode: "${AUTH_MODE.admin}") @privateCache
  }

  extend type Mutation {
    "Upload a single file."
    singleFileUpload(input: SingleFileUploadInput!): Asset! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level3}") @rateLimit(limit: ${UPLOAD_RATE_LIMIT}, period: 720)
    directImageUpload(input: DirectImageUploadInput!): Asset! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level3}") @rateLimit(limit: ${UPLOAD_RATE_LIMIT}, period: 720)

    "Add specific user behavior record."
    logRecord(input: LogRecordInput!): Boolean

    "Add blocked search keyword to blocked_search_word db"
    addBlockedSearchKeyword(input: KeywordInput!): BlockedSearchKeyword! @auth(mode: "${AUTH_MODE.admin}")

    "Delete blocked search keywords from search_history db"
    deleteBlockedSearchKeywords(input: KeywordsInput!): Boolean @auth(mode: "${AUTH_MODE.admin}")

    "Submit inappropriate content report"
    submitReport(input: SubmitReportInput!): Report! @auth(mode: "${AUTH_MODE.oauth}")

    ##############
    #     OSS    #
    ##############
    setBoost(input: SetBoostInput!): Node! @auth(mode: "${AUTH_MODE.admin}")
    putRemark(input: PutRemarkInput!): String @auth(mode: "${AUTH_MODE.admin}")
    putSkippedListItem(input: PutSkippedListItemInput!): [SkippedListItem!] @auth(mode: "${AUTH_MODE.admin}")
    setFeature(input: SetFeatureInput!): Feature! @auth(mode: "${AUTH_MODE.admin}")
    toggleSeedingUsers(input: ToggleSeedingUsersInput!): [User]! @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.User}")
    putAnnouncement(input: PutAnnouncementInput!): Announcement! @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.Announcement}")
    deleteAnnouncements(input: DeleteAnnouncementsInput!): Boolean! @auth(mode: "${AUTH_MODE.admin}")
    putRestrictedUsers(input: PutRestrictedUsersInput!): [User!]! @complexity(value: 1, multipliers: ["input.ids"]) @auth(mode: "${AUTH_MODE.admin}")
    putUserFeatureFlags(input: PutUserFeatureFlagsInput!): [User!]! @complexity(value: 1, multipliers: ["input.ids"]) @auth(mode: "${AUTH_MODE.admin}")
    putUserFederationSetting(input: PutUserFederationSettingInput!): UserFederationSetting! @auth(mode: "${AUTH_MODE.admin}")
    putArticleFederationSetting(input: PutArticleFederationSettingInput!): ArticleFederationSetting! @auth(mode: "${AUTH_MODE.admin}")
    putIcymiTopic(input: PutIcymiTopicInput!): IcymiTopic @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.IcymiTopic}")
    updateModerationCase(input: UpdateModerationCaseInput!): ModerationCase! @auth(mode: "${AUTH_MODE.admin}")
    setSpamStatus(input: SetSpamStatusInput!): Writing! @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.Writing}")
    setAdStatus(input: SetAdStatusInput!): Article! @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.Article}")
    setWritingAdStatus(input: SetAdStatusInput!): Writing! @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.Writing}")
    reviewTopicChannelFeedback(input: ReviewTopicChannelFeedbackInput!): TopicChannelFeedback! @auth(mode: "${AUTH_MODE.admin}")
  }

  input KeywordsInput {
    keywords: [String!]
  }

  input KeywordInput {
    keyword: String!
  }

  interface Node {
    id: ID!
  }

  interface PinnableWork {
    id: ID!
    pinned: Boolean!
    title: String!
    cover: String
  }

  type PageInfo {
    startCursor: String
    endCursor: String
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }

  interface Connection {
    totalCount: Int!
    pageInfo: PageInfo!
  }

  type BlockedSearchKeyword {
    "Unique ID of bloked search keyword."
    id: ID!

    "Types of this search keyword."
    searchKey: String!

    "Time of this search keyword was created."
    createdAt: DateTime!
  }

  "This type contains system-wise info and settings."
  type Official {
    "Feature flag"
    features: [Feature!]!

    "Announcements"
    announcements(input: AnnouncementsInput!): [Announcement!] @logCache(type: "${NODE_TYPES.Announcement}") @cacheControl(maxAge: ${CACHE_TTL.SHORT})
  }

  type Feature {
    name: FeatureName!
    enabled: Boolean!
    value: Float
  }

  type Announcement {
    id: ID!
    title(input: TranslationArgs): String
    cover: String
    content(input: TranslationArgs): String
    link(input: TranslationArgs): String
    type: AnnouncementType!
    visible: Boolean!
    order: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
    expiredAt: DateTime
    translations: [TranslatedAnnouncement!] @deprecated(reason: "Use title, content, link with TranslationArgs instead")
    channels: [AnnouncementChannel!]!
  }

  type AnnouncementChannel {
    channel: Channel!
    order: Int!
    visible: Boolean!
  }

  type TranslatedAnnouncement {
    language: UserLanguage!
    title: String
    cover: String
    content: String
    link: String @constraint(format: "uri")
  }

  type OSS @cacheControl(maxAge: ${CACHE_TTL.INSTANT}) {
    users(input: ConnectionArgs!): UserConnection!
    comments(input: OSSCommentsInput!): CommentConnection!
    moments(input: OSSMomentsInput!): MomentConnection!
    articles(input: OSSArticlesInput!): ArticleConnection!
    tags(input: TagsInput!): TagConnection!
    oauthClients(input: ConnectionArgs!): OAuthClientConnection!
    skippedListItems(input: SkippedListItemsInput!): SkippedListItemsConnection!
    seedingUsers(input: ConnectionArgs!): UserConnection!
    badgedUsers(input: BadgedUsersInput!): UserConnection!
    restrictedUsers(input: ConnectionArgs!): UserConnection!
    reports(input: OSSReportsInput!): ReportConnection!
    spamRings(input: OSSSpamRingsInput!): SpamRingConnection!
    icymiTopics(input: ConnectionArgs!): IcymiTopicConnection!
    topicChannelFeedbacks(input: TopicChannelFeedbacksInput!): TopicChannelFeedbackConnection!
  }


  """
  This type contains type, link and related data of an asset.
  """
  type Asset {
    "Unique ID of this Asset."
    id: ID!

    "Types of this asset."
    type: AssetType!

    "Link of this asset."
    path: String!

    draft: Boolean
    uploadURL: String

    "Time of this asset was created."
    createdAt: DateTime!
  }

  type SearchResultConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [SearchResultEdge!]
  }

  type SearchResultEdge {
    cursor: String!
    node: Node! @logCache(type: "${NODE_TYPES.Node}")
  }

  input TagsInput {
    after: String
    first: Int @constraint(min: 0)
    sort: TagsSort
  }

  input SkippedListItemsInput {
    after: String
    first: Int @constraint(min: 0)
    type: SkippedListItemType
  }

  input BadgedUsersInput {
    after: String
    first: Int @constraint(min: 0)
    type: BadgeType
  }

  type SkippedListItemsConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [SkippedListItemEdge!]
  }

  type SkippedListItemEdge {
    cursor: String!
    node: SkippedListItem
  }

  type SkippedListItem {
    id: ID!
    uuid: ID!
    type: SkippedListItemType!
    value: String!
    archived: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type UserRestriction {
    type: UserRestrictionType!
    createdAt: DateTime!
  }

  type UserFeatureFlag {
    type: UserFeatureFlagType!
    createdAt: DateTime!
  }

  type Report implements Node {
    id: ID!
    reporter: User!
    target: Node!
    reason: ReportReason!
    "Whether this record originates from a direct in-site report or a community watch action."
    source: ReportSource!
    "The audit record when this report originates from a community watch action."
    communityWatchAction: CommunityWatchAction
    "Structured moderation case summary for OSS review and transparency reporting."
    moderationCase: ModerationCase
    createdAt: DateTime!
  }

  type ModerationCase {
    id: ID!
    source: ModerationCaseSource!
    targetType: ModerationTargetType!
    reason: String!
    publicReason: String
    status: ModerationCaseStatus!
    outcome: ModerationCaseOutcome
    automationRole: ModerationAutomationRole!
    noticeState: ModerationNoticeState!
    createdAt: DateTime!
    resolvedAt: DateTime
    closedAt: DateTime
  }

  type ReportConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [ReportEdge!]
  }

  type ReportEdge {
    cursor: String!
    node: Report!
  }

  input OSSReportsInput {
    after: String
    first: Int @constraint(min: 0)
    filter: OSSReportsFilter
  }

  input OSSReportsFilter {
    source: ReportSource
  }

  """
  A spam ring: a cluster of accounts posting the same templated abuse,
  surfaced by the account-layer ring detector (軸一 D).
  """
  type SpamRing implements Node {
    id: ID!
    "模板/家族指紋（偵測 job 的歸群 key）"
    fingerprint: String!
    status: SpamRingStatus!
    signals: SpamRingSignals!
    nArticles: Int!
    nAuthors: Int!
    newAccountRatio: Float
    score: Float
    severity: SpamRingSeverity
    detectedAt: DateTime!
    firstSeenAt: DateTime
    lastSeenAt: DateTime
    frozenAt: DateTime
    frozenBy: User
    note: String
    "群內成員帳號（可分頁）"
    members(input: ConnectionArgs!): SpamRingMemberConnection!
    "列表渲染用的少量樣本，免分頁"
    memberSample(limit: Int): [User!]!
    events: [SpamRingEvent!]!
  }

  type SpamRingSignals {
    nearDupRingSize: Int
    entityRingSize: Int
    botUsernameRatio: Float
    topEntity: String
    sampleCodes: [String!]
    sampleBrands: [String!]
    sampleTexts: [String!]
    contentModelMax: Float
  }

  type SpamRingMember {
    id: ID!
    user: User!
    status: SpamRingMemberStatus!
    "是否由本 ring 的凍結造成封禁（解凍時只還原此類）"
    bannedByThisRing: Boolean!
    skipReason: String
    createdAt: DateTime!
  }

  type SpamRingEvent {
    id: ID!
    action: SpamRingEventAction!
    actor: User
    "JSON 字串"
    detail: String
    createdAt: DateTime!
  }

  enum SpamRingStatus {
    pending
    frozen
    dismissed
    restored
  }

  enum SpamRingMemberStatus {
    pending
    frozen
    skipped
    restored
  }

  enum SpamRingSeverity {
    low
    medium
    high
    critical
  }

  enum SpamRingEventAction {
    detected
    frozen
    unfrozen
    dismissed
    member_banned
    member_skipped
    member_restored
  }

  type SpamRingConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [SpamRingEdge!]
  }

  type SpamRingEdge {
    cursor: String!
    node: SpamRing!
  }

  type SpamRingMemberConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [SpamRingMemberEdge!]
  }

  type SpamRingMemberEdge {
    cursor: String!
    node: SpamRingMember!
  }

  enum SpamRingsSort {
    score
    detectedAt
    nAuthors
    frozenAt
  }

  input OSSSpamRingsInput {
    after: String
    first: Int @constraint(min: 0)
    sort: SpamRingsSort = score
    filter: OSSSpamRingsFilter
  }

  input OSSSpamRingsFilter {
    status: SpamRingStatus
  }

  input UpdateModerationCaseInput {
    id: ID!
    status: ModerationCaseStatus
    outcome: ModerationCaseOutcome
    noticeState: ModerationNoticeState
    publicReason: String
    internalNote: String
  }

  input NodeInput {
    id: ID!
  }

  input NodesInput {
    ids: [ID!]!
  }

  input FrequentSearchInput {
    key: String
    first: Int @constraint(min: 0)
  }

  input SearchInput {
    "search keyword"
    key: String!

    "types of search target"
    type: SearchTypes!

    after: String
    first: Int @constraint(min: 0)

    "extra query filter for searching"
    filter: SearchFilter

    "specific condition for rule data out"
    exclude: SearchExclude

    "should include tags used by author"
    includeAuthorTags: Boolean

    "whether this search operation should be recorded in search history"
    record: Boolean
    oss: Boolean

    quicksearch: Boolean
  }

  input SearchFilter {
    authorId: ID
  }

  input SingleFileUploadInput {
    type: AssetType!
    file: Upload
    url: String @constraint(format: "uri")
    draft: Boolean
    entityType: EntityType!
    entityId: ID
  }

  input DirectImageUploadInput {
    type: AssetType!
    mime: String
    url: String @constraint(format: "uri")
    draft: Boolean
    entityType: EntityType!
    entityId: ID
  }

  input SetBoostInput {
    id: ID!
    boost: Float! @constraint(min: 0)
    type: BoostTypes!
  }

  input PutRemarkInput {
    id: ID!
    remark: String!
    type: RemarkTypes!
  }

  input PutSkippedListItemInput {
    id: ID
    type: SkippedListItemType
    value: String
    archived: Boolean
  }

  input LogRecordInput {
    type: LogRecordTypes!
  }

  input ConnectionArgs {
    after: String
    first: Int @constraint(min: 0)
    oss: Boolean
    filter: FilterInput
  }

  "Common input to toggle single item for \`toggleXXX\` mutations"
  input ToggleItemInput {
    id: ID!
    enabled: Boolean
  }

  input SetFeatureInput {
    name: FeatureName!
    flag: FeatureFlag!
    value: Float
  }

  input ToggleSeedingUsersInput {
    ids: [ID!]
    enabled: Boolean!
  }

  input AnnouncementsInput {
    id: ID
    visible: Boolean
    channel: IdentityInput
  }

  input PutAnnouncementInput {
    id: ID
    title: [TranslationInput!]
    cover: String
    content: [TranslationInput!]
    link: [TranslationInput!]
    type: AnnouncementType
    expiredAt: DateTime
    visible: Boolean
    order: Int
    channels: [AnnouncementChannelInput!]
  }

  input AnnouncementChannelInput {
    channel: ID!
    visible: Boolean!
    order: Int!
  }


  input DeleteAnnouncementsInput {
    ids: [ID!]
  }

  input PutRestrictedUsersInput {
    ids: [ID!]!
    restrictions: [UserRestrictionType!]!
  }

  input PutUserFeatureFlagsInput {
    ids: [ID!]!
    flags: [UserFeatureFlagType!]!
  }

  input PutUserFederationSettingInput {
    id: ID!
    state: FederationAuthorSettingState!
  }

  input PutArticleFederationSettingInput {
    id: ID!
    state: FederationArticleSettingState!
  }

  input SubmitReportInput {
    targetId: ID!
    reason: ReportReason!
  }

  enum SearchTypes {
    Article
    User
    Tag
  }

  enum SearchAPIVersion {
    v20230601
    v20230301
  }

  enum BoostTypes {
    Article
    User
    Tag
    Campaign
  }

  enum RemarkTypes {
    Article
    User
    Tag
    Comment
    Report
    Feedback
  }

  enum LogRecordTypes {
    ReadFolloweeArticles
    ReadFollowingFeed
    ReadResponseInfoPopUp
  }

  "Enums for sorting tags."
  enum TagsSort {
    newest
    oldest
    hottest
  }

  "Enums for asset types."
  enum AssetType {
    avatar
    cover
    embed
    embedaudio
    profileCover
    oauthClientAvatar
    tagCover
    circleAvatar
    circleCover
    collectionCover
    announcementCover
    moment
    campaignCover
  }

  enum EntityType {
    article
    draft
    tag
    user
    circle
    announcement
    collection
    moment
    campaign
  }

  "Enums for user roles."
  enum Role {
    vistor
    user
    admin
  }

  enum SkippedListItemType {
    agent_hash
    email
    domain
  }

  enum FeatureName {
    add_credit
    payment
    payout
    verify_appreciate
    fingerprint
    tag_adoption
    circle_management
    circle_interact
    spam_detection
    topic_channel_spam_filter
    article_channel
    hottest_moment_feed
  }

  enum FeatureFlag {
    on
    off
    admin
    seeding
  }

  enum SearchExclude {
    blocked
  }

  enum AnnouncementType {
    community
    product
    seminar
  }

  enum UserRestrictionType {
    articleHottest
    articleNewest
  }

  enum UserFeatureFlagType {
    bypassSpamDetection
    unlimitedArticleFetch
    readSpamStatus
    communityWatch
    fediverseBeta
  }

  enum FederationAuthorSettingState {
    enabled
    disabled
  }

  enum FederationArticleSettingState {
    inherit
    enabled
    disabled
  }

  enum FederationExportDecisionReason {
    eligible
    article_not_public
    author_not_opted_in
    article_disabled
  }

  type UserFederationSetting {
    userId: ID!
    state: FederationAuthorSettingState!
    updatedBy: ID
  }

  type ArticleFederationSetting {
    articleId: ID!
    state: FederationArticleSettingState!
    updatedBy: ID
  }

  type ArticleFederationEligibility {
    eligible: Boolean!
    reason: FederationExportDecisionReason!
    effectiveArticleSetting: FederationArticleSettingState!
  }

  enum ReportReason {
    tort
    illegal_advertising
    discrimination_insult_hatred
    pornography_involving_minors
    other
    "Pornographic/adult advertising flagged by a community watch member."
    community_watch_porn_ad
    "Spam advertising flagged by a community watch member."
    community_watch_spam_ad
  }

  enum ReportSource {
    "Submitted directly via the in-site report form."
    direct
    "Created automatically when a community watch member removes a comment."
    community_watch
  }

  enum ModerationCaseSource {
    direct_report
    community_watch
    admin
    system
    model_assisted
    automated
  }

  enum ModerationTargetType {
    article
    comment
    moment
    user
    tag
    other
  }

  enum ModerationCaseStatus {
    received
    reviewing
    action_taken
    rejected
    appealed
    resolved
    closed
  }

  enum ModerationCaseOutcome {
    no_action
    content_collapsed
    content_hidden
    content_removed
    account_limited
    restored
    partially_restored
    upheld
  }

  enum ModerationAutomationRole {
    none
    suggested
    assisted
    automated
  }

  enum ModerationNoticeState {
    not_required
    pending
    sent
    delayed
    prohibited
    failed
  }

  type IcymiTopic implements Node {
    id: ID!
    title(input: TranslationArgs): String!
    articles: [Article!]!
    pinAmount: Int!
    note(input: TranslationArgs): String
    state: IcymiTopicState!
    publishedAt: DateTime
    archivedAt: DateTime
  }

  enum IcymiTopicState {
    published
    editing
    archived
  }

  type IcymiTopicConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [IcymiTopicEdge!]!
  }

  type IcymiTopicEdge {
    cursor: String!
    node: IcymiTopic!
  }

  type TopicChannelFeedbackConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [TopicChannelFeedbackEdge!]!
  }

  type TopicChannelFeedbackEdge {
    cursor: String!
    node: TopicChannelFeedback!
  }

  type TopicChannelFeedback {
    id: ID!
    type: TopicChannelFeedbackType!
    article: Article!
    "Which channels author want to be in, empty for no channels"
    channels: [TopicChannel!]
    state: TopicChannelFeedbackState
    createdAt: DateTime!
  }

  input ReviewTopicChannelFeedbackInput {
    feedback: ID!
    action: TopicChannelFeedbackAction!
  }

  enum TopicChannelFeedbackType {
    positive
    negative
  }

  enum TopicChannelFeedbackAction {
    accept
    reject
  }

  enum TopicChannelFeedbackState {
    pending
    accepted
    rejected
    resolved
  }

  input TopicChannelFeedbacksInput {
    after: String
    first: Int! @constraint(min: 0)
    filter: TopicChannelFeedbacksFilterInput
  }

  input TopicChannelFeedbacksFilterInput {
    state: TopicChannelFeedbackState
    type: TopicChannelFeedbackType
    spam: Boolean
  }

  input PutIcymiTopicInput {
    id: ID
    title: [TranslationInput!]
    articles: [ID!]
    pinAmount: Int
    note: [TranslationInput!]
    state: IcymiTopicState
  }

  input SetSpamStatusInput {
    id: ID!
    isSpam: Boolean!
  }

  input SetAdStatusInput {
    id: ID!
    isAd: Boolean!
  }

  input OSSArticlesInput {
    after: String
    first: Int @constraint(min: 0)
    sort: ArticlesSort = newest
    filter: OSSArticlesFilterInput
  }

  input OSSArticlesFilterInput {
    isSpam: Boolean
    datetimeRange: DatetimeRangeInput
    searchKey: String
  }

  "Sort options shared by OSS comment/moment lists for spam triage."
  enum OSSContentSpamSort {
    newest
    "Order by spam score from high to low (only scored items)"
    mostSpam
  }

  input OSSSpamDatetimeFilterInput {
    datetimeRange: DatetimeRangeInput
  }

  input OSSCommentsInput {
    after: String
    first: Int @constraint(min: 0)
    sort: OSSContentSpamSort = newest
    filter: OSSSpamDatetimeFilterInput
  }

  input OSSMomentsInput {
    after: String
    first: Int @constraint(min: 0)
    sort: OSSContentSpamSort = newest
    filter: OSSSpamDatetimeFilterInput
  }

  ####################
  #    Directives    #
  ####################

  enum CacheControlScope {
    PUBLIC
    PRIVATE
  }

  directive @cacheControl(
    maxAge: Int
    scope: CacheControlScope
    inheritMaxAge: Boolean
  ) on FIELD_DEFINITION | OBJECT | INTERFACE | UNION

  directive @deprecated(
    reason: String = "No longer supported"
  ) on FIELD_DEFINITION | ARGUMENT_DEFINITION | INPUT_FIELD_DEFINITION | ENUM_VALUE

  directive @complexity(
    value: Int!
    multipliers: [String!]
  ) on FIELD_DEFINITION
`
