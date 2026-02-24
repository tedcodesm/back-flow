// import express from "express";
// import User from "../models/User.js";
// import Message from "../models/message.js";
// import { io, getReceiverSocketId } from "../lib/socket.js";
// import Property from "../models/Property.js";

// const router = express.Router();
// router.use(express.json());
// router.use(express.urlencoded({ extended: true }));

// router.get("/property/:id", async (req, res) => {
//   try {
//     const { propertyId } = req.params;
//     const myId = req.user._id;

//     // 1. Find property
//     const property = await Property.findById(propertyId).populate(
//       "landlord",
//       "-password",
//     );

//     if (!property) {
//       return res.status(404).json({
//         message: "Property not found",
//       });
//     }

//     const landlordId = property.landlord._id;

//     // 2. Find messages between user and landlord
//     const messages = await Message.find({
//       $or: [
//         { sender: myId, recipient: landlordId },
//         { sender: landlordId, recipient: myId },
//       ],
//     }).sort({ createdAt: 1 });

//     // 3. Return landlord info + messages
//     res.json({
//       landlord: property.landlord,
//       messages,
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Error loading chat",
//       error: error.message,
//     });
//   }
// });

// router.get("/:id", async (req, res) => {
//   try {
//     const { id: userToChatId } = req.params;
//     const myId = req.user._id;

//     const recipient = await User.findById(userToChatId);

//     if (!recipient) {
//       return res.status(404).json({
//         message: "User not found",
//       });
//     }

//     if (recipient.role !== "landlord") {
//       return res.status(403).json({
//         message: "You can only chat with landlords",
//       });
//     }

//     const messages = await Message.find({
//       $or: [
//         { sender: myId, recipient: userToChatId },
//         { sender: userToChatId, recipient: myId },
//       ],
//     }).sort({ createdAt: 1 });

//     res.json({ messages });
//   } catch (error) {
//     res.status(500).json({
//       message: "Error fetching messages",
//       error: error.message,
//     });
//   }
// });

// router.post("/send/property/:propertyId", async (req, res) => {
//   try {
//     const { propertyId } = req.params;
//     const senderId = req.user._id;
//     const { content } = req.body;

//     // Find property
//     const property = await Property.findById(propertyId);

//     if (!property) {
//       return res.status(404).json({
//         message: "Property not found",
//       });
//     }

//     const landlordId = property.landlord;

//     // Create message
//     const newMessage = new Message({
//       sender: senderId,
//       recipient: landlordId,
//       content,
//     });

//     await newMessage.save();

//     const receiverSocketId = getReceiverSocketId(landlordId.toString());
//     if (receiverSocketId) {
//       io.to(receiverSocketId).emit("newMessage", newMessage);
//     }

//     res.json({
//       message: "Message sent",
//       newMessage,
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Error sending message",
//       error: error.message,
//     });
//   }
// });

// export default router;
import express from "express";
import Message from "../models/message.js";
import User from "../models/User.js";
import Property from "../models/Property.js";
import { io, getReceiverSocketId } from "../lib/socket.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);


router.get("/users", async (req, res) => {
  try {
    const myId = req.user._id;

    const users = await User.find({
      _id: { $ne: myId },
      role: "landlord",
    }).select("-password");

    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


router.get("/chat/:id", async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { sender: myId, recipient: userToChatId },
        { sender: userToChatId, recipient: myId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/property/:propertyId", async (req, res) => {
  try {
    const { propertyId } = req.params;
    const myId = req.user._id;

    const property = await Property.findById(propertyId).populate(
      "landlord",
      "-password"
    );

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    const landlordId = property.landlord._id;

    const messages = await Message.find({
      $or: [
        { sender: myId, recipient: landlordId },
        { sender: landlordId, recipient: myId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json({
      landlord: property.landlord,
      messages,
    });
  } catch (error) {
    console.error("Error loading property chat:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


router.post("/send/:id", async (req, res) => {
  try {
    const { id: receiverId } = req.params;
    const { content } = req.body;
    const senderId = req.user._id;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Message content required" });
    }

    const newMessage = new Message({
      sender: senderId,
      recipient: receiverId,
      content,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId.toString());

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


router.post("/send/property/:propertyId", async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { content } = req.body;
    const senderId = req.user._id;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Message content required" });
    }

    const property = await Property.findById(propertyId);

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    const landlordId = property.landlord;

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

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error sending property message:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;