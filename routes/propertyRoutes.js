import express from "express";
import Property from "../models/Property.js";
import { protect } from "../middleware/authMiddleware.js";
import cloudinary from "../lib/cloudinary.js";
import upload from "../middleware/multer.js";

const router = express.Router();

router.post("/", protect, upload.array("images", 10), async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      address,
      size,
      amenities,
      propertytype,
      category,
      coordinates,
    } = req.body;

    if (
      !title ||
      !description ||
      !price ||
      !address ||
      !size ||
      !coordinates ||
      !category ||
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
      category,
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


router.get("/nearby", async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    const radius = 0.05;

    const properties = await Property.find({
      "coordinates.lat": {
        $gte: lat - radius,
        $lte: lat + radius,
      },
      "coordinates.lng": {
        $gte: lng - radius,
        $lte: lng + radius,
      },
    }).populate("landlord", "username email phone");

    res.json(properties);

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error fetching nearby properties",
    });
  }
});


// get property by id
router.get("/:id", async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).populate(
      "landlord",
      "username email phone",
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
    const properties = await Property.find().populate("landlord", "username phone email").sort({ createdAt: -1 });
    res.json(properties);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching properties",
      error: error.message,
    });
  }
});
// GET all properties of logged-in landlord
router.get("/landlord/myproperty", protect, async (req, res) => {
  try {
    const properties = await Property.find({
      landlord: req.user._id, 
    })
      .populate("landlord", "username email phone")
      .sort({ createdAt: -1 });

    res.json(properties);
    console.log(properties);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching landlord properties",
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
      category,
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
        category,
        coordinates: JSON.parse(coordinates),
      },
      { new: true },
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
