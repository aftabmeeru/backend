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

const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  try {
    if(!publicId) return null;

    return await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    })
  } catch (error) {
    console.error("Cloudinary delete error: ", error.message);
    return null;    
  }
}

export { uploadOnCloudinary, deleteFromCloudinary, cloudinary };
