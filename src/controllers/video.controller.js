import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  cloudinary,
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { deleteTempFile } from "../utils/deleteTempFile.js";
import { formatDuration } from "../utils/formatDuration.js";

const getAllVideos = asyncHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      query,
      sortBy = "createdAt",
      sortType = "desc",
      userId,
    } = req.query;

    const filter = {};
    if (query) {
      const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { title: { $regex: safeQuery, $options: "i" } },
        { description: { $regex: safeQuery, $options: "i" } },
      ];
    }

    if (userId) {
      if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid User Id");
      }
      filter.owner = userId;
    }

    const sort = { [sortBy]: sortType === "desc" ? -1 : 1 };
    const maxLimit = 100;
    const safeLimit = Math.min(Number(limit), maxLimit);
    const skip = (Number(page) - 1) * safeLimit;

    const videos = await Video.find(filter)
      .collation({ locale: "en", strength: 2 })
      .sort(sort)
      .skip(skip)
      .limit(Number(safeLimit))
      .populate("owner", "username avatar");

    if (!videos || videos.length === 0) {
      throw new ApiError(404, "No videos found");
    }

    const total = await Video.countDocuments(filter);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          total,
          page: Number(page),
          limit: safeLimit,
          totalPages: Math.ceil(total / safeLimit),
          data: videos,
        },
        "Video fetched successfully"
      )
    );
  } catch (error) {
    throw new ApiError(500, "Something went wrong while fetching videos");
  }
});

const publishVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const videoLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  const cleanUp = () => {
    deleteTempFile(videoLocalPath);
    deleteTempFile(thumbnailLocalPath);
  };

  if ([title, description].some((field) => field?.trim() === "")) {
    cleanUp();
    throw new ApiError(400, "All fields are required");
  }

  const existedVideo = await Video.findOne({ title });

  if (existedVideo) {
    cleanUp();
    throw new ApiError(409, "Video with this title already exists");
  }

  if (!(videoLocalPath && thumbnailLocalPath)) {
    cleanUp();
    throw new ApiError(400, "Video file and thumbnail file is required");
  }

  let videoFile, thumbnailFile;
  try {
    videoFile = await uploadOnCloudinary(videoLocalPath);
    if (!videoFile) {
      throw new ApiError(400, "Video upload failed");
    }

    thumbnailFile = await uploadOnCloudinary(thumbnailLocalPath);
    if (!thumbnailFile) {
      await deleteFromCloudinary(videoFile.public_id, "video");
      throw new ApiError(400, "Thumbnail upload failed");
    }
  } catch (error) {
    if (videoFile?.public_id)
      await deleteFromCloudinary(videoFile.public_id, "video");
    if (thumbnailFile?.public_id)
      await deleteFromCloudinary(thumbnailFile.public_id);
    throw error;
  } finally {
    cleanUp();
  }

  const user = await User.findById(req.user._id).select("_id");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const formattedDuration = formatDuration(Math.round(videoFile.duration));

  const video = await Video.create({
    videoFile: {
      url: videoFile.url,
      public_id: videoFile.public_id,
    },
    thumbnail: {
      url: thumbnailFile.url,
      public_id: thumbnailFile.public_id,
    },
    title,
    description,
    duration: formattedDuration,
    owner: user._id,
  });

  const createdVideo = await Video.findById(video._id);

  if (!createdVideo) {
    throw new ApiError(500, "Something went wrong while publishing the video");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, createdVideo, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video Id");
  }

  const video = await Video.findById(videoId).select(
    "title description videoFile thumbnail duration createdAt"
  );

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const { videoId } = req.params;
  const thumbnailPath = req.file?.path;

  if (!isValidObjectId(videoId)) {
    deleteTempFile(thumbnailPath);
    throw new ApiError(400, "Invalid video Id");
  }

  if ([title, description].some((field) => field?.trim() === "")) {
    deleteTempFile(thumbnailPath);
    throw new ApiError(400, "All fields are required");
  }

  const existingVideo = await Video.findById(videoId);
  if (!existingVideo) {
    deleteTempFile(thumbnailPath);
    throw new ApiError(404, "Video not found");
  }

  if (existingVideo.owner?.toString() !== req.user._id.toString()) {
    deleteTempFile(thumbnailPath);
    throw new ApiError(403, "Not authorized to update this video");
  }

  const oldPublicId = existingVideo.thumbnail?.public_id;

  let newThumbnail;
  if (thumbnailPath) {
    newThumbnail = await uploadOnCloudinary(thumbnailPath);
    deleteTempFile(thumbnailPath);

    if (!(newThumbnail?.url && newThumbnail?.public_id)) {
      throw new ApiError(400, "Error uploading thumbnail");
    }

    if (oldPublicId) {
      await cloudinary.uploader.destroy(oldPublicId);
    }
  }

  const video = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: {
          url: newThumbnail.url,
          public_id: newThumbnail.public_id,
        },
      },
    },
    { new: true }
  ).select("title description videoFile thumbnail duration createdAt");

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video Id");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  try {
    const cloudinaryDelete = [];
    if (video?.videoFile?.public_id) {
      cloudinaryDelete.push(
        cloudinary.uploader.destroy(video.videoFile.public_id, {
          resource_type: "video",
        })
      );
    }
    if (video?.thumbnail?.public_id) {
      cloudinaryDelete.push(
        cloudinary.uploader.destroy(video.thumbnail.public_id)
      );
    }

    await Promise.all(cloudinaryDelete);

    const deletedVideo = await Video.findByIdAndDelete(videoId);

    return res
      .status(200)
      .json(new ApiResponse(200, deletedVideo, "Video deleted successfully"));
  } catch (error) {
    throw new ApiError(500, "Failed to delete video");
  }
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findByIdAndUpdate(
    videoId,
    [
      {
        $set: {
          isPublished: {
            $not: "$isPublished",
          },
        },
      },
    ],
    { new: true }
  ).select(
    "title description videoFile thumbnail duration isPublished createdAt"
  );

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Toggle status updated successfully"));
});

const watchVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized: please log in first");
  }

  const video = await Video.findByIdAndUpdate(
    videoId,
    {
      $inc: { views: 1 },
    },
    { new: true }
  ).populate("owner", "username avatar");

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  await User.findByIdAndUpdate(userId, {
    $addToSet: { watchHistory: video._id },
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videoId: video._id,
        title: video.title,
        views: video.views,
        owner: video.owner,
      },
      "Video watched successfully"
    )
  );
});

export {
  getAllVideos,
  publishVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  watchVideo,
};
