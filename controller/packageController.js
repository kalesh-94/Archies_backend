// import Package from '../models/packageModel.js';

// // @desc    Add New Package
// // @route   POST /api/packages/add
// export const addPackage = async (req, res) => {
//     try {
//         const { packageName, category, price, description, packageImage } = req.body;

//         const newPackage = new Package({
//             packageName,
//             category,
//             price,
//             description,
//             packageImage
//         });

//         const savedPackage = await newPackage.save();
//         res.status(201).json({ success: true, message: "Package Added!", data: savedPackage });
//     } catch (error) {
//         res.status(400).json({ success: false, message: error.message });
//     }
// };

// // @desc    Get All Packages
// // @route   GET /api/packages/all
// export const getAllPackages = async (req, res) => {
//     try {
//         const packages = await Package.find().sort({ createdAt: -1 });
//         res.status(200).json({ success: true, count: packages.length, data: packages });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// };

import Package from '../models/packageModel.js';
import { getStoredFileValue, toPublicFileUrl } from '../middleware/upload.js';

// Ensure packageImage is always something the frontend can render
const withPublicImage = (pkg) => {
    if (!pkg) return pkg;
    const obj = typeof pkg.toObject === 'function' ? pkg.toObject() : pkg;
    return { ...obj, packageImage: toPublicFileUrl(obj.packageImage) };
};

// @desc    Add New Package
// @route   POST /api/packages/add
export const addPackage = async (req, res) => {
    try {
        const { packageName, category, price, description } = req.body;

        // Cloudinary par upload hui ho toh poora URL save hoga, warna local filename ("17138...jpg")
        let imagePath = "";
        if (req.file) {
            imagePath = getStoredFileValue(req.file);
        } else if (req.body.packageImage) {
            imagePath = req.body.packageImage;
        }

        const newPackage = new Package({
            packageName,
            category,
            price,
            description,
            packageImage: imagePath
        });

        const savedPackage = await newPackage.save();
        res.status(201).json({ success: true, message: "Package Added Successfully!", data: withPublicImage(savedPackage) });
    } catch (error) {
        console.error("Backend Error:", error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Get All Packages
// @route   GET /api/packages/all
export const getAllPackages = async (req, res) => {
    try {
        const packages = await Package.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: packages.length, data: packages.map(withPublicImage) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// controller/packageController.js

// Update Package
export const updatePackage = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        if (req.file) {
            updateData.packageImage = getStoredFileValue(req.file);
        }
        const updated = await Package.findByIdAndUpdate(id, updateData, { new: true });
        res.status(200).json({ success: true, data: withPublicImage(updated) });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Delete Package
export const deletePackage = async (req, res) => {
    try {
        await Package.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Package Deleted" });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};