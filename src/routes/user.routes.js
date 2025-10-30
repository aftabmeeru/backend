import { Router } from "express";
import {
  changeCurrentPassword,
  getCurrentUser,
  getUserChannelProfile,
  getWatchHistory,
  loginUser,
  logoutUser,
  refresheAccessToken,
  registerUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);
router.route("/refresh-token").post(refresheAccessToken);

// Protected routes
router.use(verifyJWT);

router.route("/logout").post(logoutUser);
router.route("/change-password").patch(changeCurrentPassword);
router.route("/current-user").get(getCurrentUser);
router.route("/update-account").patch(updateAccountDetails);
router
  .route("/avatar")
  .patch(upload.single("avatar"), updateUserAvatar);
router
  .route("/cover-image")
  .patch(upload.single("coverImage"), updateUserCoverImage);
router.route("/c/:username").get(getUserChannelProfile);
router.route("/history").get(getWatchHistory);

export default router;
