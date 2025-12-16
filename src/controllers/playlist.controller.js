import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  const userId = req.user?._id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized: please login first");
  }

  if (!name || name.trim() === "") {
    throw new ApiError(400, "Playlist name is required");
  }

  const existingPlaylist = await Playlist.findOne({
    owner: userId,
    name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
  });

  if (existingPlaylist) {
    throw new ApiError(400, "You already have a playlist with this name");
  }

  const playlist = await Playlist.create({
    name: name?.trim(),
    description: description?.trim() || "",
    owner: userId,
  });

  const populatedPlaylist = await playlist.populate("owner", "username avatar");

  console.log("populatedPlaylist: ", populatedPlaylist);

  return res
    .status(201)
    .json(
      new ApiResponse(201, populatedPlaylist, "Playlist created successfully")
    );
});

const getUserPlaylist = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  const skip = (Number(page) - 1) * Number(limit);

  const playlists = await Playlist.find({ owner: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .populate("owner", "username avatar");

  if (!playlists.length) {
    throw new ApiError(404, "No playlists found for this user");
  }

  const totalPlaylist = await Playlist.countDocuments({ owner: userId });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalPlaylist,
        currentPage: Number(page),
        playlists,
      },
      "User playlist fetched successfully"
    )
  );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID");
  }

  const playlist =
    await Playlist.findById(playlistId).populate[
      ({ path: "owner", select: "username avatar" },
      {
        path: "videos",
        select: "title thumbnail views duration",
        populate: { path: "owner", select: "username avatar" },
      })
    ];

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (playlist.owner._id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to view this playlist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid playlist or video ID");
  }

  const video = await Video.findById(videoId).select("_id title owner");

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const playlist = await Playlist.findOneAndUpdate(
    {
      _id: playlistId,
      owner: req.user._id,
    },
    { $addToSet: { videos: video._id } },
    { new: true }
  )
    .populate({
      path: "videos",
      populate: { path: "owner", select: "username avatar" },
      select: "title thumbnail",
    })
    .populate("owner", "username avatar");

  if (!playlist) {
    throw new ApiError(404, "Playlist not found or unauthorized access");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist, "Video added to playlist successfully")
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid playlist or video ID");
  }

  const playlist = await Playlist.findOneAndUpdate(
    {
      _id: playlistId,
      owner: req.user._id,
    },
    { $pull: { video: videoId } },
    { new: true }
  )
    .populate({
      path: "videos",
      populate: { path: "owner", select: "username avatar" },
    })
    .populate("owner", "username avatar");

  if (!playlist) {
    throw new ApiError(404, "Playlist not found or unauthorized access");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist, "Video removed from playlist successfully")
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID");
  }

  const playlist = await Playlist.findOneAndDelete({
    _id: playlistId,
    owner: req.user._id,
  });

  if (!playlist) {
    throw new ApiError(
      404,
      "Playlist not found or not authorized to delete this"
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, { playlistId }, "Playlist deleted successfully")
    );
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID");
  }

  if (!name || name.trim() === "") {
    throw new ApiError(400, "Playlist name is required");
  }

  const playlist = await Playlist.findOneAndUpdate(
    {
      _id: playlistId,
      owner: req.user._id,
    },
    {
      $set: {
        name: name?.trim(),
        description: description?.trim() || "",
      },
    },
    { new: true }
  ).populate("owner", "username avatar");

  if (!playlist) {
    throw new ApiError(
      404,
      "Playlist not found or you are not authorized to update it"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist updated successfully"));
});

export {
  createPlaylist,
  getUserPlaylist,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
