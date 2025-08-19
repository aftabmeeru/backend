import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  publishVideo,
  togglePublishStatus,
  updateVideo,
} from "../controllers/video.controller.js";

const router = Router();

router.route("/publish-video").post(
  verifyJWT,
  upload.fields([
    {
      name: "videoFile",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  publishVideo
);

router.route("/videos").get(verifyJWT, getAllVideos);
router.route("/video/:videoId").get(verifyJWT, getVideoById);
router
  .route("/update-video/:videoId")
  .patch(verifyJWT, upload.single("thumbnail"), updateVideo);
router.route("/delete-video/:videoId").delete(verifyJWT, deleteVideo);
router.route("/toggle/publish/:videoId").patch(verifyJWT, togglePublishStatus);

export default router;
