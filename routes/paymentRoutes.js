// import express from "express";
// import axios from "axios";
// import dotenv from "dotenv";

// import Order from "../models/order.js";
// import Property from "../models/Property.js";
// import { protect } from "../middleware/authMiddleware.js";
// import getAccessToken from "../lib/pesapal.js";

// dotenv.config();

// const router = express.Router();

// const baseUrl = process.env.PESAPAL_BASE_URL;
// const frontendUrl = process.env.FRONTEND_URL;

// router.post("/create", protect, async (req, res) => {
//   try {
//     const { propertyId } = req.body;

//     const property = await Property.findById(propertyId);

//     if (!property)
//       return res.status(404).json({ message: "Property not found" });

//     // Check existing order
//     const existingOrder = await Order.findOne({
//       user: req.user._id,
//       property: propertyId,
//       status: { $in: ["pending", "completed"] },
//     });

//     if (existingOrder) {
//       if (existingOrder.status === "completed") {
//         return res.status(400).json({ message: "You already paid for this property" });
//       }
//       if (existingOrder.orderTrackingId) {
//         return res.status(400).json({
//           message: "Payment already in progress",
//           trackingId: existingOrder.orderTrackingId,
//         });
//       }
//     }

//     const token = await getAccessToken();
//     const merchantReference = `PROP-${Date.now()}`;

//     const order = await Order.create({
//       user: req.user._id,
//       property: property._id,
//       amount: property.price,
//       merchantReference,
//     });

//     const orderData = {
//       id: merchantReference,
//       currency: "KES",
//       amount: property.price,
//       description: property.title,
//       callback_url: `${frontendUrl}/payment-success`,
//       billing_address: {
//         email_address: req.user.email,
//         phone_number: req.user.phone || "0700000000",
//         country_code: "KE",
//         first_name: req.user.username,
//       },
//     };

//     let response;
//     try {
//       response = await axios.post(
//         `${baseUrl}/Transactions/SubmitOrderRequest`,
//         orderData,
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//             "Content-Type": "application/json",
//             Accept: "application/json",
//           },
//         }
//       );
//     } catch (error) {
//       console.error("PesaPal SubmitOrderRequest error:", error.response?.data || error.message);
//       return res.status(400).json({
//         message: "PesaPal order creation failed",
//         error: error.response?.data || error.message,
//       });
//     }

//     // Save orderTrackingId after successful response
//     order.orderTrackingId = response.data.order_tracking_id;
//     await order.save();

//     return res.json({
//       redirectUrl: response.data.redirect_url,
//       orderTrackingId: response.data.order_tracking_id,
//     });
//   } catch (error) {
//     console.error("Payment creation failed:", error.response?.data || error.message);
//     return res.status(500).json({ message: "Payment creation failed" });
//   }
// });


// router.get("/verify/:trackingId", protect, async (req, res) => {
//   try {
//     const { trackingId } = req.params;

//     const token = await getAccessToken();

//     const response = await axios.get(
//       `${baseUrl}/Transactions/GetTransactionStatus?orderTrackingId=${trackingId}`,
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       },
//     );

//     const data = response.data;

//     const order = await Order.findOne({
//       orderTrackingId: trackingId,
//     });

//     if (!order)
//       return res.status(404).json({
//         message: "Order not found",
//       });

//     if (data.payment_status_description === "Completed") {
//       order.status = "completed";

//       order.confirmationCode = data.confirmation_code;

//       order.paymentMethod = data.payment_method;

//       order.paidAt = new Date();

//       await order.save();
//       await Property.findByIdAndUpdate(order.property, { available: false });
//     }

//     res.json(data);
//   } catch (error) {
//     console.error(error.response?.data || error.message);

//     res.status(500).json({
//       message: "Verification failed",
//     });
//   }
// });

// router.post("/ipn", async (req, res) => {
//   try {
//     const { OrderTrackingId } = req.body;

//     const token = await getAccessToken();

//     const response = await axios.get(
//       `${baseUrl}/Transactions/GetTransactionStatus?orderTrackingId=${OrderTrackingId}`,
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       },
//     );

