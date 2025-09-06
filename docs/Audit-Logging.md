# Audit Logging

Audit logging is a critical component of our application that tracks user actions and system events for security, analytics, and debugging purposes. This document explains how to implement audit logging in your code.

## Purpose

Audit logs are used to:
- Track sensitive operations like user authentication and data modifications
- Help with debugging and troubleshooting issues
- Provide data for security analysis
- Analyze user behavior patterns

> Note: Audit log entries stored in S3 will be sent to Google BigQuery for analytics usage.

## How to start Audit Logging

### 1. Import the Required Dependencies

```typescript
import { AUDIT_LOG_ACTION, AUDIT_LOG_STATUS } from '#common/enums/index.js'
import { auditLog } from '#common/logger.js'
```

### 2. Call the `auditLog` Function

The `auditLog` function accepts an object with the following parameters:

```typescript
// no try/catch
auditLog({
  actorId: string | null,        // User ID performing the action (can be null for system actions)
  action: ValueOf<typeof AUDIT_LOG_ACTION>,  // The action being performed
  status: ValueOf<typeof AUDIT_LOG_STATUS>,  // The status of the action
  entity?: TableName,            // Optional: Database table name related to the action
  entityId?: string,             // Optional: ID of the specific entity being modified
  oldValue?: string | null,      // Optional: Previous value (for update operations)
  newValue?: string,             // Optional: New value (for update operations)
  remark?: string                // Optional: Additional information or error messages
})
```

### 3. Common Patterns

#### Success and Failure Logging

Typically, you should log both successful and failed operations:

```typescript
try {
  const result = await performOperation()
  
  // Log successful operation
  auditLog({
    actorId: userId,
    action: AUDIT_LOG_ACTION.actionName,
    status: AUDIT_LOG_STATUS.succeeded
  })
  
  return result
} catch (err) {
  // Log failed operation
  auditLog({
    actorId: userId,
    action: AUDIT_LOG_ACTION.actionName,
    status: AUDIT_LOG_STATUS.failed,
    remark: `Error: ${err.message}`
  })
  
  throw err
}
```

#### Update Operations

When logging updates, include the old and new values:

```typescript
auditLog({
  actorId: userId,
  action: AUDIT_LOG_ACTION.updateUsername,
  status: AUDIT_LOG_STATUS.succeeded,
  oldValue: oldUsername,
  newValue: newUsername
})
```

#### System Operations

For system-initiated actions, use `null` as the `actorId`:

```typescript
auditLog({
  actorId: null,
  action: AUDIT_LOG_ACTION.systemAction,
  status: AUDIT_LOG_STATUS.succeeded
})
```

## Available Actions

Audit log actions are defined in `src/common/enums/logging.ts` as `AUDIT_LOG_ACTION`. Some common actions include:

- Authentication: `emailLogin`, `walletLogin`, `socialLoginGoogle`, etc.
- Account changes: `updateEmail`, `updatePassword`, `updateUsername`, etc.
- Content operations: `createCollection`, `removeCollection`, etc.
- File operations: `uploadImage`, `uploadFile`, etc.

When adding new features, you may need to extend the `AUDIT_LOG_ACTION` enum with new actions.

## Statuses

Actions can have the following statuses:

- `AUDIT_LOG_STATUS.pending`: The action is in progress
- `AUDIT_LOG_STATUS.succeeded`: The action completed successfully
- `AUDIT_LOG_STATUS.failed`: The action failed

## Context Information

The audit logger automatically adds the following context information to your logs:

- IP address of the request
- User agent of the request

This information is extracted from the async context store and does not need to be explicitly provided.

## Best Practices

1. **Be consistent**: Follow the established patterns in the codebase
2. **Log both success and failure**: Wrap operations in try/catch blocks and log both outcomes
3. **Include relevant details**: Add entity IDs, values, and error messages when applicable
4. **Security sensitive**: Never log passwords or other sensitive user data
5. **Be descriptive**: Use clear, specific action names and remarks

## Examples

### User Authentication

```typescript
// Example from emailLogin mutation
try {
  result = await _resolver(root, args, context, info)
  auditLog({
    actorId: context.viewer.id,
    action: getAction(result),
    status: AUDIT_LOG_STATUS.succeeded,
  })
  return result
} catch (err) {
  const email = args.input.email.toLowerCase()
  const user = await context.dataSources.userService.findByEmail(email)
  auditLog({
    actorId: user?.id || null,
    action: AUDIT_LOG_ACTION.emailLogin,
    status: AUDIT_LOG_STATUS.failed,
    remark: `email: ${email} error message: ${err.message}`,
  })
  throw err
}
```

### User Update Operations

```typescript
// Example of updating user wallet
try {
  const res = await this._addWallet(userId, ethAddress)
  auditLog({
    actorId: userId,
    action: AUDIT_LOG_ACTION.addWallet,
    newValue: ethAddress,
    status: AUDIT_LOG_STATUS.succeeded,
  })
  return res
} catch (err) {
  auditLog({
    actorId: userId,
    action: AUDIT_LOG_ACTION.addWallet,
    newValue: ethAddress,
    remark: err.message,
    status: AUDIT_LOG_STATUS.failed,
  })
  throw err
}
```

### Content Operations

```typescript
// Example of adding an article to a collection
auditLog({
  actorId: viewer.id,
  action: AUDIT_LOG_ACTION.addArticleIntoCollection,
  status: AUDIT_LOG_STATUS.succeeded,
  entity: 'collection_article',
  entityId: collection.id
})
```
