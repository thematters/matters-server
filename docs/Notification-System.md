# Notification System

## Overview

The notification system is a comprehensive feature that handles various types of notifications across the platform. It supports multiple notification types, entities, and provides a flexible way to manage user notifications.

## Architecture

### Core Components

1. **Notification Types**
   - Base Notifications
   - Bundled Notifications
   - Official Notifications

2. **Database Schema**
   - Notice
   - NoticeDetail
   - NoticeActor
   - NoticeEntity

3. **Notification Service**
   - Core Methods
   - Features

4. **GraphQL Interface**
   - Notice Types
   - Queries and Mutations

## Implementation Details

### Notification Types

#### Base Notifications

1. **User Notifications**
   ```typescript
   interface NoticeUserNewFollowerParams {
     event: NOTICE_TYPE.user_new_follower
     recipientId: string
     actorId: string
     tag: string
   }
   ```

2. **Article Notifications**
   ```typescript
   interface NoticeArticlePublishedParams {
     event: NOTICE_TYPE.article_published
     recipientId: string
     entities: [NotificationEntity<'target', 'article'>]
   }
   ```

3. **Collection Notifications**
   ```typescript
   interface NoticeCollectionLikedParams {
     event: NOTICE_TYPE.collection_liked
     recipientId: string
     actorId: string
     entities: [NotificationEntity<'target', 'collection'>]
     tag: string
   }
   ```

4. **Moment Notifications**
   ```typescript
   interface NoticeMomentLikedParams {
     event: NOTICE_TYPE.moment_liked
     recipientId: string
     actorId: string
     entities: [NotificationEntity<'target', 'moment'>]
     tag: string
   }
   ```

5. **Comment Notifications**
   ```typescript
   interface NoticeArticleNewCommentParams {
     event: NOTICE_TYPE.article_new_comment
     recipientId: string
     actorId: string
     entities: [
       NotificationEntity<'target', 'article'>,
       NotificationEntity<'comment', 'comment'>
     ]
     tag: string
   }
   ```

6. **Transaction Notifications**
   ```typescript
   interface NoticePaymentReceivedDonationParams {
     event: NOTICE_TYPE.payment_received_donation
     recipientId: string
     actorId: string | null
     entities: [NotificationEntity<'target', 'transaction'>]
   }
   ```

7. **Circle Notifications**
   ```typescript
   interface NoticeCircleInvitationParams {
     event: NOTICE_TYPE.circle_invitation
     actorId: string
     recipientId: string
     entities: [NotificationEntity<'target', 'circle'>]
   }
   ```

#### Bundled Notifications

Special notifications that group related events:
- Circle broadcast replies
- Circle discussion updates
- Circle member activities

#### Official Notifications

System-level notifications:
- User status changes (banned, frozen, unbanned)
- Content moderation (article/comment bans)
- Content reports
- Write challenges
- Badge awards

### Database Schema

#### Notice Table
```typescript
interface Notice {
  id: string
  uuid: string
  unread: boolean
  deleted: boolean
  noticeDetailId: string
  recipientId: string
  createdAt: Date
  updatedAt: Date
}
```

#### NoticeDetail Table
```typescript
interface NoticeDetail {
  id: string
  noticeType: string
  message: string
  data: any
  createdAt: Date
}
```

### Notification Service

The `NotificationService` class provides the following key functionalities:

#### Core Methods

1. **Trigger Notification**
   ```typescript
   public trigger = async (params: NotificationParams) => {
     // Sends a new notification
   }
   ```

2. **Withdraw Notification**
   ```typescript
   public withdraw = async (tag: string) => {
     // Cancels/withdraws notifications with a specific tag
   }
   ```

3. **Mark All as Read**
   ```typescript
   public markAllNoticesAsRead = async (userId: string) => {
     // Marks all notifications as read for a user
   }
   ```

4. **Find User Notifications**
   ```typescript
   public findByUser = async ({
     userId,
     onlyRecent,
     take,
     skip,
   }: {
     userId: string
     onlyRecent?: boolean
     take?: number
     skip?: number
   }): Promise<NoticeItem[]>
   ```

5. **Count Notifications**
   ```typescript
   public countNotice = async ({
     userId,
     unread,
     onlyRecent,
   }: {
     userId: string
     unread?: boolean
     onlyRecent?: boolean
   })
   ```

### GraphQL Interface

The system exposes a GraphQL API with the following main types:

#### Notice Types

1. **UserNotice**
   ```graphql
   type UserNotice implements Notice {
     id: ID!
     unread: Boolean!
     createdAt: DateTime!
     actors: [User!]
     type: UserNoticeType!
     target: User!
   }
   ```

2. **ArticleNotice**
   ```graphql
   type ArticleNotice implements Notice {
     id: ID!
     unread: Boolean!
     createdAt: DateTime!
     actors: [User!]
     type: ArticleNoticeType!
     target: Article!
   }
   ```

3. **CircleNotice**
   ```graphql
   type CircleNotice implements Notice {
     id: ID!
     unread: Boolean!
     createdAt: DateTime!
     actors: [User!]
     type: CircleNoticeType!
     target: Circle!
     comments: [Comment!]
     replies: [Comment!]
     mentions: [Comment!]
   }
   ```

## Usage Examples

### Creating a Notification

```typescript
// Example: Creating a new follower notification
const notificationParams: NoticeUserNewFollowerParams = {
  event: NOTICE_TYPE.user_new_follower,
  recipientId: "123",
  actorId: "456",
  tag: "follow-123"
};

await notificationService.trigger(notificationParams);
```

### Retrieving Notifications

```typescript
// Get recent notifications for a user
const notices = await notificationService.findByUser({
  userId: "123",
  onlyRecent: true,
  take: 20,
  skip: 0
});
```

### Managing Notifications

```typescript
// Mark all notifications as read
await notificationService.markAllNoticesAsRead("123");

// Withdraw a notification
await notificationService.withdraw("follow-123");
```

## Best Practices

1. **Notification Tags**
   - Use tags for notifications that might need to be withdrawn
   - Tags should be unique and descriptive

2. **Performance**
   - Use the `onlyRecent` flag when querying notifications
   - Implement pagination for large notification lists
   - Utilize the caching system for frequently accessed notifications

## Limitations

1. Notifications are stored for 6 months by default
2. Some notification types may be deprecated (e.g., `circle_new_article`)
3. The system requires Redis and AWS SQS for full functionality

## Related Files

- `src/definitions/notification.d.ts`: Type definitions
- `src/queries/notice/index.ts`: GraphQL resolvers
- `src/connectors/notificationService/index.ts`: Core service implementation
- `src/common/enums/notification.ts`: Notification type enums 