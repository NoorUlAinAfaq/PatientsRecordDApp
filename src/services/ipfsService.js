import axios from "axios";

const PINATA_API_KEY = "ff7f3d0b28ecbd4ea94d";
const PINATA_SECRET_API_KEY = "01e51da7b9f20b48aa7944f2843a038a7da409d6c6a2a1f6542680b8d72351c5";

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