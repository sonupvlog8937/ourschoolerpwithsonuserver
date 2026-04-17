const fs = require("fs/promises");
const crypto = require("crypto");

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const validateConfig = () => {
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary configuration is missing in environment variables.");
  }
};

const createSignature = (params) => {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return crypto.createHash("sha1").update(`${toSign}${apiSecret}`).digest("hex");
};

const uploadStudentImage = async (filePath, mimeType = "image/jpeg") => {
  validateConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "school-management-system/students";
  const signature = createSignature({ folder, timestamp });

  const fileBuffer = await fs.readFile(filePath);
  const base64File = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;

  const formData = new FormData();
  formData.append("file", base64File);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("folder", folder);
  formData.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || "Cloudinary upload failed.");
  }

  return payload;
};

const deleteStudentImage = async (publicId) => {
  if (!publicId) return;
  validateConfig();

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createSignature({ public_id: publicId, timestamp });
  const body = new URLSearchParams({
    public_id: publicId,
    api_key: apiKey,
    timestamp: String(timestamp),
    signature,
  });

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
    method: "POST",
    body,
  });

  if (!response.ok) {
    const payload = await response.json();
    throw new Error(payload?.error?.message || "Cloudinary destroy failed.");
  }
};

module.exports = {
  uploadStudentImage,
  deleteStudentImage,
};
