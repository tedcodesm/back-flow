import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { protect } from '../middleware/authMiddleware.js';
import getAccessToken from '../lib/pesapal.js';


dotenv.config();

router.get("/status", async (req, res) => {
    const { trackingId } = req.query;

    if (!trackingId) {
        return res.status(400).json({ message: "Tracking ID is required" });
    }
    // Simulate payment status retrieval
    try {
        const accessTokenResponse = await getAccessToken(req, res);
        if (!accessTokenResponse.success) {
            return res.status(500).json({ message: "Failed to get access token" });
        }
        const response = await axios.get(
            `https://cybqa.pesapal.com/pesapalv3/api/Transactions/GetTransactionStatus?trackingId=${trackingId}`,
            {
                headers: {
                    Authorization: `Bearer ${accessTokenResponse.token}`,
                },
            }
        );
        const paymentStatus = response.data;
        return res.status(200).json({ 
            trackingId: paymentStatus.trackingId,
            merchant
         });

        res.json(response.data);
    } catch (error) {
        console.error("Error fetching payment status:", error);
        res.status(500).json({ message: "Failed to fetch payment status" });
    }
});