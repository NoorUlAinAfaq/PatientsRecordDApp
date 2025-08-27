// Import axios library for making HTTP requests
import axios from "axios";

// 🚨 NOTE FOR STUDENTS: 
// Normally, API keys should NOT be exposed in frontend code. 
// They should be kept safe on the backend. 
// Here we use them directly only for learning/demo purposes.

// Pinata API Keys (used to connect with Pinata service for IPFS storage)
const PINATA_API_KEY = "a2953bccc64721478c37";
const PINATA_SECRET_API_KEY = "fb3d3094644da3ebc694d85012f638c53a064ef72811ebf8042de50b69c98054";

// Pinata Gateway URL – used to retrieve files from IPFS
const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

// 📌 Function to upload JSON data to IPFS via Pinata
export const uploadToIPFS = async (data) => {
  try {
    // Make a POST request to Pinata API to store the JSON object on IPFS
    const res = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      data, // JSON object to upload
      {
        headers: {
          pinata_api_key: PINATA_API_KEY, // Authentication with Pinata
          pinata_secret_api_key: PINATA_SECRET_API_KEY,
        },
      }
    );

    // Pinata returns an IPFS hash (CID) which uniquely identifies the stored file
    return res.data.IpfsHash;
  } catch (err) {
    // If there’s an error, log it for debugging
    console.error("Error uploading to Pinata:", err.response?.data || err);
    throw err;
  }
};

// 📌 Function to fetch JSON data back from IPFS using its CID (Content Identifier)
export const getFromIPFS = async (cid) => {
  try {
    // Retrieve data from Pinata’s IPFS gateway using the CID
    const res = await axios.get(`https://gateway.pinata.cloud/ipfs/${cid}`);
    return res.data; // Return the stored JSON
  } catch (err) {
    // If retrieval fails, log the error
    console.error("Error fetching from Pinata:", err);
    throw err;
  }
};
