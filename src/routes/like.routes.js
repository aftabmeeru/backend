import { Router } from "express";
import {
  getLikedVideos,
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
} from "../controllers/like.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/video/:videoId/like").post(toggleVideoLike);

router.route("/comment/:commentId/like").post(toggleCommentLike);

router.route("/tweet/:tweetId/like").post(toggleTweetLike);

router.route("/videos/like").get(getLikedVideos);

export default router;
