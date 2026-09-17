const connectionService = require("../services/connectionService");

async function list(req, res) {
  try {
    const connections = await connectionService.getConnections({
      userId: req.user.userId,
      workspaceId: req.params.workspaceId,
    });

    res.json({
      connections,
    });
  } catch (error) {
    console.error(error);

    res.status(
      error.message.includes("access denied") ? 403 : 400
    ).json({
      error: error.message,
    });
  }
}

async function get(req, res) {
  try {
    const connection = await connectionService.getConnection({
      userId: req.user.userId,
      workspaceId: req.params.workspaceId,
      connectionId: req.params.connectionId,
    });

    res.json({
      connection,
    });
  } catch (error) {
    console.error(error);

    res.status(
      error.message === "Connection not found" ? 404 : 400
    ).json({
      error: error.message,
    });
  }
}

async function create(req, res) {
  try {
    const {
      serviceId,
      name,
      authType,
      credentials,
      metadata,
    } = req.body;

    if (!serviceId || !name) {
      return res.status(400).json({
        error: "serviceId and name are required",
      });
    }

    const connection = await connectionService.createConnection({
      userId: req.user.userId,
      workspaceId: req.params.workspaceId,
      serviceId,
      name,
      authType,
      credentials,
      metadata,
    });

    res.status(201).json({
      connection,
    });
  } catch (error) {
    console.error(error);

    res.status(
      error.message.includes("access denied") ? 403 : 400
    ).json({
      error: error.message,
    });
  }
}

async function update(req, res) {
  try {
    const {
      name,
      credentials,
      metadata,
      status,
    } = req.body;

    const connection = await connectionService.updateConnection({
      userId: req.user.userId,
      workspaceId: req.params.workspaceId,
      connectionId: req.params.connectionId,
      name,
      credentials,
      metadata,
      status,
    });

    res.json({
      connection,
    });
  } catch (error) {
    console.error(error);

    res.status(
      error.message === "Connection not found" ? 404 : 400
    ).json({
      error: error.message,
    });
  }
}

async function remove(req, res) {
  try {
    const connection = await connectionService.revokeConnection({
      userId: req.user.userId,
      workspaceId: req.params.workspaceId,
      connectionId: req.params.connectionId,
    });

    res.json({
      connection,
    });
  } catch (error) {
    console.error(error);

    res.status(
      error.message === "Connection not found" ? 404 : 400
    ).json({
      error: error.message,
    });
  }
}

module.exports = {
  list,
  get,
  create,
  update,
  remove,
};