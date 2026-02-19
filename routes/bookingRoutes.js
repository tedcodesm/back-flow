import express from "express";
import Booking from "../models/Booking.js";
import Property from "../models/Property.js";
import { protect } from "../middleware/authMiddleware.js";
import nodeMailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const emailpass = process.env.EMAIL_PASSWORD;
const verifyemail = process.env.VERIFY_EMAIL;

const sendBookingStatusEmail = async ({
  email,
  username,
  status,
  propertyTitle,
  viewingDate,
  time,
}) => {
  try {
    const transporter = nodeMailer.createTransport({
      service: "gmail",
      port: 465,
      secure: true,
      auth: {
        user: verifyemail,
        pass: emailpass,
      },
    });

    await transporter.verify();

    const isConfirmed = status === "confirmed";

    const message = `
      <h2>Hello ${username},</h2>
      
      ${
        isConfirmed
          ? `<p>Great news! 🎉 Your booking request for <b>${propertyTitle}</b> has been <b style="color:green;">CONFIRMED</b>.</p>`
          : `<p>We’re sorry. Your booking request for <b>${propertyTitle}</b> has been <b style="color:red;">REJECTED</b>.</p>`
      }

      <p><strong>Viewing Date:</strong> ${viewingDate}</p>
      <p><strong>Time:</strong> ${time}</p>

      ${
        isConfirmed
          ? `<p>Please arrive on time. We look forward to seeing you.</p>`
          : `<p>You may explore other available properties in the app.</p>`
      }

      <br/>
      <p>Best regards,<br/>Estate Flow Team</p>
    `;

    await transporter.sendMail({
      from: verifyemail,
      to: email,
      subject: `Booking ${isConfirmed ? "Confirmed" : "Rejected"}`,
      html: message,
    });
  } catch (error) {
    console.error(error);
    throw new Error("Error sending booking status email");
  }
};



router.post("/", protect, async (req, res) => {
  try {
    const { propertyId, viewingDate, time, message } = req.body;

    if (!propertyId || !viewingDate || !time) {
      return res.status(400).json({ message: "Property, date and time are required" });
    }

    const [hours, minutes] = time.split(":").map(Number);
    const bookingDateTime = new Date(viewingDate);
    bookingDateTime.setHours(hours, minutes, 0, 0);

    const hour = bookingDateTime.getHours();
    if (hour < 8 || hour >= 16) {
      return res.status(400).json({ message: "Viewing can only be booked between 08:00am and 16:00" });
    }

    const existingBooking = await Booking.findOne({
      property: propertyId,
      viewingDate: bookingDateTime,
      status: { $in: ["pending", "confirmed"] },
    });

    if (existingBooking) {
      return res.status(400).json({ message: "This date and time is already booked. Please choose another time." });
    }

    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: "Property not found" });

    const booking = await Booking.create({
      tenant: req.user._id,
      landlord: property.landlord,
      property: propertyId,
      viewingDate: bookingDateTime,
      message,
      time,
      status: "pending",
    });

    res.status(201).json(booking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});



router.get("/landlord", protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ landlord: req.user._id })
      .populate("tenant", "username phone email")
      .populate("property", "title price address");

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get("/my-bookings", protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ tenant: req.user._id })
      .populate("property", "title price address")
      .populate("landlord", "username phone email");

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/:id/confirm", protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("tenant", "email username")
      .populate("property", "title");

    if (!booking)
      return res.status(404).json({ message: "Booking not found" });

    if (booking.landlord.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    booking.status = "confirmed";
    await booking.save();

    await sendBookingStatusEmail({
      email: booking.tenant.email,
      username: booking.tenant.username,
      status: "confirmed",
      propertyTitle: booking.property.title,
      viewingDate: booking.viewingDate,
      time: booking.time,
    });

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});




router.put("/:id/reject", protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("tenant", "email username")
      .populate("property", "title");

    if (!booking)
      return res.status(404).json({ message: "Booking not found" });

    if (booking.landlord.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    booking.status = "rejected";
    await booking.save();

    await sendBookingStatusEmail({
      email: booking.tenant.email,
      username: booking.tenant.username,
      status: "rejected",
      propertyTitle: booking.property.title,
      viewingDate: booking.viewingDate,
      time: booking.time,
    });

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


export default router;