//     const data = response.data;

//     const order = await Order.findOne({
//       orderTrackingId: OrderTrackingId,
//     });

//     if (!order) return res.sendStatus(404);

//     if (data.payment_status_description === "Completed") {
//       order.status = "completed";

//       order.confirmationCode = data.confirmation_code;

//       order.paymentMethod = data.payment_method;

//       order.paidAt = new Date();

//       await order.save();
//     }

//     res.sendStatus(200);
//   } catch (error) {
//     console.error(error);

//     res.sendStatus(500);
//   }
// });

// export default router;

import express from "express";
import axios from "axios";
import dotenv from "dotenv";

import Order from "../models/order.js";
import Property from "../models/Property.js";
import { protect } from "../middleware/authMiddleware.js";
import getAccessToken from "../lib/pesapal.js";

dotenv.config();

const router = express.Router();

const baseUrl = process.env.PESAPAL_BASE_URL;
const frontendUrl = process.env.FRONTEND_URL;

// Create PesaPal payment
router.post("/create", protect, async (req, res) => {
  try {
    const { propertyId } = req.body;

    // Get property
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: "Property not found" });

    // Check for existing pending/completed order
    const existingOrder = await Order.findOne({
      user: req.user._id,
      property: propertyId,
      status: { $in: ["pending", "completed"] },
    });

    if (existingOrder) {
      if (existingOrder.status === "completed") {
        return res.status(400).json({ message: "You already paid for this property" });
      }
      if (existingOrder.orderTrackingId) {
        return res.status(400).json({
          message: "Payment already in progress",
          trackingId: existingOrder.orderTrackingId,
        });
      }
    }

    // Get PesaPal access token
    const token = await getAccessToken();
    const merchantReference = `PROP-${Date.now()}`;

    // Create new order in DB
    const order = await Order.create({
      user: req.user._id,
      property: property._id,
      amount: property.price,
      merchantReference,
    });

    // Build PesaPal request without notification_id
    const orderData = {
      id: merchantReference,
      currency: "KES",
      amount: Number(property.price),
      description: property.title,
      callback_url: `${frontendUrl}/payment-success`,
      billing_address: {
        email_address: req.user.email,
        phone_number: req.user.phone || "0700000000",
        country_code: "KE",
        first_name: req.user.username,
      },
    };

    let response;
    try {
      response = await axios.post(
        `${baseUrl}/Transactions/SubmitOrderRequest`,
        orderData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );
    } catch (error) {
      console.error("PesaPal SubmitOrderRequest error:", error.response?.data || error.message);
      return res.status(400).json({
        message: "PesaPal order creation failed",
        error: error.response?.data || error.message,
      });
    }

    // Save orderTrackingId after successful request
    order.orderTrackingId = response.data.order_tracking_id;
    await order.save();

    return res.json({
      redirectUrl: response.data.redirect_url,
      orderTrackingId: response.data.order_tracking_id,
    });
  } catch (error) {
    console.error("Payment creation failed:", error.response?.data || error.message);
    return res.status(500).json({ message: "Payment creation failed" });
  }
});

// Verify payment manually after redirect
router.get("/verify/:trackingId", protect, async (req, res) => {
  try {
    const { trackingId } = req.params;
    const token = await getAccessToken();

    const response = await axios.get(
      `${baseUrl}/Transactions/GetTransactionStatus?orderTrackingId=${trackingId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = response.data;

    const order = await Order.findOne({ orderTrackingId: trackingId });
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (data.payment_status_description === "Completed") {
      order.status = "completed";
      order.confirmationCode = data.confirmation_code;
      order.paymentMethod = data.payment_method;
      order.paidAt = new Date();
      await order.save();

      // Mark property as unavailable
      await Property.findByIdAndUpdate(order.property, { available: false });
    }

    res.json(data);
  } catch (error) {
    console.error("Payment verification failed:", error.response?.data || error.message);
    res.status(500).json({ message: "Payment verification failed" });
  }
});

export default router;
