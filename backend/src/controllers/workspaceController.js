const workspaceService = require("../services/workspaceService");

async function listWorkspaces(req, res) {
  try {
    const workspaces = await workspaceService.getUserWorkspaces(
      req.user.userId
    );

    res.json({ workspaces });
  } catch (error) {
    console.error("List workspaces error:", error);

    res.status(error.statusCode || 500).json({
      error: error.message || "Internal server error",
    });
  }
}

async function createWorkspace(req, res) {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: "Workspace name is required",
      });
    }

    const workspace = await workspaceService.createWorkspace({
      userId: req.user.userId,
      name,
    });

    res.status(201).json({ workspace });
  } catch (error) {
    console.error("Create workspace error:", error);

    res.status(error.statusCode || 500).json({
      error: error.message || "Internal server error",
    });
  }
}

async function getWorkspace(req, res) {
  try {
    const workspace = await workspaceService.getWorkspace({
      userId: req.user.userId,
      workspaceId: req.params.id,
    });

    res.json({ workspace });
  } catch (error) {
    console.error("Get workspace error:", error);

    res.status(error.statusCode || 500).json({
      error: error.message || "Internal server error",
    });
  }
}

async function updateWorkspace(req, res) {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: "Workspace name is required",
      });
    }

    const workspace = await workspaceService.updateWorkspace({
      userId: req.user.userId,
      workspaceId: req.params.id,
      name,
    });

    res.json({ workspace });
  } catch (error) {
    console.error("Update workspace error:", error);

    res.status(error.statusCode || 500).json({
      error: error.message || "Internal server error",
    });
  }
}

async function deleteWorkspace(req, res) {
  try {
    const result = await workspaceService.deleteWorkspace({
      userId: req.user.userId,
      workspaceId: req.params.id,
    });

    res.json(result);
  } catch (error) {
    console.error("Delete workspace error:", error);

    res.status(error.statusCode || 500).json({
      error: error.message || "Internal server error",
    });
  }
}

async function getMembers(req, res) {
  try {
    const members = await workspaceService.getWorkspaceMembers({
      userId: req.user.userId,
      workspaceId: req.params.id,
    });

    res.json({ members });
  } catch (error) {
    console.error("Get workspace members error:", error);

    res.status(error.statusCode || 500).json({
      error: error.message || "Internal server error",
    });
  }
}

module.exports = {
  listWorkspaces,
  createWorkspace,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getMembers,
};