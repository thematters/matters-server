# Project Structure

## Directory Layout

```
matters-server/
├── src/
│   ├── common/           # Shared utilities and constants
│   │   ├── enums/       # Enumeration definitions
│   │   ├── errors/      # Custom error classes
│   │   └── utils/       # Utility functions
│   │
│   ├── connectors/      # Database and external service connectors
│   │   ├── __test__/   # Connector tests
│   │   └── *.ts        # Service implementations
│   │
│   ├── definitions/     # Type definitions and interfaces
│   │   └── *.ts        # TypeScript type definitions
│   │
│   ├── mutations/       # GraphQL mutation resolvers
│   │   └── *.ts        # Mutation implementations
│   │
│   ├── queries/         # GraphQL query resolvers
│   │   └── *.ts        # Query implementations
│   │
│   ├── types/          # GraphQL type definitions
│   │   ├── __test__/   # Type tests
│   │   └── *.ts        # GraphQL schema types
│   │
│   └── utils/          # Application utilities
│       └── *.ts        # Helper functions
│
├── db/                 # Database related files
│   ├── migrations/     # Database migrations
│   ├── seeds/         # Database seed files
│   └── bin/           # Database scripts
│
├── docs/              # Documentation
│   └── *.md          #  Documentation files
│
├── .env.example       # Environment variables template
├── package.json       # NPM package configuration
└── README.md         # Project overview
```

## Key Components

### 1. GraphQL Layer
- **Types**: Define GraphQL schema types in `src/types/`
- **Queries**: Implement query resolvers in `src/queries/`
- **Mutations**: Implement mutation resolvers in `src/mutations/`

### 2. Data Layer
- **Connectors**: Database and external service connections in `src/connectors/`
- **Migrations**: Database schema changes in `db/migrations/`
- **Seeds**: Initial data population in `db/seeds/`

### 3. Testing
- **Unit Tests**: Located in `__test__` directories
- **Test Utilities**: Common test setup in `src/types/__test__/utils.js`
- **Test Mode**: Special testing configurations in `docs/Test-Mode.md`

### 4. Common Utilities
- **Enums**: Shared constants in `src/common/enums/`
- **Errors**: Custom error classes in `src/common/errors/`
- **Utils**: Helper functions in `src/common/utils/`

## Development Workflow

1. **Setup**
   ```bash
   npm install
   cp .env.example .env
   npm run db:migrate
   ```

2. **Database Changes**
   ```bash
   # Create migration
   npm run db:migration:make <name>
   
   # Create seed
   npm run db:seed:make <name>
   
   # Run migrations
   npm run db:migrate
   ```

3. **Testing**
   ```bash
   # Run all tests
   npm run test
   
   # Run specific test
   npm run test -- <test-file>
   ```

4. **Development**
   ```bash
   # Start development server
   npm run start:dev
   ```

## Key Files

- **Environment**: `.env.example` - Template for environment variables
- **Database**: `db/migrations/` - Database schema changes
- **GraphQL**: `src/types/` - GraphQL schema definitions
- **Tests**: `src/**/__test__/` - Test files
- **Documentation**: `docs/` - Project documentation

## Best Practices

1. **Code Organization**
   - Keep related files together
   - Use clear, descriptive names
   - Follow TypeScript best practices

2. **Testing**
   - Write tests for new features
   - Follow test guidelines in `docs/Unittest.md`
   - Use test mode for development

3. **Database**
   - Use migrations for schema changes
   - Include rollback scripts
   - Document complex queries

4. **Documentation**
   - Keep README up to date
   - Document complex logic
   - Include examples in tests 