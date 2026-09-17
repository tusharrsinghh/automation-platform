const serviceService = require("../services/serviceService");

async function listServices(req, res) {
  try {
    const services = await serviceService.getServices();

    res.json({ services });
  } catch (error) {
    console.error("List services error:", error);

    res.status(error.statusCode || 500).json({
      error: error.message || "Internal server error",
    });
  }
}

async function getService(req, res) {
  try {
    const service = await serviceService.getServiceById(req.params.id);

    res.json({ service });
  } catch (error) {
    console.error("Get service error:", error);

    res.status(error.statusCode || 500).json({
      error: error.message || "Internal server error",
    });
  }
}

async function createService(req, res) {
  try {
    const {
      name,
      slug,
      description,
      icon,
      category,
      authType,
      config,
    } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        error: "name and slug are required",
      });
    }

    const service = await serviceService.createService({
      name,
      slug,
      description,
      icon,
      category,
      authType,
      config,
    });

    res.status(201).json({ service });
  } catch (error) {
    console.error("Create service error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        error: "A service with this slug already exists",
      });
    }

    res.status(error.statusCode || 500).json({
      error: error.message || "Internal server error",
    });
  }
}

async function updateService(req, res) {
  try {
    const service = await serviceService.updateService(
      req.params.id,
      req.body
    );

    res.json({ service });
  } catch (error) {
    console.error("Update service error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        error: "A service with this slug already exists",
      });
    }

    res.status(error.statusCode || 500).json({
      error: error.message || "Internal server error",
    });
  }
}

async function deleteService(req, res) {
  try {
    const result = await serviceService.deleteService(req.params.id);

    res.json(result);
  } catch (error) {
    console.error("Delete service error:", error);

    res.status(error.statusCode || 500).json({
      error: error.message || "Internal server error",
    });
  }
}

module.exports = {
  listServices,
  getService,
  createService,
  updateService,
  deleteService,
};