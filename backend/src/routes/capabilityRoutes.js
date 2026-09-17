const express = require("express");
const capabilityController = require("../controllers/capabilityController");
const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate);

router.get(
  "/:serviceId/actions",
  capabilityController.listActions
);

router.post(
  "/:serviceId/actions",
  capabilityController.createAction
);

router.get(
  "/:serviceId/actions/:actionId",
  capabilityController.getAction
);

router.patch(
  "/:serviceId/actions/:actionId",
  capabilityController.updateAction
);

router.delete(
  "/:serviceId/actions/:actionId",
  capabilityController.deleteAction
);

router.get(
  "/:serviceId/triggers",
  capabilityController.listTriggers
);

router.post(
  "/:serviceId/triggers",
  capabilityController.createTrigger
);

router.get(
  "/:serviceId/triggers/:triggerId",
  capabilityController.getTrigger
);

router.patch(
  "/:serviceId/triggers/:triggerId",
  capabilityController.updateTrigger
);

router.delete(
  "/:serviceId/triggers/:triggerId",
  capabilityController.deleteTrigger
);

module.exports = router;