// import axios from "axios";
// import dotenv from "dotenv";

// dotenv.config();

// const consumerKey = process.env.PESAPAL_CONSUMER_KEY;
// const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;

// const getAccessToken = async (req, res) => {
//   try {

//     const encodedCredentials = Buffer.from(
//       `${consumerKey}:${consumerSecret}`
//     ).toString("base64");

//     const response = await axios.post(
//       "https://cybqa.pesapal.com/pesapalv3/api/Auth/RequestToken",
//       {},
//       {
//         headers: {
//           "Content-Type": "application/json",
//           Accept: "application/json",
//           Authorization: `Basic ${encodedCredentials}`,
//         },
//       }
//     );

//     const token = response.data.token;

//     console.log("Access Token:", token);

//     res.json({
//       success: true,
//       token,
//     });

//   } catch (error) {
//     console.error(
//       "PesaPal token error:",
//       error.response?.data || error.message
//     );

//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch token",
//     });
//   }
// };

// export default getAccessToken;


import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const consumerKey = process.env.PESAPAL_CONSUMER_KEY;
// console.log("consumerKey" ,consumerKey)
const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;
// console.log("consumer secret",consumerSecret)
const url = process.env.PESAPAL_AUTH_URL;
const ipnurl = process.env.PESAPAL_DEMO_URL;


const getAccessToken = async (req, res) => {
	console.log("Token has been requested");
	try {
	  const headers = {
		"Content-Type": "application/json",
		Accept: "application/json",
	  };
	  const body = {
		consumer_key: consumerKey,
		consumer_secret: consumerSecret,
	  };
  
	  //handle request
	  const response = await axios.post(url, body, { headers });
  
	  const accessToken = response.data.token;
	  console.log("Here is your token",response.data.token);
	  return response.data.token;
	} catch (error) {
	  console.log("error ocurred while getting token", error);
	}
  };
  export default getAccessToken
