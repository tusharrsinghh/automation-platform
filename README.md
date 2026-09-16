# Automation Platform

A backend-first automation platform for connecting services, defining workflows, and eventually letting an AI agent decide how those workflows should be executed.

The goal is fairly simple: instead of building a separate integration and workflow for every use case, the platform should provide a common layer for **services, actions, triggers, connections, and workflows**.

This is a personal project I'm building to understand how an automation platform works internally, rather than just using an existing one.

## Current Status

The project is currently in the backend foundation stage.

Implemented:

* PostgreSQL database and migrations
* User registration and login
* Password hashing with bcrypt
* JWT-based authentication
* Workspace creation and membership
* Workspace-level authorization
* Basic workspace APIs

Next:

* Service catalog
* Service actions and triggers
* Service connections and credential handling
* Workflow creation and versioning
* Workflow execution
* API/webhook triggers
* AI-based workflow orchestration

The project is intentionally being built in layers. I want the underlying platform to work before adding the AI layer on top of it.

---

## What I'm Building

The long-term idea is to have something along these lines:

```text
                    User
                     │
                     ▼
              ┌──────────────┐
              │   Workspace  │
              └──────┬───────┘
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
      Services    Connections  Workflows
          │                         │
     ┌────┴────┐              ┌────┴────┐
     ▼         ▼              ▼         ▼
   Actions   Triggers       Nodes     Edges
                                  │
                                  ▼
                           Execution Engine
                                  │
                                  ▼
                            AI Orchestrator
```

A service represents an integration such as email, Slack, an HTTP API, a database, or another application.

Each service can expose:

* **Actions** — things the platform can do
* **Triggers** — events that can start a workflow

A connection represents an authenticated connection between a workspace and a service.

A workflow then combines these pieces into an executable graph.

For example:

```text
New Email
    │
    ▼
AI Agent
    │
    ├── Important → Send Slack Message
    │
    └── Not Important → Archive Email
```

The AI component should eventually be able to understand a user's intent and map it to available services, actions, and workflow operations rather than having every possible path hard-coded.

---

## Architecture

The backend is currently a Node.js application using Express and PostgreSQL.

```text
automation-platform/
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── app.js
│   │   ├── server.js
│   │   ├── db.js
│   │   ├── migrate.js
│   │   └── test-db.js
│   │
│   ├── package.json
│   └── package-lock.json
│
├── database/
│   └── migrations/
│       └── 001_initial_schema.sql
│
├── docker-compose.yml
├── .env
└── .gitignore
```

### Backend

The backend follows a fairly conventional separation:

* **Routes** define API endpoints.
* **Controllers** handle HTTP requests and responses.
* **Services** contain application/business logic.
* **Middleware** handles things such as authentication.
* **Utils** contains reusable helpers such as JWT handling.
* **DB layer** manages the PostgreSQL connection.
* **Migrations** manage database structure.

I'm keeping the structure relatively simple for now. If the application grows, individual domains can be split further rather than introducing unnecessary abstraction early.

---

# Database

PostgreSQL is the main data store.

The current schema is designed around a few core concepts.

### Users

Stores application users and their password hashes.

```text
users
├── id
├── email
├── password_hash
├── created_at
└── updated_at
```

Passwords are never stored directly. They are hashed using bcrypt before being inserted into the database.

### Workspaces

A workspace is the main boundary for user data.

```text
workspaces
├── id
├── name
├── created_by
├── created_at
└── updated_at
```

A user can belong to multiple workspaces.

### Workspace Members

Controls which users belong to which workspace and their role.

Current roles:

* `owner`
* `admin`
* `member`
* `viewer`

This will eventually be used to control access to connections, workflows, and other workspace resources.

### Services

Represents integrations supported by the platform.

```text
services
├── id
├── name
├── slug
├── description
├── icon
├── category
├── auth_type
├── config
└── is_active
```

### Service Actions

Defines operations that a service provides.

For example, an email service could expose:

```text
send_email
search_emails
reply_to_email
```

The action definitions contain input and output schemas so that the execution layer knows what an action expects and returns.

### Service Triggers

Defines events that can start workflows.

For example:

```text
new_email
webhook_received
new_database_record
```

Triggers also have configuration and output schemas.

### Connections

A connection represents a workspace's authenticated access to a service.

```text
connections
├── workspace_id
├── service_id
├── auth_type
├── credentials
├── metadata
└── status
```

Credentials are treated as secrets and are intended to be encrypted before being persisted.

The database schema deliberately separates credentials from normal metadata so that secret handling can be isolated from the rest of the application.

### Workflows

A workflow belongs to a workspace and has versions.

```text
workflows
    │
    └── workflow_versions
             │
             ├── workflow_nodes
             │
             └── workflow_edges
```

Nodes represent operations in a workflow.

Supported node types currently include:

```text
trigger
action
condition
branch
loop
delay
agent
transform
```

Edges connect nodes and define the workflow graph.

The versioning model is intentional. A published workflow should be executable without being affected by someone editing the next draft.

---

# Authentication

Authentication currently uses JWTs.

### Register

```http
POST /api/auth/register
```

Example:

```json
{
  "email": "user@example.com",
  "password": "password123",
  "workspaceName": "My Workspace"
}
```

Registration creates:

1. A user
2. A workspace
3. An owner membership for that user
4. A JWT

The user, workspace, and membership are created inside a database transaction.

### Login

```http
POST /api/auth/login
```

Example:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Returns the authenticated user, workspace, and JWT.

### Current User

```http
GET /api/auth/me
```

Requires:

```http
Authorization: Bearer <token>
```

---

# Workspace API

Workspace endpoints currently require authentication.

### List Workspaces

