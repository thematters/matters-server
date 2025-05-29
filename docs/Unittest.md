# Unittest Guidelines

## General Structure

### Test File Organization
- Place test files in `__test__` directories
- Name test files with `.test.ts` suffix
- Group related tests in describe blocks
- Use clear, descriptive test names
- Example: `src/types/__test__/2/channel/articles.test.ts`

### Setup and Teardown
```typescript
let connections: Connections
let channelService: ChannelService
let atomService: AtomService

beforeAll(async () => {
  connections = await genConnections()
  channelService = new ChannelService(connections)
  atomService = new AtomService(connections)
}, 30000) // Set appropriate timeout

afterAll(async () => {
  await closeConnections(connections)
})

beforeEach(async () => {
  // Clean up previous test data
  await atomService.deleteMany({ table: 'topic_channel_article' })
  await atomService.deleteMany({ table: 'topic_channel' })
})
```

## Testing Patterns

### GraphQL Tests
1. **Query Structure**
   ```typescript
   const GET_CHANNEL_ARTICLES = /* GraphQL */ `
     query GetChannelArticles(
       $channelInput: ChannelInput!
       $articleInput: ChannelArticlesInput!
     ) {
       channel(input: $channelInput) {
         ... on TopicChannel {
           articles(input: $articleInput) {
             edges {
               pinned
               node {
                 id
               }
             }
           }
         }
       }
     }
   `
   ```

2. **Test Client Setup**
   ```typescript
   const server = await testClient({
     connections,
     isAuth: true,
     isAdmin: true, // Use this instead of context: { viewer: admin } if admin.id is not needed
   })
   ```

3. **Operation Execution**
   ```typescript
   const { data, errors } = await server.executeOperation({
     query: GET_CHANNEL_ARTICLES,
     variables: {
       channelInput: {
         shortHash: channel.shortHash, // Required field
       },
       articleInput: {
         first: 10,
         filter: {
           dateTimeRange: { start, end },
         },
       },
     },
   })
   ```

4. **Testing Multi-language Content**
   ```typescript
   const PUT_ANNOUNCEMENT = /* GraphQL */ `
     mutation PutAnnouncement($input: PutAnnouncementInput!) {
       putAnnouncement(input: $input) {
         id
         title
         titleEn: title(input: { language: en })
         content
         cover
         link
         type
         visible
         order
       }
     }
   `

   const { data, errors } = await server.executeOperation({
     query: PUT_ANNOUNCEMENT,
     variables: {
       input: {
         title: [
           { language: 'zh_hant', text: '測試標題' },
           { language: 'en', text: 'Test Title' },
         ],
         content: [
           { language: 'zh_hant', text: '測試內容' },
           { language: 'en', text: 'Test Content' },
         ],
         link: [
           { language: 'zh_hant', text: 'https://example.com' },
           { language: 'en', text: 'https://example.com' },
         ],
         type: 'community',
         visible: true,
         order: 1,
       },
     },
   })

   expect(errors).toBeUndefined()
   expect(data?.putAnnouncement).toBeDefined()
   expect(data?.putAnnouncement.title).toBe('測試標題')
   expect(data?.putAnnouncement.titleEn).toBe('Test Title')
   ```

### Data Setup
1. **Test Data Creation**
   ```typescript
   // Create test channel, prefer using specific Services over AtomService
   const channel = await channelService.createTopicChannel({
     name: 'test-topic',
     providerId: 'test-provider-id',
     enabled: true,
   })
   ```

2. **Cleanup**
   ```typescript
   beforeEach(async () => {
     await atomService.deleteMany({ table: 'topic_channel_article' })
     await atomService.deleteMany({ table: 'topic_channel' })
   })
   ```

### Assertions
1. **Basic Assertions**
   ```typescript
   expect(errors).toBeUndefined()
   expect(data?.node.articles.edges).toHaveLength(3)
   ```

2. **ID Assertions**
   ```typescript
   // When asserting IDs, use toGlobalId to match the GraphQL global ID format
   expect(data?.putAnnouncement.channels[0].channel.id).toBe(toGlobalId({
     type: NODE_TYPES.TopicChannel,
     id: channel.id,
   }))
   ```

## Best Practices

### Test Isolation
- Each test should be independent
- Clean up data between tests using `beforeEach`
- Don't rely on test execution order
- Example:
   ```typescript
   beforeEach(async () => {
     await atomService.deleteMany({ table: 'topic_channel_article' })
     await atomService.deleteMany({ table: 'topic_channel' })
   })
   ```

### Error Handling
- Test both success and error cases
- Verify error codes using `errors?.[0].extensions.code`, do not verify error messages
- Handle async errors appropriately
- Example:
  ```typescript
  // Success case
  expect(errors).toBeUndefined()
  expect(data).toBeDefined()

  // Error cases
  expect(errors).toBeDefined()
  expect(errors?.[0].extensions.code).toBe('BAD_USER_INPUT')  // For validation errors
  expect(errors?.[0].extensions.code).toBe('ENTITY_NOT_FOUND')  // For not found errors
  expect(errors?.[0].extensions.code).toBe('FORBIDDEN')  // For permission errors
  ```

### Performance
- Use appropriate timeouts (e.g., 30000ms for `beforeAll`)
- Clean up resources promptly in `afterAll`
- Avoid unnecessary setup/teardown

### Code Organization
- Group related tests in describe blocks
- Use descriptive test names
- Keep test files focused and concise
- Example:
   ```typescript
   describe('datetimeRange filtering', () => {
     test('filters articles within date range', async () => {
       // Test implementation
     })
   })
   ```

## Tips
- Use meaningful variable names (e.g., `channel`, `articles`)
- Add comments for complex setup
- Keep tests focused on one aspect
- Use TypeScript types for better type safety
- Always check GraphQL schema for required fields in inputs
- Verify input types match schema definitions
- Use service methods for data creation when available
- Prefer using existing user IDs when possible