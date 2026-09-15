-- ============================================================
-- Automation Platform
-- Initial Database Schema
-- PostgreSQL 17+
-- ============================================================

-- ------------------------------------------------------------
-- Extensions
-- ------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. USERS
-- ============================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email uniqueness should be case-insensitive.
CREATE UNIQUE INDEX uq_users_email_lower ON users (LOWER(email));

-- ============================================================
-- 2. WORKSPACES
-- ============================================================

CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    name VARCHAR(255) NOT NULL,
    created_by UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workspaces_created_by ON workspaces (created_by);

-- ============================================================
-- 3. WORKSPACE MEMBERS
-- ============================================================

CREATE TABLE workspace_members (
    workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (workspace_id, user_id),
    CONSTRAINT chk_workspace_member_role CHECK (
        role IN (
            'owner',
            'admin',
            'member',
            'viewer'
        )
    )
);

CREATE INDEX idx_workspace_members_user ON workspace_members (user_id);

CREATE INDEX idx_workspace_members_workspace ON workspace_members (workspace_id);

-- ============================================================
-- 4. SERVICES
-- ============================================================


CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(255) NOT NULL,

    slug VARCHAR(100) NOT NULL UNIQUE,

    description TEXT,

    icon TEXT,

    category VARCHAR(100),

-- Examples:
-- oauth, api_key, basic_auth, none
auth_type VARCHAR(50) NOT NULL DEFAULT 'none',

-- Service-level configuration.
-- Example:
-- {
--   "oauth": {
--      "authorization_url": "...",
--      "token_url": "...",
--      "scopes": ["..."]
--   }
-- }
config JSONB NOT NULL DEFAULT '{}'::jsonb,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_service_auth_type
        CHECK (
            auth_type IN (
                'none',
                'oauth',
                'api_key',
                'basic_auth',
                'custom'
            )
        )
);

CREATE INDEX idx_services_category ON services (category);

CREATE INDEX idx_services_active ON services (is_active);

-- ============================================================
-- 5. SERVICE ACTIONS
-- ============================================================


CREATE TABLE service_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    service_id UUID NOT NULL
        REFERENCES services(id)
        ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,

    slug VARCHAR(100) NOT NULL,

    description TEXT,

-- Input expected by the action.
-- Can use JSON Schema.
--
-- Example:
-- {
--   "type": "object",
--   "properties": {
--      "to": {"type": "string"},
--      "subject": {"type": "string"},
--      "body": {"type": "string"}
--   },
--   "required": ["to", "subject", "body"]
-- }
input_schema JSONB NOT NULL DEFAULT '{}'::jsonb,

-- Shape of the action's output.
output_schema JSONB NOT NULL DEFAULT '{}'::jsonb,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_service_action_slug
        UNIQUE (service_id, slug)
);

CREATE INDEX idx_service_actions_service ON service_actions (service_id);

CREATE INDEX idx_service_actions_active ON service_actions (is_active);

-- ============================================================
-- 6. SERVICE TRIGGERS
-- ============================================================


CREATE TABLE service_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    service_id UUID NOT NULL
        REFERENCES services(id)
        ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,

    slug VARCHAR(100) NOT NULL,

    description TEXT,

-- Configuration required to configure the trigger.
--
-- Example:
-- {
--   "type": "object",
--   "properties": {
--      "folder": {"type": "string"}
--   }
-- }
config_schema JSONB NOT NULL DEFAULT '{}'::jsonb,

-- Data produced by the trigger and made available
-- to downstream workflow nodes.
output_schema JSONB NOT NULL DEFAULT '{}'::jsonb,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_service_trigger_slug
        UNIQUE (service_id, slug)
);

CREATE INDEX idx_service_triggers_service ON service_triggers (service_id);

CREATE INDEX idx_service_triggers_active ON service_triggers (is_active);

-- ============================================================
-- 7. CONNECTIONS
-- ============================================================


CREATE TABLE connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workspace_id UUID NOT NULL
        REFERENCES workspaces(id)
        ON DELETE CASCADE,

    service_id UUID NOT NULL
        REFERENCES services(id)
        ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,

