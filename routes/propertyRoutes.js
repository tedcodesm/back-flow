import express from "express";
import Property from "../models/Property.js";
import { protect } from "../middleware/authMiddleware.js";
import cloudinary from "../lib/cloudinary.js";
import upload from "../middleware/multer.js";

const router = express.Router();

router.post("/",protect, upload.array("images", 10), async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      address,
      size,
      amenities,
      propertytype,
      coordinates,
    } = req.body;

    if (
      !title ||
      !description ||
      !price ||
      !address ||
      !size ||
      !coordinates ||
      !propertytype
    ) {
      return res.status(400).json({
        message: "All required fields must be provided",
      });
    }

    let imageUrls = [];

    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map((file) =>
        cloudinary.uploader.upload(file.path, {
          folder: "properties",
        }),
      );

      const uploadResponses = await Promise.all(uploadPromises);

      imageUrls = uploadResponses.map((response) => response.secure_url);
    }

    const property = new Property({
      title,
      description,
      price,
      address,
      size,
      amenities: amenities || [],
      coordinates: JSON.parse(coordinates),
      propertytype,
      landlord: req.user._id,
      available: true,
      images: imageUrls,
    });

    await property.save();

    res.status(201).json({
      message: "Property created successfully",
      property,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating property",
      error: error.message,
    });
  }
});

// get property by id
router.get("/:id", async (req, res) => {
  try { 
    const property = await Property.findById(req.params.id).populate(
      "landlord",
      "name email"
    );

    if (!property) {
      return res.status(404).json({
        message: "Property not found",
      });
    }
    

    res.json(property);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching property",
      error: error.message,
    });
  }
});

// get all properties
router.get("/", async (req, res) => {
  try {
    const properties = await Property.find().populate(
      "landlord",
      "name email"
    );
    res.json(properties);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching properties",
      error: error.message,
    });
  }
});

// update property
router.put("/:id", protect, upload.array("images", 10), async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({
        message: "Property not found",
      });
    }
    if (property.landlord.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Unauthorized",
      });
    }
    const {
      title,
      description,
      price,
      address,
      size,
      amenities,
      propertytype,
      coordinates,
    } = req.body;
    
    const updatedProperty = await Property.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        price,
        address,
        size,
        amenities: amenities || [],
        propertytype,
        coordinates: JSON.parse(coordinates),
      },
      { new: true }
    );

    res.json(updatedProperty);
  } catch (error) {
    res.status(500).json({
      message: "Error updating property",
      error: error.message,
    });
  }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({
        message: "Property not found",
      });
    }
    if (property.landlord.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Unauthorized",
      });
    }
    await property.remove();
    res.json({
      message: "Property deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting property",
      error: error.message,
    });
  }
});

export default router;
