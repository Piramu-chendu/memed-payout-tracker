import { Router } from "express";
import {
  createSubmissionHandler,
  getCreatorEarningsHandler,
  getCreatorSubmissionsHandler,
  updateSubmissionViewsHandler,
} from "../controllers/submission.controller";
import {
  authenticate,
  authorizeRole,
} from "../middleware/auth.middleware";

const router = Router();

// Creators can submit posts using their authenticated account.
router.post(
  "/",
  authenticate,
  authorizeRole("creator"),
  createSubmissionHandler
);

// Creators can view their own submissions.
router.get(
  "/mine",
  authenticate,
  authorizeRole("creator"),
  getCreatorSubmissionsHandler
);

// The assignment explicitly allows simulated platform view updates
// without authentication.
router.patch(
  "/:id/views",
  updateSubmissionViewsHandler
);

// Creators can view their own earnings.
router.get(
  "/earnings",
  authenticate,
  authorizeRole("creator"),
  getCreatorEarningsHandler
);

export default router;