# Cloudinary Image Upload Guide

## ✅ Current Status
Cloudinary is **already configured and working** in your application!

---

## 🔐 Configuration

### Environment Variables (.env)
```env
CLOUDINARY_CLOUD_NAME="dn7ko6gut"
CLOUDINARY_API_KEY="593269931781347"
CLOUDINARY_API_SECRET="ERy5a6JuKOLXXGHl3WHI9TXmLeI"
```

### Utility File
**Location:** `server/utils/cloudinaryUpload.js`

---

## 📚 Available Functions

### 1. Upload Image to Cloudinary
```javascript
const { uploadToCloudinary } = require("../../utils/cloudinaryUpload");

// Upload image
const imageUrl = await uploadToCloudinary(filePath, "folder-name");
// Returns: "https://res.cloudinary.com/dn7ko6gut/image/upload/v123456/school-management-system/folder-name/image.jpg"
```

**Parameters:**
- `filePath` (string) - Local file path from formidable
- `folder` (string) - Cloudinary folder name (e.g., 'school', 'teacher', 'student')

**Features:**
- ✅ Automatically uploads to organized folders: `school-management-system/{folder}`
- ✅ Generates secure signature for upload
- ✅ Automatically deletes local file after successful upload
- ✅ Returns secure HTTPS URL

### 2. Delete Image from Cloudinary
```javascript
const { deleteFromCloudinary } = require("../../utils/cloudinaryUpload");

// Delete by URL
await deleteFromCloudinary("https://res.cloudinary.com/dn7ko6gut/image/upload/v123/school-management-system/school/image.jpg");

// Or delete by public_id
await deleteFromCloudinary("school-management-system/school/image");
```

**Features:**
- ✅ Extracts public_id from full URL automatically
- ✅ Handles errors gracefully
- ✅ Doesn't throw errors (logs instead)

---

## 🎯 Currently Used In

### 1. School Registration & Update
**File:** `server/controller/role/school.controller.js`

```javascript
// Register School
const imageUrl = await uploadToCloudinary(oldPath, "school");
school.school_image = imageUrl;

// Update School
if (files.image) {
    // Delete old image
    await deleteFromCloudinary(school.school_image);
    
    // Upload new image
    const imageUrl = await uploadToCloudinary(filepath, "school");
    school.school_image = imageUrl;
}
```

### 2. Teacher Registration & Update
**File:** `server/controller/role/teacher.controller.js`

```javascript
// Register Teacher
const imageUrl = await uploadToCloudinary(oldPath, "teacher");
teacher.teacher_image = imageUrl;

// Update Teacher
if (files.image) {
    await deleteFromCloudinary(teacher.teacher_image);
    const imageUrl = await uploadToCloudinary(filepath, "teacher");
    teacher.teacher_image = imageUrl;
}
```

---

## 📁 Cloudinary Folder Structure

Images are organized in Cloudinary as:
```
school-management-system/
├── school/          (School logos/images)
├── teacher/         (Teacher photos)
├── students/        (Student photos)
├── uploads/         (General uploads)
└── [custom]/        (Any custom folder you specify)
```

---

## 🚀 How to Use in New Controllers

### Example: Student Admission with Image Upload

```javascript
const formidable = require("formidable");
const { uploadToCloudinary, deleteFromCloudinary } = require("../../utils/cloudinaryUpload");

// CREATE with Image
createStudent: async (req, res) => {
    const form = new formidable.IncomingForm();
    
    form.parse(req, async (err, fields, files) => {
        try {
            // Get local file path from formidable
            const photo = files.photo[0];
            let oldPath = photo.filepath;
            
            // Upload to Cloudinary (folder: 'students')
            const imageUrl = await uploadToCloudinary(oldPath, "students");
            
            // Save to database
            const student = new Student({
                name: fields.name[0],
                photo: imageUrl,  // Save Cloudinary URL
                // ... other fields
            });
            
            await student.save();
            res.status(200).json({ success: true, data: student });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });
}

// UPDATE with Image
updateStudent: async (req, res) => {
    const form = new formidable.IncomingForm();
    
    form.parse(req, async (err, fields, files) => {
        try {
            const student = await Student.findById(req.params.id);
            
            // Update text fields
            student.name = fields.name[0];
            
            // Update image if new one is provided
            if (files.photo) {
                // Delete old image from Cloudinary
                if (student.photo) {
                    await deleteFromCloudinary(student.photo);
                }
                
                // Upload new image
                let filepath = files.photo[0].filepath;
                const imageUrl = await uploadToCloudinary(filepath, "students");
                student.photo = imageUrl;
            }
            
            await student.save();
            res.status(200).json({ success: true, data: student });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });
}

// DELETE with Image
deleteStudent: async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        
        // Delete image from Cloudinary
        if (student.photo) {
            await deleteFromCloudinary(student.photo);
        }
        
        // Delete from database
        await student.deleteOne();
        res.status(200).json({ success: true, message: "Student deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}
```

