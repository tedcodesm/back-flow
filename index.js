import express from "express";
import dotenv from "dotenv";
import connectDB from "./lib/db.js";
import authRoutes from "./routes/authRoutes.js";
import propertyRoutes from "./routes/propertyRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";

dotenv.config();



const app = express();
const port = process.env.PORT || 5000;

app.use(express.json({}));
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/property", propertyRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/booking", bookingRoutes);
connectDB();

app.listen(port, () => {
  console.log(`app running on port ${port}`);
});

