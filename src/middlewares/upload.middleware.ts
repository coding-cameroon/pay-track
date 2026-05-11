import multer from "multer";

export const upload = multer({
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
  storage: multer.memoryStorage(),
  fileFilter: (_, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error("Only JPEG, PNG and WEBP images are allowed"));
      return;
    }
    cb(null, true);
  },
});
