import axios from "axios";


const PINATA_API_KEY = "a2953bccc64721478c37";
const PINATA_SECRET_API_KEY = "fb3d3094644da3ebc694d85012f638c53a064ef72811ebf8042de50b69c98054";



const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs/";




export const uploadToIPFS = async (data) => {
  try {
    const res = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      data,
      {
        headers: {
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_API_KEY,
        },
      }
    );
    return res.data.IpfsHash;
  } catch (err) {
    console.error("Error uploading to Pinata:", err.response?.data || err);
    throw err;
  }
};
// Get JSON back from IPFS
export const getFromIPFS = async (cid) => {
  try {
    const res = await axios.get(`https://gateway.pinata.cloud/ipfs/${cid}`);
    return res.data;
  } catch (err) {
    console.error("Error fetching from Pinata:", err);
    throw err;
  }
};