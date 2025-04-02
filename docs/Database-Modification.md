# Adding New Tables to the Codebase

This guide outlines the steps required to add a new table to the Matters server codebase.

## 1. Define Table Types

First, add object as const in `src/enums/newTableName.ts` if having enum fields
```typescript
export const STATE = {
    // add key/value pairs with same value
} as const

```

Second, add the table type definition in `src/definitions/newTableName.ts`:
```typescript
import type { STATE } from '#common/enums/newTableName.js'
import type { ValueOf } from './generic.js'


export interface NewTableName {
  id: string
  // Add all required columns
  // Example:
  // description: string | null
  // state: ValueOf<typeof CURATION_CHANNEL_STATE>
  createdAt: Date
  updatedAt: Date
}
```

Third, add to TableTypeMap in src/definitions/index.d.ts
```typescript
import type { NewTableName } from './newTableName.js'

export interface TableTypeMap {
  // ... existing tables ...
  new_table_name: NewTableName
}
```

## 2. Create Migration File

run `npm run db:migration:make create_new_table_name_table` to create migration files:

```typescript
import { baseDown } from '../utils.js'

const table = 'new_table_name'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    
    // Add your table columns here
    // Example:
    // t.string('name').notNullable()
    // t.text('description')
    // t.boolean('enabled').notNullable().defaultTo(false)
    // t.specificType('writing_period', 'tstzrange').nullable()
    // t.enu('state', ['pending', 'active', 'finished', 'archived']).notNullable()
    
    // Standard timestamp columns
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now())
    
    // Add any foreign keys
    // t.uuid('user_id').references('id').inTable('user')
  })
}

export const down = baseDown(table)
```

## 3. Update AtomService

If the table needs timestamp updates, add it to `UPATEABLE_TABLES` in `src/connectors/atomService.ts`:

```typescript
const UPATEABLE_TABLES = [
  // ... existing tables ...
  'new_table_name',
]
```

## 4. Add Data Loader (Optional)

If the table requires frequent lookups by ID, add a data loader in `AtomService`:

```typescript
export class AtomService {
  public newTableLoader: AtomDataLoader<string, NewTableName>
  
  public constructor(connections: Connections) {
    // ... existing loaders ...
    this.newTableLoader = this.initLoader({ 
      table: 'new_table_name', 
      mode: 'id' 
    })
  }
}
```

## 5. Run Migrations

Execute the following commands to run your migration:

```bash
# Run migration
npm run knex migrate:latest

# Rollback if needed
npm run knex migrate:rollback
```

## Best Practices

1. **Column Naming**: Use snake_case for column names in the database schema
2. **Timestamps**: Include `created_at` and `updated_at` columns for most tables
4. **Foreign Keys**: Always add appropriate foreign key constraints
5. **Indexes**: Add indexes for columns used in WHERE clauses or JOINs
6. **Soft Delete**: Consider adding `deleted_at` for soft delete functionality
7. **Type Safety**: Ensure TypeScript types match database schema exactly


## Testing Checklist

- [ ] Basic CRUD operations
- [ ] Foreign key constraints
- [ ] Unique constraints
- [ ] Default values
- [ ] Timestamp updates
- [ ] Data loader functionality (if applicable)
- [ ] Migration rollback functionality