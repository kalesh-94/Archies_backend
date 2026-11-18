import { v2 as cloudinary } from 'cloudinary';

// Configured lazily: server.js calls dotenv.config() after all imports are
// evaluated, so process.env is not populated yet when this module loads.
let configured = null;

// Accepts either CLOUDINARY_URL (cloudinary://key:secret@cloud_name, read by
// the SDK automatically) or the three separate CLOUDINARY_* variables.
export const isCloudinaryConfigured = () => {
    if (configured !== null) return configured;

    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

    if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
        cloudinary.config({
            cloud_name: CLOUDINARY_CLOUD_NAME,
            api_key: CLOUDINARY_API_KEY,
            api_secret: CLOUDINARY_API_SECRET,
            secure: true
        });
    } else if (process.env.CLOUDINARY_URL) {
        cloudinary.config(true);
        cloudinary.config({ secure: true });
    }

    const { cloud_name, api_key, api_secret } = cloudinary.config();
    configured = Boolean(cloud_name && api_key && api_secret);

    if (!configured) {
        console.warn(
            '[upload] Cloudinary is not configured - files will be saved to the local uploads/ folder. ' +
            'Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET for persistent storage.'
        );
    }

    return configured;
};

export default cloudinary;
