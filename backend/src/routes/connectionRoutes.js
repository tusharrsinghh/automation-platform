const express = require("express");
const connectionController = require("../controllers/connectionController");
const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate);

router.get(
  "/:workspaceId/connections",
  connectionController.list
);

router.post(
  "/:workspaceId/connections",
  connectionController.create
);

router.get(
  "/:workspaceId/connections/:connectionId",
  connectionController.get
);

router.patch(
  "/:workspaceId/connections/:connectionId",
  connectionController.update
);

router.delete(
  "/:workspaceId/connections/:connectionId",
  connectionController.remove
);

module.exports = router;