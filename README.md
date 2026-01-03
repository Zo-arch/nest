# example-project

Backend API template built with NestJS, TypeORM, PostgreSQL, and Docker.

## 📋 Template Instructions

**This repository is a template project.** To use it for a new project:

1. Clone this repository
2. Search for `example-project` (Ctrl+F / Cmd+F) across all files
3. Replace all occurrences with your project name
4. Update environment variables in `.env` file
5. Update Docker container names and network names if needed

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- Docker and Docker Compose
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
```

### Running with Docker

```bash
# Start database
docker compose up -d example-project-db

# Run migrations (if needed)
npm run migration:run

# Start development server
npm run start:dev
```

### Running without Docker

Make sure PostgreSQL is running locally and update `.env` accordingly.

```bash
npm run start:dev
```

## 📚 API Documentation

Once the server is running:

- **Swagger UI**: http://localhost:3000/api
- **Scalar API Reference** (if enabled): http://localhost:3000/reference

To enable Scalar in local development, set `ENABLE_SCALAR=true` in your `.env` file.

## 🏗️ Project Structure

```
src/
├── common/           # Shared utilities, DTOs, entities
│   ├── base.entity.ts
│   ├── base-query.dto.ts
│   ├── enum/
│   └── query/
├── modules/          # Feature modules
│   └── exemplo/      # Example module (replace with your modules)
└── main.ts          # Application entry point
```

## 🔧 Available Scripts

### Development
- `npm run start:dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start:prod` - Start production server

### Migrations
- `npm run migration:generate` - Generate migration using temporary database
- `npm run migration:run` - Run pending migrations
- `npm run migration:revert` - Revert last migration
- `npm run migration:show` - Show migration status

## 🌐 Environment Variables

See `.env.example` for all available environment variables. Key variables:

- `APP_NAME` - Application name (default: example-project)
- `SERVER_PORT` - API server port (default: 3000)
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` - Database configuration
- `ENABLE_SCALAR` - Enable Scalar API Reference (default: false)

## 🐳 Docker

The project includes Docker Compose configuration for local development:

- **Database**: PostgreSQL 15 Alpine
- **Container name**: `example-project-db`
- **Network**: `example-project-network`
- **Volume**: `example-project-postgres-data`

## 📝 Features

- ✅ RESTful API with NestJS
- ✅ TypeORM with PostgreSQL
- ✅ Swagger/OpenAPI documentation
- ✅ Scalar API Reference (optional)
- ✅ Global validation pipes
- ✅ Generic query filtering and pagination
- ✅ Docker Compose setup
- ✅ Environment-based configuration
- ✅ Automated migration generation system
- ✅ Health check endpoints

## 📦 Database Migrations

### How It Works

This project uses **TypeORM** with two different approaches:

**Development:**
- `synchronize: true` → TypeORM automatically creates/updates tables
- Fast for development
- **No migrations needed**

**Production:**
- `synchronize: false` → Uses migrations to control schema
- Migrations are executed automatically or manually

### Workflow

#### 1. Development (Code Normally)
```bash
# Code your entities normally
# TypeORM synchronizes automatically
npm run start:dev
```

#### 2. Before Production (Generate Migrations)
```bash
# Generate migration using temporary database
npm run migration:generate CreateProdutoTable

# Review the generated migration
# Commit the migration file
git add src/migrations/
git commit -m "feat: add CreateProdutoTable migration"
```

#### 3. Production
```bash
# Migrations are executed automatically (if migrationsRun: true)
# OR manually:
npm run migration:run
```

### Migration Scripts

| Command | Description |
|---------|-------------|
| `npm run migration:generate` | Generate migration using temporary clean database |
| `npm run migration:run` | Run pending migrations |
| `npm run migration:revert` | Revert last migration |
| `npm run migration:show` | Show migration status |

### How Migration Generation Works

Since `synchronize: true` keeps the database always in sync, we use a **temporary clean database** to generate migrations:

1. ✅ Creates a temporary PostgreSQL database
2. ✅ Executes all existing migrations in the temporary database
3. ✅ Compares your entities with the migrated database
4. ✅ Generates migration only if there are differences
5. ✅ Removes temporary database automatically

**Important:**
- Always review generated migrations before committing
- Test locally with `npm run migration:run` before production
- Never commit with `synchronize: true` in production
- Backup database before running migrations in production

## 🔍 Finding Project-Specific Names

To customize this template for a new project, search for:

- `example-project` - Main project identifier
- `example_project_db` - Database name
- `example-project-db` - Docker container name
- `example-project-network` - Docker network name
- `example-project-postgres-data` - Docker volume name

## 📄 License

This project is licensed under the MIT License.
