import fs from "fs";
import path from "path";

export const deleteTempFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(path.resolve(filePath));
    }
  } catch (error) {
    console.log("Error deleting temp file", error.message);
  }
};