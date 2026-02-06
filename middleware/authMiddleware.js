import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../models/User.js';
dotenv.config();

export const protect = async (req, res, next) => {
  try {
    console.log("Auth header:", req.headers.authorization);
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token missing" });
    }

    const token = authHeader.split(" ")[1];
    console.log("Token being verified:", token);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded token:", decoded);

    const user = await User.findById(decoded.id).select("-password");
    req.user = user;

    next();
  } catch (error) {
    console.log("Protect middleware error:", error.message);
    res.status(401).json({ message: "Invalid token" });
  }
};
