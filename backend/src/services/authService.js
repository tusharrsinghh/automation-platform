const bcrypt = require("bcryptjs");
const pool = require("../db");
const { generateToken } = require("../utils/jwt");

async function registerUser({ email, password, workspaceName }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await client.query(
      `SELECT id FROM users WHERE LOWER(email) = $1`,
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      const error = new Error("Email is already registered");
      error.statusCode = 409;
      throw error;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const userResult = await client.query(
      `
      INSERT INTO users (email, password_hash)
      VALUES ($1, $2)
      RETURNING id, email, created_at
      `,
      [normalizedEmail, passwordHash]
    );

    const user = userResult.rows[0];

    const workspaceResult = await client.query(
      `
      INSERT INTO workspaces (name, created_by)
      VALUES ($1, $2)
      RETURNING id, name, created_at
      `,
      [workspaceName.trim(), user.id]
    );

    const workspace = workspaceResult.rows[0];

    await client.query(
      `
      INSERT INTO workspace_members (workspace_id, user_id, role)
      VALUES ($1, $2, 'owner')
      `,
      [workspace.id, user.id]
    );

    await client.query("COMMIT");

    const token = generateToken({
      userId: user.id,
      workspaceId: workspace.id,
    });

    return {
      user,
      workspace,
      token,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function loginUser({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  const result = await pool.query(
    `
    SELECT id, email, password_hash, created_at
    FROM users
    WHERE LOWER(email) = $1
    `,
    [normalizedEmail]
  );

  if (result.rows.length === 0) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const user = result.rows[0];

  const passwordMatches = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!passwordMatches) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const workspaceResult = await pool.query(
    `
    SELECT w.id, w.name
    FROM workspaces w
    INNER JOIN workspace_members wm
      ON wm.workspace_id = w.id
    WHERE wm.user_id = $1
    ORDER BY w.created_at ASC
    LIMIT 1
    `,
    [user.id]
  );

  const workspace = workspaceResult.rows[0] || null;

  const token = generateToken({
    userId: user.id,
    workspaceId: workspace?.id || null,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    },
    workspace,
    token,
  };
}

async function getCurrentUser(userId) {
  const result = await pool.query(
    `
    SELECT id, email, created_at, updated_at
    FROM users
    WHERE id = $1
    `,
    [userId]
  );

  if (result.rows.length === 0) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
};