const fs = require("fs");
const FormData = require("form-data");
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

/**
 * Upload image to Cloudinary
 * @param {string} filePath - Local file path
 * @param {string} folder - Cloudinary folder name (e.g., 'students', 'school', 'teacher')
 * @returns {Promise<string>} - Cloudinary secure URL
 */
const uploadToCloudinary = async (filePath, folder = "uploads") => {
  validateConfig();
  
  return new Promise((resolve, reject) => {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const cloudinaryFolder = `school-management-system/${folder}`;
      const signature = createSignature({ folder: cloudinaryFolder, timestamp });

      const formData = new FormData();
      formData.append("file", fs.createReadStream(filePath));
      formData.append("api_key", apiKey);
      formData.append("timestamp", String(timestamp));
      formData.append("folder", cloudinaryFolder);
      formData.append("signature", signature);

      formData.submit(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        (err, res) => {
          if (err) {
            // Delete local file on error
            if (fs.existsSync(filePath)) {
              try {
                fs.unlinkSync(filePath);
              } catch (unlinkError) {
                console.error("Error deleting local file:", unlinkError);
              }
            }
            return reject(new Error(`Cloudinary upload failed: ${err.message}`));
          }

          let body = "";
          res.on("data", (chunk) => {
            body += chunk;
          });

          res.on("end", () => {
            try {
              const payload = JSON.parse(body);
              
              if (res.statusCode !== 200) {
                // Delete local file on error
                if (fs.existsSync(filePath)) {
                  fs.unlinkSync(filePath);
                }
                return reject(
                  new Error(payload?.error?.message || "Cloudinary upload failed.")
                );
              }

              // Delete local file after successful upload
              if (fs.existsSync(filePath)) {
                try {
                  fs.unlinkSync(filePath);
                } catch (unlinkError) {
                  console.error("Error deleting local file:", unlinkError);
                }
              }

              console.log("✅ Image uploaded to Cloudinary:", payload.secure_url);
              resolve(payload.secure_url);
            } catch (parseError) {
              // Delete local file on error
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
              }
              reject(new Error(`Failed to parse Cloudinary response: ${parseError.message}`));
            }
          });

          res.on("error", (resError) => {
            // Delete local file on error
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
            reject(new Error(`Cloudinary response error: ${resError.message}`));
          });
        }
      );
    } catch (error) {
      // Delete local file on error
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkError) {
          console.error("Error deleting local file:", unlinkError);
        }
      }
      reject(new Error(`Cloudinary upload failed: ${error.message}`));
    }
  });
};

/**
 * Delete image from Cloudinary
 * @param {string} imageUrl - Cloudinary image URL or public_id
 * @returns {Promise<void>}
 */
const deleteFromCloudinary = async (imageUrl) => {
  if (!imageUrl) return;
  
  return new Promise((resolve) => {
    try {
      validateConfig();

      // Extract public_id from URL if it's a full URL
      let publicId = imageUrl;
      if (imageUrl.includes("cloudinary.com")) {
        const urlParts = imageUrl.split("/");
        const uploadIndex = urlParts.indexOf("upload");
        if (uploadIndex !== -1) {
          const pathAfterUpload = urlParts.slice(uploadIndex + 2).join("/");
          publicId = pathAfterUpload.split(".")[0]; // Remove file extension
        }
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const signature = createSignature({ public_id: publicId, timestamp });
      
      const formData = new FormData();
      formData.append("public_id", publicId);
      formData.append("api_key", apiKey);
      formData.append("timestamp", String(timestamp));
      formData.append("signature", signature);

      formData.submit(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
        (err, res) => {
          if (err) {
            console.error("Cloudinary delete error:", err.message);
            return resolve(); // Don't reject, just log
          }

          let body = "";
          res.on("data", (chunk) => {
            body += chunk;
          });

          res.on("end", () => {
            try {
              const payload = JSON.parse(body);
              if (res.statusCode === 200) {
                console.log("✅ Image deleted from Cloudinary:", publicId);
              } else {
                console.error("Cloudinary delete error:", payload?.error?.message || "Unknown error");
              }
            } catch (parseError) {
              console.error("Failed to parse Cloudinary delete response:", parseError.message);
            }
            resolve();
          });

          res.on("error", (resError) => {
            console.error("Cloudinary delete response error:", resError.message);
            resolve();
          });
        }
      );
    } catch (error) {
      console.error("Error deleting from Cloudinary:", error.message);
      resolve(); // Don't reject, just log
    }
  });
};

// Legacy function names for backward compatibility
const uploadStudentImage = async (filePath) => {
  return uploadToCloudinary(filePath, "students");
};

const deleteStudentImage = async (publicId) => {
  return deleteFromCloudinary(publicId);
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  uploadStudentImage,
  deleteStudentImage,
};
