import Course from '../models/courseModel.js';
import { getStoredFileValue, withPublicFiles } from '../middleware/upload.js';

// Image fields returned as URLs/filenames the website can render
const FILE_FIELDS = ['image'];


// Add Course (Image upload ke sath)
export const addCourse = async (req, res) => {
  try {
    const { title, description, duration, price, rating, badge } = req.body;
    const image = getStoredFileValue(req.file); // Cloudinary URL, ya local filename

    const newCourse = await Course.create({
      title,
      description,
      duration,
      price,
      rating,
      badge,
      image
    });

    res.status(201).json({
      success: true,
      message: 'Course added successfully',
      data: withPublicFiles(newCourse, FILE_FIELDS)
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to add course',
      error: error.message
    });
  }
};

// Get All Courses
export const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find({}).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses.map((c) => withPublicFiles(c, FILE_FIELDS))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Update Course (Nayi image ke sath ya bina image ke)
export const updateCourse = async (req, res) => {
  try {
    const { title, description, duration, price, rating, badge } = req.body;
    
    let updateData = { title, description, duration, price, rating, badge };
    if (req.file) {
      updateData.image = getStoredFileValue(req.file);
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedCourse) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      data: withPublicFiles(updatedCourse, FILE_FIELDS)
    });
  } catch (error) {
    res.status(400).json({
      success: formatError(error),
      message: 'Failed to update course',
      error: error.message
    });
  }
};

// Delete Course
export const deleteCourse = async (req, res) => {
  try {
    const deletedCourse = await Course.findByIdAndDelete(req.params.id);

    if (!deletedCourse) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};