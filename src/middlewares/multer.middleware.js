import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const allowedTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/x-matroska',
  'application/pdf',
  'audio/mpeg',
  'audio/wav',    
  'audio/x-wav',    
];

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image, video, PDF, and audio files are allowed"), false);
  }
};

export const upload = multer({ 
  storage,   
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 },
});
