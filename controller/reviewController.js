import Review from '../models/reviewModel.js';
import { getStoredFileValue, withPublicFiles } from '../middleware/upload.js';

// Image fields returned as URLs/filenames the website can render
const FILE_FIELDS = ['clientPhoto'];

// Add New Review / Testimonial
export const addReview = async (req, res) => {
    try {
        const { clientName, serviceUsed, message, rating } = req.body;
        
        // Agar multer ke zariye photo upload hui hai toh uska path lein
        const clientPhoto = getStoredFileValue(req.file); // pehle server ka disk path save hota tha

        const newReview = new Review({
            clientName,
            serviceUsed,
            message,
            rating: rating ? Number(rating) : 5,
            clientPhoto
        });

        const savedReview = await newReview.save();
        res.status(201).json({
            success: true,
            message: 'Review posted successfully!',
            data: withPublicFiles(savedReview, FILE_FIELDS)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get All Reviews
export const getAllReviews = async (req, res) => {
    try {
        const reviews = await Review.find().sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: reviews.length,
            data: reviews.map((r) => withPublicFiles(r, FILE_FIELDS))
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete Review
export const deleteReview = async (req, res) => {
    try {
        const deletedReview = await Review.findByIdAndDelete(req.params.id);
        if (!deletedReview) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Review deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update Review
export const updateReview = async (req, res) => {
    try {
        const { clientName, serviceUsed, message, rating } = req.body;
        const updateData = { clientName, serviceUsed, message, rating };

        // Agar nayi photo upload ki gayi hai toh use bhi update data me jodein
        if (req.file) {
            updateData.clientPhoto = getStoredFileValue(req.file);
        }

        const updatedReview = await Review.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedReview) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Review updated successfully',
            data: withPublicFiles(updatedReview, FILE_FIELDS)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};