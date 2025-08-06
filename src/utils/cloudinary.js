import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    try {
      fs.unlinkSync(path.resolve(localFilePath));
    } catch (err) {
      console.error("Error deleting temp file:", err.message);
    }

    console.log("Response from cloudinary: ", response);

    return response;
  } catch (error) {
    try {
      fs.unlinkSync(path.resolve(localFilePath));
    } catch (err) {
      console.error("Error cleaning up failed upload file:", err.message);
    }
    return null;
  }
};

export { uploadOnCloudinary, cloudinary };
