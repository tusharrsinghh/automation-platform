const capabilityService = require("../services/capabilityService");

async function listActions(req, res) {
  try {
    const actions = await capabilityService.getActions(req.params.serviceId);

    res.json({ actions });
  } catch (error) {
    console.error("List actions error:", error);

    res.status(error.statusCode || 500).json({
      error: error.message || "Internal server error",
    });
  }
}

async function getAction(req, res) {
  try {
    const action = await capabilityService.getAction(
      req.params.serviceId,
      req.params.actionId
    );

    res.json({ action });
  } catch (error) {
    console.error("Get action error:", error);

    res.status(error.statusCode || 500).json({
      error: error.message || "Internal server error",
    });
  }
}

async function createAction(req, res) {
  try {
    const {
      name,
      slug,
      description,
      inputSchema,
      outputSchema,
    } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        error: "name and slug are required",
      });
    }

    const action = await capabilityService.createAction({
      serviceId: req.params.serviceId,
      name,
      slug,
      description,
      inputSchema,
      outputSchema,
    });

    res.status(201).json({ action });
  } catch (error) {
    console.error("Create action error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        error: "An action with this slug already exists for this service",
      });
    }

    res.status(error.statusCode || 500).json({
      error: error.message || "Internal server error",
    });
  }
}

async function updateAction(req, res) {
  try {
    const action = await capabilityService.updateAction(
      req.params.serviceId,
      req.params.actionId,
      req.body
    );

    res.json({ action });
  } catch (error) {
    console.error("Update action error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        error: "An action with this slug already exists for this service",
      });
    }

    res.status(error.statusCode || 500).json({
      error: error.message || "Internal server error",
    });
  }
}

async function deleteAction(req, res) {
  try {
    const result = await capabilityService.deleteAction(
      req.params.serviceId,
      req.params.actionId
    );

    res.json(result);
  } catch (error) {
    console.error("Delete action error:", error);

    res.status(error.statusCode || 500).json({
      error: error.message || "Internal server error",
    });
  }
}

async function listTriggers(req, res) {
  try {
    const triggers = await capabilityService.getTriggers(req.params.serviceId);

    res.json({ triggers });
  } catch (error) {
    console.error("List triggers error:", error);

    res.status(error.statusCode || 500).json({
      error: error.message || "Internal server error",
    });
  }
}

async function getTrigger(req, res) {
  try {
    const trigger = await capabilityService.getTrigger(
      req.params.serviceId,
      req.params.triggerId
    );

    res.json({ trigger });
  } catch (error) {
    console.error("Get trigger error:", error);

    res.status(error.statusCode || 500).json({
      error: error.message || "Internal server error",
    });
  }
}

async function createTrigger(req, res) {
  try {
    const {
      name,
      slug,
      description,
      configSchema,
      outputSchema,
    } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        error: "name and slug are required",
      });
    }

    const trigger = await capabilityService.createTrigger({
      serviceId: req.params.serviceId,
      name,
      slug,
      description,
      configSchema,
      outputSchema,
    });

    res.status(201).json({ trigger });
  } catch (error) {
    console.error("Create trigger error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        error: "A trigger with this slug already exists for this service",
      });
    }

    res.status(error.statusCode || 500).json({
      error: error.message || "Internal server error",
    });
  }
}

async function updateTrigger(req, res) {
  try {
    const trigger = await capabilityService.updateTrigger(
      req.params.serviceId,
      req.params.triggerId,
      req.body
    );

    res.json({ trigger });
  } catch (error) {
    console.error("Update trigger error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        error: "A trigger with this slug already exists for this service",
      });
    }

    res.status(error.statusCode || 500).json({
      error: error.message || "Internal server error",
    });
  }
}

async function deleteTrigger(req, res) {
  try {
    const result = await capabilityService.deleteTrigger(
      req.params.serviceId,
      req.params.triggerId
    );

    res.json(result);
  } catch (error) {
    console.error("Delete trigger error:", error);

    res.status(error.statusCode || 500).json({
      error: error.message || "Internal server error",
    });
  }
}

module.exports = {
  listActions,
  getAction,
  createAction,
  updateAction,
  deleteAction,
  listTriggers,
  getTrigger,
  createTrigger,
  updateTrigger,
  deleteTrigger,
};