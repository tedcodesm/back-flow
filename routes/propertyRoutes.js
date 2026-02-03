import express from "express";
import Property from "../models/Property.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(express.json());
router.use(express.urlencoded({ extended: true }));


router.post("/", async (req, res) => {
    try {
      const { title,description,price,address ,images} = req.body;
      if (!title || !description || !price || !address ) {
        return res.status(400).json({ message: "All fields are required" });
      } 

      const property = new Property({
        title,
        description,
        price,
        address,
        landlord: req.user._id,
        available: true,
        images: images || []
      });

      await property.save();
      res.status(201).json({ message: "Property created successfully", property });
    } catch (error) {
        res.status(500).json({ message: "Error creating property", error: error.message });
    }

});

export default router;