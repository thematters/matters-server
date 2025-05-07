# API Design and Implement Guideline

## Design

todo

## Implement Resolver

https://www.apollographql.com/docs/apollo-server/data/resolvers

1. Update files in `./types/` according to API design then run `npm run gen` to update `schema.graphql` and graphql Types for resolvers
   - Add directives accordingly for caching / authorization / ratelimit

2. Create the resolver file
   - Create a new file in the appropriate directory (e.g., mutations/ or queries/)
   - Export the resolver as default
   - Import necessary types from definitions
   - Import needed services and utilities

3. Implement authentication/authorization
   - Check viewer context for authentication
   - Verify appropriate permissions/roles
   - Throw AuthenticationError if unauthorized

4. Validate input
   - Check required fields are present
   - Validate field formats and constraints
   - Throw Errors defined in `src/common/errors.js` for invalid inputs
   - Handle special validations (e.g., datetime ranges)
   - Use appropriate error codes:
     - `BAD_USER_INPUT` for validation errors
     - `ENTITY_NOT_FOUND` for not found errors
     - `FORBIDDEN` for permission errors
     - `UNAUTHENTICATED` for authentication errors

5. Implement business logic
   - Use service layer classes for database operations
   - Handle translations if needed
   - Process data transformations
   - Manage relationships between entities

6. Return response
   - Format response according to GraphQL schema
   - Include all required fields
   - Handle errors appropriately
   - Transform data if needed (e.g., ID to global ID)
   - For mutations, invalidate related cache after database operations using `invalidateFQC` (cache of returned object is handled by `logCache` directive):
     ```typescript
     import { invalidateFQC } from '@matters/apollo-response-cache'
     
     // Invalidate cache for specific node type
     await invalidateFQC({ 
       node: { type: NODE_TYPES.Article, id }, 
       redis 
     })
     return channel
     ```

7. Register resolver
   - Import resolver in index file
   - Add to appropriate export object (Query/Mutation)

8. Add tests
   - Create test file in `types/__test__` directory
   - Test authorization
   - Test input validation
   - Test successful operations
   - Test error cases
   - Test edge cases


Example:
```typescript
// Implement resolver
const resolver: GQLMutationResolvers['putChannel'] = async (
  _,
  { input },
  { viewer, dataSources }
) => {
  // 1. Auth check
  if (!viewer.id) {
    throw new AuthenticationError('unauthorized')
  }

  // 2. Validate input
  if (input.activePeriod && !isValidDateRange(input.activePeriod)) {
    throw new UserInputError('invalid date range') 
  }

  // 3. Business logic
  const channel = await dataSources.channelService.createOrUpdate(input)

  // 4. Return response
  return channel
}

// helpers should be placed below resolvers
```

### Unions and Interfaces

> **Note:** Always use `__type` (not `__typename`) for type discrimination in resolver return objects. This ensures consistency with our type resolution logic and cache handling.

1. return `__type` in resolvers:
```typescript
// Example from comment/node.ts
const resolver = async ({ targetId, targetTypeId, type }, _, { dataSources: { atomService } }) => {
  // Determine type and fetch data
  if (type === COMMENT_TYPE.article) {
    const draft = await atomService.articleIdLoader.load(targetId)
    return { ...draft, __type: 'Article' }
  } else if (type === COMMENT_TYPE.moment) {
    const moment = await atomService.momentIdLoader.load(targetId)
    return { ...moment, __type: 'Moment' }
  }
  // ... handle other types
}
```

2. implement `__resolveType` on Unions/Interfaces
```typescript
// Interface/Union need to add `__resolveType`
const resolvers = {
  Node: {
    __resolveType: ({ __type }) => __type
  }
}

// Add Interface/Union to typeResolver in `src/schema.ts` for cache operation
const typeResolver = (type: string, result: any) => {
  const unionsAndInterfaces = [
    ...
    NODE_TYPES.Channel,
  ]

  if (unionsAndInterfaces.indexOf(type as NODE_TYPES) >= 0 && result?.__type) {
    return result.__type
  }

  return type
}
```