import mongoose, { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Like } from "../models/like.model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  if (!userId) {
    throw new ApiError(401, "Unauthorized: Please login first");
  }

  const existingLike = await Like.findOne({
    video: videoId,
    likedBy: userId,
  });

  let action = "";

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
    action = "unliked";
  } else {
    await Like.create({
      video: videoId,
      likedBy: userId,
    });
    action = "liked";
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, { videoId, action }, `Video ${action} successfully`)
    );
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  if (!userId) {
    throw new ApiError(401, "Unauthorized: Please login first");
  }

  const existingLike = await Like.findOne({
    comment: commentId,
    likedBy: userId,
  });

  let action = "";

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
    action = "unliked";
  } else {
    await Like.create({
      comment: commentId,
      likedBy: userId,
    });
    action = "liked";
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { commentId, action },
        `Comment ${action} successfully`
      )
    );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  if (!userId) {
    throw new ApiError(401, "Unauthorized: Please login first");
  }

  const existingLike = await Like.findOne({
    tweet: tweetId,
    likedBy: userId,
  });

  let action = "";

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
    action = "unliked";
  } else {
    await Like.create({
      tweet: tweetId,
      likedBy: userId,
    });
    action = "liked";
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, { tweetId, action }, `Tweet ${action} successfully`)
    );
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized: Please login");
  }

  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(userId),
        video: { $exists: true, $ne: null },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
      },
    },
    {
      $unwind: {
        path: "$video",
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "video.owner",
        foreignField: "_id",
        as: "video.owner",
      },
    },
    {
      $addFields: {
        "video.owner": { $first: "$video.owner" },
      },
    },
    {
      $project: {
        _id: 0,
        likedAt: "$createAt",
        video: {
          _id: 1,
          title: 1,
          thumbnail: 1,
          views: 1,
          duration: 1,
          owner: {
            _id: 1,
            username: 1,
            avatar: 1,
          },
        },
      },
    },
    {
      $sort: { likedAt: -1 },
    },
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalLikedVideos: likedVideos.length,
        videos: likedVideos,
      },
      "Liked videos fetched successfully"
    )
  );
});

export { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos };
