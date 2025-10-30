import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subcription.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  if (req.user?._id.toString() === channelId.toString()) {
    throw new ApiError(400, "You cannot subscribe to your own channel");
  }

  const channel = await User.findById(channelId);
  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  const existingSubscription = await Subscription.findOne({
    subscriber: req.user._id,
    channel: channelId,
  });

  let message = "";
  let subscriptionStatus = null;

  if (existingSubscription) {
    await Subscription.deleteOne({
      _id: existingSubscription._id,
    });
    message = "Unsubscribed successfully";
    subscriptionStatus = false;
  } else {
    await Subscription.create({
      subscriber: req.user._id,
      channel: channelId,
    });
    message = "Subscribed successfully";
    subscriptionStatus = true;
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { channelId, subscribed: subscriptionStatus },
        message
      )
    );
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  const skip = (Number(page) - 1) * Number(limit);

  const channelExists = await User.findById(channelId);
  if (!channelExists) {
    throw new ApiError(404, "Channel not found");
  }

  const subscribers = await Subscription.aggregate([
    {
      $match: { channel: new mongoose.Types.ObjectId(channelId) },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber",
      },
    },
    { $unwind: "$subscriber" },
    { $skip: skip },
    { $limit: Number(limit) },
    {
      $project: {
        "subscriber._id": 1,
        "subscriber.username": 1,
        "subscriber.avatar": 1,
      },
    },
  ]);

  const totalSubscribers = await Subscription.countDocuments({
    channel: channelId,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        channelId,
        totalSubscribers,
        subscribers,
      },
      "Subscribers fetched successfully"
    )
  );
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid subscriber ID");
  }

  const subscriberExists = await User.findById(subscriberId);
  if (!subscriberExists) {
    throw new ApiError(404, "Subscriber not found");
  }

  const skip = (Number(page) - 1) * Number(limit);

  const subscribedChannels = await Subscription.aggregate([
    {
      $match: { subscriber: new mongoose.Types.ObjectId(subscriberId) },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channel",
      },
    },
    { $unwind: "$channel" },
    {
      $lookup: {
        from: "subscriptions",
        localField: "channel._id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $addFields: {
        totalSubscribers: { $size: "$subscribers" },
      },
    },
    {
      $project: {
        "channel._id": 1,
        "channel.username": 1,
        "channel.avatar": 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
    { $skip: skip },
    { $limit: Number(limit) },
  ]);

  const totalSubscribed = await Subscription.countDocuments({
    subscriber: subscriberId,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        subscriberId,
        totalSubscribed,
        subscribedChannels,
      },
      "Subscribed channel fetched successfully"
    )
  );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