---

## 🔄 Complete Flow

### Upload Flow:
1. Frontend sends form with image file
2. Formidable saves file temporarily to local disk
3. `uploadToCloudinary()` uploads file to Cloudinary
4. Cloudinary returns secure URL
5. Local temp file is automatically deleted
6. URL is saved to MongoDB
7. Frontend displays image using Cloudinary URL

### Delete Flow:
1. Get image URL from database
2. `deleteFromCloudinary()` extracts public_id
3. Sends delete request to Cloudinary API
4. Image is removed from Cloudinary
5. URL can be removed from database

---

## ⚠️ Important Notes

### 1. Local Files are Auto-Cleaned
The utility automatically deletes local temporary files after:
- ✅ Successful upload to Cloudinary
- ✅ Failed upload (error case)
- ✅ Any exception during upload

### 2. Error Handling
```javascript
try {
    const imageUrl = await uploadToCloudinary(filePath, "folder");
    // Save to database
} catch (error) {
    // Local file is already deleted by uploadToCloudinary
    console.error("Upload failed:", error.message);
    res.status(500).json({ success: false, message: "Image upload failed" });
}
```

### 3. URL Format
Cloudinary URLs look like:
```
https://res.cloudinary.com/dn7ko6gut/image/upload/v1234567890/school-management-system/students/xyz123.jpg
```

### 4. Security
- ✅ Uses signed uploads (signature required)
- ✅ API Secret never exposed to client
- ✅ Secure HTTPS URLs
- ✅ Organized folder structure

---

## 📝 Folder Name Recommendations

| Module | Folder Name | Usage |
|--------|-------------|-------|
| School | `school` | School logos, building images |
| Teacher | `teacher` | Teacher profile photos |
| Student | `students` | Student profile photos |
| Library | `library` | Book cover images |
| Notice | `notices` | Notice attachments |
| Events | `events` | Event posters |
| Documents | `documents` | PDF uploads (if needed) |
| General | `uploads` | Miscellaneous files |

---

## 🎨 Frontend Display

Once you have the Cloudinary URL in your database, display it like any other image:

```jsx
// React Component
<img 
    src={student.photo} 
    alt={student.name}
    style={{ width: 100, height: 100, objectFit: 'cover' }}
/>

// Or with Material-UI Avatar
<Avatar 
    src={student.photo} 
    alt={student.name}
    sx={{ width: 100, height: 100 }}
/>
```

---

## 🔧 Troubleshooting

### Issue: Upload fails
**Solution:** Check that environment variables are set in `.env`:
```env
CLOUDINARY_CLOUD_NAME="dn7ko6gut"
CLOUDINARY_API_KEY="593269931781347"
CLOUDINARY_API_SECRET="ERy5a6JuKOLXXGHl3WHI9TXmLeI"
```

### Issue: Image not deleting
**Solution:** Check if URL format is correct. The utility can handle both:
- Full URL: `https://res.cloudinary.com/.../image.jpg`
- Public ID: `school-management-system/folder/image`

### Issue: Local files not cleaning up
**Solution:** The utility handles this automatically. If you see leftover files, they may be from failed operations before the utility ran.

---

## ✅ Summary

Your Cloudinary setup is **complete and production-ready**! 

**Current Features:**
✅ School image upload/update
✅ Teacher image upload/update  
✅ Automatic file cleanup
✅ Secure signed uploads
✅ Organized folder structure
✅ Error handling

**Ready to Use For:**
- Student photos
- Library book covers
- Event images
- Notice attachments
- Any other image uploads

Just use the same pattern shown in the examples above! 🚀
