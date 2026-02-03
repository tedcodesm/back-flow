import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import dotenv from "dotenv";
import nodeMailer from "nodemailer";

dotenv.config();

const router = express.Router();
router.use(express.json());
router.use(express.urlencoded({ extended: true }));


const authtoken = process.env.JWT_SECRET;
const emailpass = process.env.EMAIL_PASSWORD;
const verifyemail = process.env.VERIFY_EMAIL;
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, authtoken, { expiresIn: "30d" });
};

const sendVerificationEmail = async (otp, email, username) => {
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

    const message = `<h1>Hello ${username} thank you for creating an account!</h1>
      <p>Your verification code is <b>${otp}</b> and it expires in 2 minutes.</p>
      <p>Please enter this code in the app to verify your email address.</p>
      <p>If you did not request this, please ignore this email.</p>
      <br/>
      <p>Best regards,<br/>Estate flow Team</p>`;

    await transporter.sendMail({
      from: verifyemail,
      to: email,
      subject: "Email Verification",
      html: message,
    });
  } catch (error) {
    console.error(error);
    throw new Error("Error sending verification email");
  }
};


router.post("/register", async (req, res) => {
  try {
    const { email, username, phone, password,role } = req.body;
    if (!email || !username || !phone || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const newUser = new User({ email, username, phone, password,role,otp });
    await newUser.save();
    await sendVerificationEmail(newUser.otp, email, username);
    const token = generateToken(newUser._id);
    return res.status(201).json({ message: "User registered successfully", token });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/verify", async (req, res) => {
  try {
    const { otp, email } = req.body;
    if (!otp || !email) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "User does not exist" });
    }
    if (user.otp !== otp) {
      return res.status(402).json({ message: "Invalid OTP" });
    }

    user.Verified = true;
    user.otp = "";
    await user.save();

    res.status(200).json({ message: "User verified successfully" });
  } catch (error) {
    console.error("Error in verify route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "User does not exist" });
    if (!user.Verified)
      return res.status(403).json({
        message: "Please verify your email before logging in",
      });

    const isMatch = await user.matchPassword(password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken(user._id);

    const userData = user.toObject();
    delete userData.password;

    res.status(200).json({
      token,
      user: userData,
    });
  } catch (error) {
    console.error("Error in login route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


export default router;
