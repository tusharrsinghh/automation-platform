const pool = require("../db");

async function getUserWorkspaces(userId) {
  const result = await pool.query(
    `
    SELECT
      w.id,
      w.name,
      wm.role,
      w.created_at,
      w.updated_at
    FROM workspaces w
    INNER JOIN workspace_members wm
      ON wm.workspace_id = w.id
    WHERE wm.user_id = $1
    ORDER BY w.created_at ASC
    `,
    [userId]
  );

  return result.rows;
}

async function createWorkspace({ userId, name }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const workspaceResult = await client.query(
      `
      INSERT INTO workspaces (name, created_by)
      VALUES ($1, $2)
      RETURNING id, name, created_at, updated_at
      `,
      [name.trim(), userId]
    );

    const workspace = workspaceResult.rows[0];

    await client.query(
      `
      INSERT INTO workspace_members (workspace_id, user_id, role)
      VALUES ($1, $2, 'owner')
      `,
      [workspace.id, userId]
    );

    await client.query("COMMIT");

    return {
      ...workspace,
      role: "owner",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getWorkspace({ userId, workspaceId }) {
  const result = await pool.query(
    `
    SELECT
      w.id,
      w.name,
      w.created_at,
      w.updated_at,
      wm.role
    FROM workspaces w
    INNER JOIN workspace_members wm
      ON wm.workspace_id = w.id
    WHERE w.id = $1
      AND wm.user_id = $2
    `,
    [workspaceId, userId]
  );

  if (result.rows.length === 0) {
    const error = new Error("Workspace not found");
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}

async function updateWorkspace({ userId, workspaceId, name }) {
  const membership = await pool.query(
    `
    SELECT role
    FROM workspace_members
    WHERE workspace_id = $1
      AND user_id = $2
    `,
    [workspaceId, userId]
  );

  if (membership.rows.length === 0) {
    const error = new Error("Workspace not found");
    error.statusCode = 404;
    throw error;
  }

  if (!["owner", "admin"].includes(membership.rows[0].role)) {
    const error = new Error("You do not have permission to update this workspace");
    error.statusCode = 403;
    throw error;
  }

  const result = await pool.query(
    `
    UPDATE workspaces
    SET name = $1
    WHERE id = $2
    RETURNING id, name, created_at, updated_at
    `,
    [name.trim(), workspaceId]
  );

  return {
    ...result.rows[0],
    role: membership.rows[0].role,
  };
}

async function deleteWorkspace({ userId, workspaceId }) {
  const membership = await pool.query(
    `
    SELECT role
    FROM workspace_members
    WHERE workspace_id = $1
      AND user_id = $2
    `,
    [workspaceId, userId]
  );

  if (membership.rows.length === 0) {
    const error = new Error("Workspace not found");
    error.statusCode = 404;
    throw error;
  }

  if (membership.rows[0].role !== "owner") {
    const error = new Error("Only the workspace owner can delete it");
    error.statusCode = 403;
    throw error;
  }

  await pool.query(
    `
    DELETE FROM workspaces
    WHERE id = $1
    `,
    [workspaceId]
  );

  return {
    message: "Workspace deleted successfully",
  };
}

async function getWorkspaceMembers({ userId, workspaceId }) {
  const result = await pool.query(
    `
    SELECT
      u.id,
      u.email,
      wm.role,
      u.created_at
    FROM workspace_members wm
    INNER JOIN users u
      ON u.id = wm.user_id
    WHERE wm.workspace_id = $1
      AND EXISTS (
        SELECT 1
        FROM workspace_members requester
        WHERE requester.workspace_id = $1
          AND requester.user_id = $2
      )
    ORDER BY u.created_at ASC
    `,
    [workspaceId, userId]
  );

  return result.rows;
}

module.exports = {
  getUserWorkspaces,
  createWorkspace,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceMembers,
};