```http
GET /api/workspaces
```

### Create Workspace

```http
POST /api/workspaces
```

```json
{
  "name": "My New Workspace"
}
```

### Get Workspace

```http
GET /api/workspaces/:id
```

### Update Workspace

```http
PATCH /api/workspaces/:id
```

```json
{
  "name": "Updated Workspace Name"
}
```

### Delete Workspace

```http
DELETE /api/workspaces/:id
```

Only the workspace owner can delete a workspace.

### List Members

```http
GET /api/workspaces/:id/members
```

---

# Running Locally

## Requirements

You'll need:

* Node.js
* Docker
* PostgreSQL through the provided Docker setup

Clone the repository and install backend dependencies:

```bash
cd backend
npm install
```

Create a `.env` file in the project root.

Example:

```env
DB_HOST=localhost
DB_PORT=5433
DB_NAME=automation_platform
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your_local_secret
JWT_EXPIRES_IN=7d
```

Start PostgreSQL:

```bash
docker compose up -d
```

Run the database migrations:

```bash
cd backend
npm run migrate
```

Start the API:

```bash
npm start
```

The API should be available at:

```text
http://localhost:3000
```

Health check:

```http
GET /health
```

Expected response:

```json
{
  "status": "ok",
  "database": "connected"
}
```

---

# Development Approach

I'm building this project from the bottom up instead of starting with the AI agent.

The order is roughly:

```text
Database
   ↓
Authentication
   ↓
Workspaces
   ↓
Services
   ↓
Actions / Triggers
   ↓
Connections
   ↓
Workflow API
   ↓
Workflow Execution
   ↓
AI Orchestration
```

There is a reason for this order.

An AI agent is only useful if there is a reliable system underneath it that it can interact with. The agent should eventually operate on well-defined services and actions rather than directly containing application-specific logic.

For example, instead of teaching an LLM:

> "If the user asks to send an email, call this particular function with these particular fields."

the platform should expose something closer to:

```text
Service: Email

Action: send_email

Input:
{
  "to": "...",
  "subject": "...",
  "body": "..."
}
```

The AI layer can then reason over the available capabilities.

That separation should make it possible to add new integrations without rewriting the orchestration layer every time.

---

# Security

Security is still an active part of the project rather than something I consider finished.

Current measures include:

* Passwords are hashed using bcrypt.
* Password hashes are never returned through the API.
* JWTs are used for authenticated API access.
* Workspace membership is checked before accessing workspace resources.
* Workspace ownership is checked for destructive operations.
* Database queries use parameterized values rather than string interpolation.
* Secrets are kept in environment variables during local development.

Still to be implemented:

* Encrypted service credentials
* Refresh token strategy
* Password reset
* Email verification
* Rate limiting
* Better session/token management
* More granular authorization
* Audit logging
* Production secret management

The `connections.credentials` field is specifically intended for encrypted credentials. Plaintext service passwords or API keys should not be stored there.

---

# Why This Project?

Most automation platforms hide the interesting parts behind their UI.

You create a trigger, drag a few blocks around, connect an account, and the workflow runs.

That's useful, but I wanted to understand what is actually required to build one.

The project is therefore less about making another workflow UI and more about exploring the backend systems behind one:

* How integrations are represented
* How actions and triggers are modeled
* How credentials are isolated
* How workflows are represented as graphs
* How workflow versions are managed
* How executions can be made reliable
* Where an LLM actually belongs in the architecture
* How an AI agent can safely interact with predefined tools

The end goal is an automation system where the AI layer is useful because the underlying platform is well structured—not because an LLM is sitting in front of a pile of hard-coded functions.

---

# Roadmap

### Phase 1 — Foundation

* [x] PostgreSQL schema
* [x] Database migrations
* [x] Express API
* [x] User registration
* [x] User login
* [x] JWT authentication
* [x] Workspace creation
* [x] Workspace membership
* [x] Workspace APIs

### Phase 2 — Integrations

* [ ] Service API
* [ ] Action API
* [ ] Trigger API
* [ ] Service catalog
* [ ] Connection API
* [ ] Credential encryption
* [ ] First real service integration

### Phase 3 — Workflows

* [ ] Workflow CRUD
* [ ] Workflow versions
* [ ] Node management
* [ ] Edge management
* [ ] Workflow validation
* [ ] Workflow publishing
* [ ] Execution engine
* [ ] Execution history

### Phase 4 — Automation

* [ ] Webhook triggers
* [ ] Scheduled triggers
* [ ] Background jobs
* [ ] Retries
* [ ] Timeouts
* [ ] Execution logs
* [ ] Failure handling

### Phase 5 — AI

* [ ] LLM orchestration layer
* [ ] Tool discovery
* [ ] Intent → action mapping
* [ ] Workflow generation from natural language
* [ ] Agent nodes
* [ ] Human approval steps
* [ ] Execution guardrails

### Phase 6 — Product

* [ ] Frontend
* [ ] Workflow editor
* [ ] Connection management UI
* [ ] Execution dashboard
* [ ] Logs and debugging
* [ ] Deployment
* [ ] Production monitoring

---

# Tech Stack

### Backend

* Node.js
* Express
* PostgreSQL

### Authentication

* bcryptjs
* JSON Web Tokens

### Infrastructure

* Docker / Docker Compose
* Git / GitHub

### Planned

* React
* LLM APIs
* Background job processing
* Redis or equivalent queue/storage layer
* External service APIs
* Webhooks

---

## Project Status

This is an actively developed project.

The current implementation is intentionally small. The goal is to keep the foundations understandable while gradually adding the pieces required for a real automation platform.

The AI layer will come later. First, the platform needs something worth orchestrating.
