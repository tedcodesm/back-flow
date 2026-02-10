import express from "express";
import User from "../models/User.js";
import Message from "../models/message.js";
import { io, getReceiverSocketId } from "../lib/socket.js";

const router = express.Router();
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.get("/property/:id", async (req, res) => {
  try {
    const { propertyId } = req.params;
    const myId = req.user._id;

    // 1. Find property
    const property = await Property.findById(propertyId).populate(
      "landlord",
      "-password",
    );

    if (!property) {
      return res.status(404).json({
        message: "Property not found",
      });
    }

    const landlordId = property.landlord._id;

    // 2. Find messages between user and landlord
    const messages = await Message.find({
      $or: [
        { sender: myId, recipient: landlordId },
        { sender: landlordId, recipient: myId },
      ],
    }).sort({ createdAt: 1 });

    // 3. Return landlord info + messages
    res.json({
      landlord: property.landlord,
      messages,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error loading chat",
      error: error.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const recipient = await User.findById(userToChatId);

    if (!recipient) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (recipient.role !== "landlord") {
      return res.status(403).json({
        message: "You can only chat with landlords",
      });
    }

    const messages = await Message.find({
      $or: [
        { sender: myId, recipient: userToChatId },
        { sender: userToChatId, recipient: myId },
      ],
    }).sort({ createdAt: 1 });

    res.json({ messages });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching messages",
      error: error.message,
    });
  }
});

router.post("/send/property/:propertyId", async (req, res) => {
  try {
    const { propertyId } = req.params;
    const senderId = req.user._id;
    const { content } = req.body;

    // Find property
    const property = await Property.findById(propertyId);

    if (!property) {
      return res.status(404).json({
        message: "Property not found",
      });
    }

    const landlordId = property.landlord;

    // Create message
    const newMessage = new Message({
      sender: senderId,
      recipient: landlordId,
      content,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(landlordId.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.json({
      message: "Message sent",
      newMessage,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error sending message",
      error: error.message,
    });
  }
});

export default router;
