const pool = require("../db");

async function getService(serviceId) {
  const result = await pool.query(
    `
    SELECT id, name, slug
    FROM services
    WHERE id = $1
    `,
    [serviceId]
  );

  if (result.rows.length === 0) {
    const error = new Error("Service not found");
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}

async function getActions(serviceId) {
  await getService(serviceId);

  const result = await pool.query(
    `
    SELECT
      id,
      service_id,
      name,
      slug,
      description,
      input_schema,
      output_schema,
      is_active,
      created_at,
      updated_at
    FROM service_actions
    WHERE service_id = $1
      AND is_active = true
    ORDER BY name ASC
    `,
    [serviceId]
  );

  return result.rows;
}

async function getAction(serviceId, actionId) {
  await getService(serviceId);

  const result = await pool.query(
    `
    SELECT
      id,
      service_id,
      name,
      slug,
      description,
      input_schema,
      output_schema,
      is_active,
      created_at,
      updated_at
    FROM service_actions
    WHERE id = $1
      AND service_id = $2
    `,
    [actionId, serviceId]
  );

  if (result.rows.length === 0) {
    const error = new Error("Action not found");
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}

async function createAction({
  serviceId,
  name,
  slug,
  description,
  inputSchema,
  outputSchema,
}) {
  await getService(serviceId);

  const result = await pool.query(
    `
    INSERT INTO service_actions (
      service_id,
      name,
      slug,
      description,
      input_schema,
      output_schema
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING
      id,
      service_id,
      name,
      slug,
      description,
      input_schema,
      output_schema,
      is_active,
      created_at,
      updated_at
    `,
    [
      serviceId,
      name.trim(),
      slug.trim().toLowerCase(),
      description || null,
      inputSchema || {},
      outputSchema || {},
    ]
  );

  return result.rows[0];
}

async function updateAction(serviceId, actionId, updates) {
  await getAction(serviceId, actionId);

  const allowedFields = {
    name: "name",
    slug: "slug",
    description: "description",
    inputSchema: "input_schema",
    outputSchema: "output_schema",
    isActive: "is_active",
  };

  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields[key]) {
      fields.push(`${allowedFields[key]} = $${values.length + 1}`);

      values.push(
        key === "slug" && typeof value === "string"
          ? value.trim().toLowerCase()
          : value
      );
    }
  }

  if (fields.length === 0) {
    const error = new Error("No valid fields provided for update");
    error.statusCode = 400;
    throw error;
  }

  values.push(actionId);
  values.push(serviceId);

  const result = await pool.query(
    `
    UPDATE service_actions
    SET ${fields.join(", ")}
    WHERE id = $${values.length - 1}
      AND service_id = $${values.length}
    RETURNING
      id,
      service_id,
      name,
      slug,
      description,
      input_schema,
      output_schema,
      is_active,
      created_at,
      updated_at
    `,
    values
  );

  return result.rows[0];
}

async function deleteAction(serviceId, actionId) {
  await getAction(serviceId, actionId);

  await pool.query(
    `
    UPDATE service_actions
    SET is_active = false
    WHERE id = $1
      AND service_id = $2
    `,
    [actionId, serviceId]
  );

  return {
    message: "Action disabled successfully",
  };
}

async function getTriggers(serviceId) {
  await getService(serviceId);

  const result = await pool.query(
    `
    SELECT
      id,
      service_id,
      name,
      slug,
      description,
      config_schema,
      output_schema,
      is_active,
      created_at,
      updated_at
    FROM service_triggers
    WHERE service_id = $1
      AND is_active = true
    ORDER BY name ASC
    `,
    [serviceId]
  );

  return result.rows;
}

async function getTrigger(serviceId, triggerId) {
  await getService(serviceId);

  const result = await pool.query(
    `
    SELECT
      id,
      service_id,
      name,
      slug,
      description,
      config_schema,
      output_schema,
      is_active,
      created_at,
      updated_at
    FROM service_triggers
    WHERE id = $1
      AND service_id = $2
    `,
    [triggerId, serviceId]
  );

  if (result.rows.length === 0) {
    const error = new Error("Trigger not found");
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}

async function createTrigger({
  serviceId,
  name,
  slug,
  description,
  configSchema,
  outputSchema,
}) {
  await getService(serviceId);

  const result = await pool.query(
    `
    INSERT INTO service_triggers (
      service_id,
      name,
      slug,
      description,
      config_schema,
      output_schema
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING
      id,
      service_id,
      name,
      slug,
      description,
      config_schema,
      output_schema,
      is_active,
      created_at,
      updated_at
    `,
    [
      serviceId,
      name.trim(),
      slug.trim().toLowerCase(),
      description || null,
      configSchema || {},
      outputSchema || {},
    ]
  );

  return result.rows[0];
}

async function updateTrigger(serviceId, triggerId, updates) {
  await getTrigger(serviceId, triggerId);

  const allowedFields = {
    name: "name",
    slug: "slug",
    description: "description",
    configSchema: "config_schema",
    outputSchema: "output_schema",
    isActive: "is_active",
  };

  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields[key]) {
      fields.push(`${allowedFields[key]} = $${values.length + 1}`);

      values.push(
        key === "slug" && typeof value === "string"
          ? value.trim().toLowerCase()
          : value
      );
    }
  }

  if (fields.length === 0) {
    const error = new Error("No valid fields provided for update");
    error.statusCode = 400;
    throw error;
  }

  values.push(triggerId);
  values.push(serviceId);

  const result = await pool.query(
    `
    UPDATE service_triggers
    SET ${fields.join(", ")}
    WHERE id = $${values.length - 1}
      AND service_id = $${values.length}
    RETURNING
      id,
      service_id,
      name,
      slug,
      description,
      config_schema,
      output_schema,
      is_active,
      created_at,
      updated_at
    `,
    values
  );

  return result.rows[0];
}

async function deleteTrigger(serviceId, triggerId) {
  await getTrigger(serviceId, triggerId);

  await pool.query(
    `
    UPDATE service_triggers
    SET is_active = false
    WHERE id = $1
      AND service_id = $2
    `,
    [triggerId, serviceId]
  );

  return {
    message: "Trigger disabled successfully",
  };
}

module.exports = {
  getActions,
  getAction,
  createAction,
  updateAction,
  deleteAction,
  getTriggers,
  getTrigger,
  createTrigger,
  updateTrigger,
  deleteTrigger,
};