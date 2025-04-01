# API Design and Implement Guideline

## Design




## Implement

https://www.apollographql.com/docs/apollo-server/data/resolvers


### Unions and Interfaces

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
  },
  }
}

### Checklist

- Validation
- Authorization
- Caching