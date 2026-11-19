// import multer from 'multer';
// import path from 'path';

// // Storage configuration
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, 'uploads/');
//     },
//     filename: (req, file, cb) => {
//         cb(null, Date.now() + path.extname(file.originalname));
//     }
// });

// // File filter (Photos aur Videos dono ke liye)
// const fileFilter = (req, file, cb) => {
//     if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
//         cb(null, true);
//     } else {
//         cb(new Error('Sirf images aur videos allowed hain!'), false);
//     }
// };

// const upload = multer({ 
//     storage: storage,
//     limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
//     fileFilter: fileFilter
// });

// export default upload; 

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cloudinary, { isCloudinaryConfigured } from '../config/cloudinary.js';

// Create uploads folder if it doesn't exist
const uploadPath = path.resolve(process.cwd(), 'uploads');

if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },

    filename: (req, file, cb) => {
        const uniqueName = Date.now() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    if (
        file.mimetype.startsWith('image/') ||
        file.mimetype.startsWith('video/')
    ) {
        cb(null, true);
    } else {
        cb(new Error('Only images and videos are allowed!'));
    }
};

const upload = multer({
    storage,
    limits: {
        fileSize: 100 * 1024 * 1024
    },
    fileFilter
});

export default upload;

// Collect files from upload.single() (req.file) and upload.fields()/array() (req.files)
const collectFiles = (req) => {
    if (req.file) return [req.file];
    if (Array.isArray(req.files)) return req.files;
    if (req.files && typeof req.files === 'object') return Object.values(req.files).flat();
    return [];
};

const removeTempFile = (file) =>
    fs.promises.unlink(file.path).catch(() => { /* already gone */ });

// Render sets RENDER=true; its local disk is wiped on every restart/redeploy
const isEphemeralHost = () => process.env.RENDER === 'true';

// Where uploaded files currently go (used by GET /api/health)
export const getStorageMode = () => (isCloudinaryConfigured() ? 'cloudinary' : 'local');

/**
 * Runs after multer. When Cloudinary is configured, moves each uploaded file
 * from the local temp folder to Cloudinary and stores its public HTTPS URL on
 * file.cloudinaryUrl. Hosts like Render wipe the local disk on every restart,
 * so files kept only in uploads/ disappear and the website shows broken images.
 *
 * Without Cloudinary credentials (e.g. local development) the file simply stays
 * in uploads/ and is served by express.static, exactly as before.
 *
 * On Render without Cloudinary the upload is rejected: the file would be deleted
 * on the next restart and the website would show "Image Not Found". Set
 * ALLOW_LOCAL_UPLOADS=true to accept temporary local uploads anyway.
 */
export const persistUploads = (folder) => async (req, res, next) => {
    const files = collectFiles(req);
    if (files.length === 0) return next();

    if (!isCloudinaryConfigured()) {
        if (isEphemeralHost() && process.env.ALLOW_LOCAL_UPLOADS !== 'true') {
            await Promise.all(files.map(removeTempFile));
            return res.status(503).json({
                success: false,
                message: 'Image storage is not configured on the server. Add CLOUDINARY_CLOUD_NAME, ' +
                    'CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in the Render environment settings, ' +
                    'otherwise uploaded images are deleted when the server restarts.'
            });
        }
        return next();
    }

    try {
        await Promise.all(files.map(async (file) => {
            const result = await cloudinary.uploader.upload(file.path, {
                folder: `archies/${folder}`,
                resource_type: 'auto'
            });
            file.cloudinaryUrl = result.secure_url;
        }));
    } catch (error) {
        console.error('Cloudinary upload failed:', error);
        return res.status(502).json({
            success: false,
            message: `Image upload failed: ${error.message || 'Cloudinary error'}`
        });
    } finally {
        // The temp copy is never needed once Cloudinary is in use (success or failure)
        await Promise.all(files.map(removeTempFile));
    }

    next();
};

// Value to save in MongoDB for an uploaded file: the full Cloudinary URL, or the
// local filename (served from /uploads) when Cloudinary is not configured.
export const getStoredFileValue = (file) => file?.cloudinaryUrl || file?.filename || '';

/**
 * Turns a stored file value into something the frontend can render directly.
 * - Full URLs and local filenames ("1715000000000.jpg") are returned unchanged.
 * - Older testimonial/fashion-show records saved the server's disk path
 *   ("/opt/render/project/src/uploads/1715000000000.png"); only the filename is kept.
 * - Older records that saved a bare Cloudinary public_id ("packages/xp41kljg...")
 *   are turned into the full Cloudinary URL.
 */
export const toPublicFileUrl = (value, resourceType = 'image') => {
    if (!value || typeof value !== 'string' || /^https?:\/\//i.test(value)) return value;

    const diskPath = value.replace(/\\/g, '/').match(/(?:^|\/)uploads\/([^/]+)$/);
    if (diskPath) return diskPath[1];

    const looksLikeCloudinaryId = value.includes('/') && !path.extname(value);
    if (looksLikeCloudinaryId && isCloudinaryConfigured()) {
        return cloudinary.url(value, { secure: true, resource_type: resourceType, urlAnalytics: false });
    }

    return value;
};

// Returns a plain copy of a Mongoose document with the given file fields made renderable
export const withPublicFiles = (doc, fields) => {
    if (!doc) return doc;
    const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
    for (const field of fields) obj[field] = toPublicFileUrl(obj[field]);
    return obj;
};