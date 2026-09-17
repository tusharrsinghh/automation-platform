const express = require("express");
const serviceController = require("../controllers/serviceController");
const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate);

router.get("/", serviceController.listServices);
router.post("/", serviceController.createService);

router.get("/:id", serviceController.getService);
router.patch("/:id", serviceController.updateService);
router.delete("/:id", serviceController.deleteService);

module.exports = router;