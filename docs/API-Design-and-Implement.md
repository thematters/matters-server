# API Design and Implement Guideline

## Design

### Schema Checklist

- Cache related directives
- `@complexity` directive for list queries

## Implement Resolver

https://www.apollographql.com/docs/apollo-server/data/resolvers

1. Update files in `./types/` according to API design then run `npm run gen` to update `schema.graphql` and graphql Types for resolvers
   - Add directives accordingly for caching / authorization / ratelimit
   - Add Type Mapper config in `./codegen.json` for new type in schema

2. Create the resolver file
   - Create a new file in the appropriate directory (e.g., mutations/ or queries/)
   - Export the resolver as default
   - Import necessary types from definitions

3. Implement authentication/authorization
   - Check viewer context for authentication
   - Verify appropriate permissions/roles
   - Throw AuthenticationError if unauthorized

4. Validate input
   - Check required fields are present
   - Validate field formats and constraints
   - Throw Errors defined in `src/common/errors.js` for invalid inputs
   - Handle special validations (e.g., datetime ranges)
   - Validate global IDs:
     ```typescript
     const { id, type } = fromGlobalId(globalId)
     if (type !== NODE_TYPES.ExpectedType) {
       throw new UserInputError('Invalid id type')
     }
     return id
     ```
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
   - **Important:** Avoid returning `null` when cache invalidation is needed, as `invalidateFQC` requires ID information to work properly
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
   - If the operation might result in no data but cache invalidation is still needed, consider:
     - Returning an empty object with required fields (like `id`)
     - Throwing an appropriate error instead of returning `null`
     - Handling the cache invalidation before the early return

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

### Connection Utilities

For implementing GraphQL connections (pagination), use the following utility functions from `#common/utils/index.js`:

1. `connectionFromArray`: For simple array data
   ```typescript
   if (!data || data.length === 0) {
     return connectionFromArray([], input)
   }
   ```

2. `connectionFromPromisedArray`: For async data loading
   ```typescript
   return connectionFromPromisedArray(
     dataLoader.loadMany(ids),
     input,
     totalCount // optional
   )
   ```

3. `fromConnectionArgs`: For parsing pagination arguments
   ```typescript
   const { take, skip } = fromConnectionArgs(input, {
     allowTakeAll?: boolean,
     defaultTake?: number,
     maxTake?: number,
     maxSkip?: number
   })
   ```

4. `connectionFromQuery`: For database queries with cursor-based pagination
   ```typescript
   return connectionFromQuery({
     query,
     orderBy: { column: 'order', order: 'desc' },
     cursorColumn: 'id',
     args: input
   })
   ```

Example:
```typescript
// Implement resolver
const resolver: GQLDraftResolvers['collections'] = async (
  { collections },
  { input },
  { dataSources: { atomService } }
) => {
  if (!collections || collections.length === 0) {
    return connectionFromArray([], input)
  }

  return connectionFromPromisedArray(
    atomService.collectionIdLoader.loadMany(collections),
    input
  )
}
```

### Cache Invalidation Best Practices

> **Warning:** Cache invalidation requires ID information to work properly. Avoid returning `null` when cache invalidation is needed.

**Common Pitfalls:**
- Returning `null` from mutations that need cache invalidation
- Early returns that bypass cache invalidation logic
- Missing ID information in returned objects

**Best Practices:**
1. **Always ensure ID is available for cache invalidation:**
   ```typescript
   // ❌ Bad: Returns null, cache invalidation fails
   if (!channel) {
     return null
   }
   
   // ✅ Good: Handle cache invalidation before early return
   if (!channel) {
     // Invalidate cache if needed
     await invalidateFQC({ 
       node: { type: NODE_TYPES.Channel, id: input.id }, 
       redis 
     })
     throw new UserInputError('Channel not found')
   }
   ```

2. **Return objects with required fields instead of null:**
   ```typescript
   // ❌ Bad: Returns null
   return null
   
   // ✅ Good: Returns object with ID for cache invalidation
   return { id: channelId, __type: 'Channel' }
   ```

3. **Handle cache invalidation before any early returns:**
   ```typescript
   // ✅ Good: Cache invalidation happens regardless of return value
   await invalidateFQC({ 
     node: { type: NODE_TYPES.Channel, id }, 
     redis 
   })
   
   if (!result) {
     return { id, __type: 'Channel' }
   }
   
   return result
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
