const pool = require("../db");

async function getServices() {
  const result = await pool.query(
    `
    SELECT
      id,
      name,
      slug,
      description,
      icon,
      category,
      auth_type,
      config,
      is_active,
      created_at,
      updated_at
    FROM services
    WHERE is_active = true
    ORDER BY name ASC
    `
  );

  return result.rows;
}

async function getServiceById(serviceId) {
  const result = await pool.query(
    `
    SELECT
      id,
      name,
      slug,
      description,
      icon,
      category,
      auth_type,
      config,
      is_active,
      created_at,
      updated_at
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

async function createService({
  name,
  slug,
  description,
  icon,
  category,
  authType,
  config,
}) {
  const result = await pool.query(
    `
    INSERT INTO services (
      name,
      slug,
      description,
      icon,
      category,
      auth_type,
      config
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING
      id,
      name,
      slug,
      description,
      icon,
      category,
      auth_type,
      config,
      is_active,
      created_at,
      updated_at
    `,
    [
      name.trim(),
      slug.trim().toLowerCase(),
      description || null,
      icon || null,
      category || null,
      authType || "none",
      config || {},
    ]
  );

  return result.rows[0];
}

async function updateService(serviceId, updates) {
  const allowedFields = {
    name: "name",
    slug: "slug",
    description: "description",
    icon: "icon",
    category: "category",
    authType: "auth_type",
    config: "config",
    isActive: "is_active",
  };

  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields[key] !== undefined) {
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

  values.push(serviceId);

  const result = await pool.query(
    `
    UPDATE services
    SET ${fields.join(", ")}
    WHERE id = $${values.length}
    RETURNING
      id,
      name,
      slug,
      description,
      icon,
      category,
      auth_type,
      config,
      is_active,
      created_at,
      updated_at
    `,
    values
  );

  if (result.rows.length === 0) {
    const error = new Error("Service not found");
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}

async function deleteService(serviceId) {
  const result = await pool.query(
    `
    UPDATE services
    SET is_active = false
    WHERE id = $1
    RETURNING id
    `,
    [serviceId]
  );

  if (result.rows.length === 0) {
    const error = new Error("Service not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    message: "Service disabled successfully",
  };
}

module.exports = {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
};