-- Examples:
-- oauth
-- api_key
-- basic_auth
-- custom
auth_type VARCHAR(50) NOT NULL,

-- IMPORTANT:
-- This column is intended for ENCRYPTED credential data.
-- Never store plaintext passwords/access tokens here.
--
-- Possible structure:
-- {
--   "access_token": "<encrypted>",
--   "refresh_token": "<encrypted>",
--   "api_key": "<encrypted>"
-- }
credentials JSONB NOT NULL DEFAULT '{}'::jsonb,

-- Non-secret connection metadata.
--
-- Example:
-- {
--   "account_email": "user@example.com",
--   "account_name": "Tushar",
--   "scopes": ["gmail.send", "gmail.readonly"]
-- }
metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    status VARCHAR(50) NOT NULL DEFAULT 'active',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_connection_auth_type
        CHECK (
            auth_type IN (
                'oauth',
                'api_key',
                'basic_auth',
                'custom'
            )
        ),

    CONSTRAINT chk_connection_status
        CHECK (
            status IN (
                'active',
                'expired',
                'revoked',
                'error',
                'disabled'
            )
        )
);

CREATE INDEX idx_connections_workspace ON connections (workspace_id);

CREATE INDEX idx_connections_service ON connections (service_id);

CREATE INDEX idx_connections_workspace_service ON connections (workspace_id, service_id);

CREATE INDEX idx_connections_status ON connections (status);

-- ============================================================
-- 8. WORKFLOWS
-- ============================================================


CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workspace_id UUID NOT NULL
        REFERENCES workspaces(id)
        ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,

    description TEXT,

    status VARCHAR(50) NOT NULL DEFAULT 'draft',

-- Points to the version currently considered active/current.
-- Foreign key is added after workflow_versions exists.
current_version_id UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_workflow_status
        CHECK (
            status IN (
                'draft',
                'active',
                'paused',
                'archived'
            )
        )
);

CREATE INDEX idx_workflows_workspace ON workflows (workspace_id);

CREATE INDEX idx_workflows_status ON workflows (status);

CREATE INDEX idx_workflows_workspace_status ON workflows (workspace_id, status);

-- ============================================================
-- 9. WORKFLOW VERSIONS
-- ============================================================

CREATE TABLE workflow_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    workflow_id UUID NOT NULL REFERENCES workflows (id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    CONSTRAINT chk_workflow_version_number CHECK (version > 0),
    CONSTRAINT chk_workflow_version_status CHECK (
        status IN (
            'draft',
            'published',
            'archived'
        )
    ),
    CONSTRAINT uq_workflow_version UNIQUE (workflow_id, version)
);

CREATE INDEX idx_workflow_versions_workflow ON workflow_versions (workflow_id);

CREATE INDEX idx_workflow_versions_status ON workflow_versions (status);

CREATE INDEX idx_workflow_versions_workflow_status ON workflow_versions (workflow_id, status);

-- ============================================================
-- Add current_version foreign key now that versions exist.
-- ============================================================

ALTER TABLE workflows
ADD CONSTRAINT fk_workflows_current_version FOREIGN KEY (current_version_id) REFERENCES workflow_versions (id) ON DELETE SET NULL;

-- ============================================================
-- 10. WORKFLOW NODES
-- ============================================================


CREATE TABLE workflow_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workflow_version_id UUID NOT NULL
        REFERENCES workflow_versions(id)
        ON DELETE CASCADE,

-- Identifier used by the workflow graph itself.
-- Example: "node_1", "node_2", etc.
node_id VARCHAR(100) NOT NULL,

-- Examples:
-- trigger
-- action
-- condition
-- branch
-- loop
-- delay
-- agent
-- transform
node_type VARCHAR(50) NOT NULL,
service_id UUID REFERENCES services (id) ON DELETE SET NULL,
action_id UUID REFERENCES service_actions (id) ON DELETE SET NULL,
trigger_id UUID REFERENCES service_triggers (id) ON DELETE SET NULL,
name VARCHAR(255),

