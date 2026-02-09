import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const consumerKey = process.env.PESAPAL_CONSUMER_KEY;
const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;

const getAccessToken = async (req, res) => {
  try {

    const encodedCredentials = Buffer.from(
      `${consumerKey}:${consumerSecret}`
    ).toString("base64");

    const response = await axios.post(
      "https://cybqa.pesapal.com/pesapalv3/api/Auth/RequestToken",
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Basic ${encodedCredentials}`,
        },
      }
    );

    const token = response.data.token;

    console.log("Access Token:", token);

    res.json({
      success: true,
      token,
    });

  } catch (error) {
    console.error(
      "PesaPal token error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch token",
    });
  }
};

export default getAccessToken;
