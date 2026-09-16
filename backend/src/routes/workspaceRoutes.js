const express = require("express");
const workspaceController = require("../controllers/workspaceController");
const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate);

router.get("/", workspaceController.listWorkspaces);
router.post("/", workspaceController.createWorkspace);

router.get("/:id", workspaceController.getWorkspace);
router.patch("/:id", workspaceController.updateWorkspace);
router.delete("/:id", workspaceController.deleteWorkspace);

router.get("/:id/members", workspaceController.getMembers);

module.exports = router;