-- Node-specific configuration.
--
-- Example action node:
-- {
--   "connection_id": "...",
--   "inputs": {
--      "to": "{{trigger.email}}",
--      "subject": "Hello",
--      "body": "{{ai.output}}"
--   }
-- }
config JSONB NOT NULL DEFAULT '{}'::jsonb,

-- Visual/editor information.
--
-- Example:
-- {
--   "x": 420,
--   "y": 180
-- }
position JSONB NOT NULL DEFAULT '{}'::jsonb,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
CONSTRAINT uq_workflow_node_id UNIQUE (workflow_version_id, node_id),

-- Needed for composite FK validation from workflow_edges.
CONSTRAINT uq_workflow_node_version UNIQUE (workflow_version_id, id),
CONSTRAINT chk_workflow_node_type CHECK (
    node_type IN (
        'trigger',
        'action',
        'condition',
        'branch',
        'loop',
        'delay',
        'agent',
        'transform'
    )
),

-- Trigger nodes must reference a trigger.
-- Action nodes must reference an action.
--
-- Other node types may use neither.
CONSTRAINT chk_workflow_node_reference
        CHECK (
            (
                node_type = 'trigger'
                AND trigger_id IS NOT NULL
                AND action_id IS NULL
            )
            OR
            (
                node_type = 'action'
                AND action_id IS NOT NULL
                AND trigger_id IS NULL
            )
            OR
            (
                node_type NOT IN ('trigger', 'action')
                AND trigger_id IS NULL
                AND action_id IS NULL
            )
        )
);

CREATE INDEX idx_workflow_nodes_version ON workflow_nodes (workflow_version_id);

CREATE INDEX idx_workflow_nodes_service ON workflow_nodes (service_id);

CREATE INDEX idx_workflow_nodes_action ON workflow_nodes (action_id);

CREATE INDEX idx_workflow_nodes_trigger ON workflow_nodes (trigger_id);

-- ============================================================
-- 11. WORKFLOW EDGES
-- ============================================================


CREATE TABLE workflow_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workflow_version_id UUID NOT NULL
        REFERENCES workflow_versions(id)
        ON DELETE CASCADE,

    source_node_id UUID NOT NULL,

    target_node_id UUID NOT NULL,

-- Optional condition controlling whether this edge is followed.
--
-- Example:
-- {
--   "operator": "equals",
--   "left": "{{node_1.priority}}",
--   "right": "high"
-- }
condition JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

-- Prevent a node from pointing to itself.
CONSTRAINT chk_workflow_edge_not_self CHECK (
    source_node_id <> target_node_id
),

-- Ensure source node belongs to the same workflow version.
CONSTRAINT fk_workflow_edge_source FOREIGN KEY (
    workflow_version_id,
    source_node_id
) REFERENCES workflow_nodes (workflow_version_id, id) ON DELETE CASCADE,

-- Ensure target node belongs to the same workflow version.
CONSTRAINT fk_workflow_edge_target FOREIGN KEY (
    workflow_version_id,
    target_node_id
) REFERENCES workflow_nodes (workflow_version_id, id) ON DELETE CASCADE,

-- Prevent duplicate edges.
CONSTRAINT uq_workflow_edge
        UNIQUE (
            workflow_version_id,
            source_node_id,
            target_node_id
        )
);

CREATE INDEX idx_workflow_edges_version ON workflow_edges (workflow_version_id);

CREATE INDEX idx_workflow_edges_source ON workflow_edges (source_node_id);

CREATE INDEX idx_workflow_edges_target ON workflow_edges (target_node_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_workspaces_updated_at
BEFORE UPDATE ON workspaces
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_services_updated_at
BEFORE UPDATE ON services
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_service_actions_updated_at
BEFORE UPDATE ON service_actions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_service_triggers_updated_at
BEFORE UPDATE ON service_triggers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_connections_updated_at
BEFORE UPDATE ON connections
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_workflows_updated_at
BEFORE UPDATE ON workflows
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();