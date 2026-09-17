const pool = require("../db");
const { encryptJson, decryptJson } = require("../utils/encryption");

async function verifyWorkspaceAccess(client, workspaceId, userId, requireAdmin = false) {
  const result = await client.query(
    `
    SELECT role
    FROM workspace_members
    WHERE workspace_id = $1
      AND user_id = $2
    `,
    [workspaceId, userId]
  );

  if (result.rowCount === 0) {
    throw new Error("Workspace access denied");
  }

  if (
    requireAdmin &&
    !["owner", "admin"].includes(result.rows[0].role)
  ) {
    throw new Error("Owner or admin access required");
  }

  return result.rows[0].role;
}

async function getConnections({ userId, workspaceId }) {
  const client = await pool.connect();

  try {
    await verifyWorkspaceAccess(client, workspaceId, userId);

    const result = await client.query(
      `
      SELECT
        c.id,
        c.workspace_id,
        c.service_id,
        c.name,
        c.auth_type,
        c.metadata,
        c.status,
        c.created_at,
        c.updated_at,
        s.name AS service_name,
        s.slug AS service_slug
      FROM connections c
      INNER JOIN services s
        ON s.id = c.service_id
      WHERE c.workspace_id = $1
      ORDER BY c.created_at ASC
      `,
      [workspaceId]
    );

    return result.rows.map((connection) => ({
      ...connection,
      hasCredentials: true,
    }));
  } finally {
    client.release();
  }
}

async function getConnection({ userId, workspaceId, connectionId }) {
  const client = await pool.connect();

  try {
    await verifyWorkspaceAccess(client, workspaceId, userId);

    const result = await client.query(
      `
      SELECT
        c.id,
        c.workspace_id,
        c.service_id,
        c.name,
        c.auth_type,
        c.metadata,
        c.status,
        c.created_at,
        c.updated_at,
        s.name AS service_name,
        s.slug AS service_slug
      FROM connections c
      INNER JOIN services s
        ON s.id = c.service_id
      WHERE c.id = $1
        AND c.workspace_id = $2
      `,
      [connectionId, workspaceId]
    );

    if (result.rowCount === 0) {
      throw new Error("Connection not found");
    }

    return {
      ...result.rows[0],
      hasCredentials: true,
    };
  } finally {
    client.release();
  }
}

async function createConnection({
  userId,
  workspaceId,
  serviceId,
  name,
  authType,
  credentials = {},
  metadata = {},
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await verifyWorkspaceAccess(client, workspaceId, userId, true);

    const serviceResult = await client.query(
      `
      SELECT id, name, slug, auth_type
      FROM services
      WHERE id = $1
        AND is_active = true
      `,
      [serviceId]
    );

    if (serviceResult.rowCount === 0) {
      throw new Error("Service not found or inactive");
    }

    const service = serviceResult.rows[0];

    const finalAuthType = authType || service.auth_type;

    if (finalAuthType !== service.auth_type) {
      throw new Error(
        `Connection auth type must match service auth type: ${service.auth_type}`
      );
    }

    const encryptedCredentials = encryptJson(credentials);

    console.log("Creating connection:", {
      serviceId,
      serviceAuthType: service.auth_type,
      providedAuthType: authType,
      finalAuthType,
    });

    const result = await client.query(
      `
      INSERT INTO connections (
        workspace_id,
        service_id,
        name,
        auth_type,
        credentials,
        metadata,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'active')
      RETURNING
        id,
        workspace_id,
        service_id,
        name,
        auth_type,
        metadata,
        status,
        created_at,
        updated_at
      `,
      [
        workspaceId,
        serviceId,
        name,
        finalAuthType,
        JSON.stringify(encryptedCredentials),
        JSON.stringify(metadata),
      ]
    );

    await client.query("COMMIT");

    return {
      ...result.rows[0],
      service_name: service.name,
      service_slug: service.slug,
      hasCredentials: true,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function updateConnection({
  userId,
  workspaceId,
  connectionId,
  name,
  credentials,
  metadata,
  status,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await verifyWorkspaceAccess(client, workspaceId, userId, true);

    const existingResult = await client.query(
      `
      SELECT *
      FROM connections
      WHERE id = $1
        AND workspace_id = $2
      FOR UPDATE
      `,
      [connectionId, workspaceId]
    );

    if (existingResult.rowCount === 0) {
      throw new Error("Connection not found");
    }

    const existing = existingResult.rows[0];

    const encryptedCredentials =
      credentials === undefined
        ? existing.credentials
        : JSON.stringify(encryptJson(credentials));

    const result = await client.query(
      `
      UPDATE connections
      SET
        name = COALESCE($1, name),
        credentials = $2,
        metadata = COALESCE($3, metadata),
        status = COALESCE($4, status)
      WHERE id = $5
        AND workspace_id = $6
      RETURNING
        id,
        workspace_id,
        service_id,
        name,
        auth_type,
        metadata,
        status,
        created_at,
        updated_at
      `,
      [
        name ?? null,
        encryptedCredentials,
        metadata === undefined ? null : JSON.stringify(metadata),
        status ?? null,
        connectionId,
        workspaceId,
      ]
    );

    await client.query("COMMIT");

    return {
      ...result.rows[0],
      hasCredentials: true,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function revokeConnection({
  userId,
  workspaceId,
  connectionId,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await verifyWorkspaceAccess(client, workspaceId, userId, true);

    const result = await client.query(
      `
      UPDATE connections
      SET status = 'revoked'
      WHERE id = $1
        AND workspace_id = $2
      RETURNING
        id,
        workspace_id,
        service_id,
        name,
        auth_type,
        metadata,
        status,
        created_at,
        updated_at
      `,
      [connectionId, workspaceId]
    );

    if (result.rowCount === 0) {
      throw new Error("Connection not found");
    }

    await client.query("COMMIT");

    return {
      ...result.rows[0],
      hasCredentials: true,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Internal use only.
// This is what the workflow executor will eventually use.
async function getDecryptedCredentials(connectionId) {
  const result = await pool.query(
    `
    SELECT credentials, status
    FROM connections
    WHERE id = $1
    `,
    [connectionId]
  );

  if (result.rowCount === 0) {
    throw new Error("Connection not found");
  }

  if (result.rows[0].status !== "active") {
    throw new Error("Connection is not active");
  }

  return decryptJson(result.rows[0].credentials);
}

module.exports = {
  getConnections,
  getConnection,
  createConnection,
  updateConnection,
  revokeConnection,
  getDecryptedCredentials,
};