import crypto from "crypto";
import { imageKit } from "@/config/imageKit.js";

type UploadFolder = "profile";

interface UploadResult {
  url: string;
  fileId: string;
}

export const mediaService = {
  // UPLOAD ONE IMAGE
  async uploadImage(
    file: Express.Multer.File,
    folder: UploadFolder,
  ): Promise<UploadResult> {
    const response = await imageKit.upload({
      file: file.buffer,
      fileName: `${crypto.randomBytes(32).toString("hex")}_${file.originalname}`,
      folder: `/campulse/${folder}`,
    });

    return {
      url: response.url,
      fileId: response.fileId,
    };
  },

  // UPLOAD MULTIPLE IMAGES
  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder: UploadFolder,
  ): Promise<UploadResult[]> {
    const results = await Promise.all(
      files.map((file) => mediaService.uploadImage(file, folder)),
    );
    return results;
  },

  // DELETE SINGLE IMAGE
  async deleteImage(fileId: string): Promise<void> {
    await imageKit.deleteFile(fileId);
  },

  // BULK DELETE IMAGES
  async deleteMultipleImages(fileIds: string[]): Promise<void> {
    if (!fileIds || fileIds.length === 0) return;

    await imageKit.bulkDeleteFiles(fileIds);
  },
};
