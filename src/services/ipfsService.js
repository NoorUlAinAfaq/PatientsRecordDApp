// ipfsService.js
import axios from "axios";

const PINATA_API_KEY = "ff7f3d0b28ecbd4ea94d";
const PINATA_SECRET_API_KEY = "01e51da7b9f20b48aa7944f2843a038a7da409d6c6a2a1f6542680b8d72351c5";
const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

// Upload JSON data to IPFS
const uploadJSONToIPFS = async (data) => {
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
    console.error("Error uploading JSON to Pinata:", err.response?.data || err);
    throw err;
  }
};

// Upload file/blob to IPFS
const uploadFileToIPFS = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const metadata = JSON.stringify({
      name: file.name || "unnamed_file",
    });
    formData.append("pinataMetadata", metadata);

    const options = JSON.stringify({
      cidVersion: 0,
    });
    formData.append("pinataOptions", options);

    const res = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        maxBodyLength: "Infinity",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_API_KEY,
        },
      }
    );

    return res.data.IpfsHash;
  } catch (err) {
    console.error("Error uploading file to Pinata:", err.response?.data || err);
    throw err;
  }
};

// Smart wrapper: handles JSON objects OR File/Blob
export const uploadToIPFS = async (input) => {
  if (input instanceof File || input instanceof Blob) {
    return await uploadFileToIPFS(input);
  } else if (typeof input === "object") {
    return await uploadJSONToIPFS(input);
  } else {
    throw new Error("Unsupported type for IPFS upload");
  }
};

// Get data from IPFS
export const getFromIPFS = async (cid) => {
  try {
    const res = await axios.get(`${PINATA_GATEWAY}${cid}`);
    return res.data;
  } catch (err) {
    console.error("Error fetching from Pinata:", err);
    throw err;
  }
};

// Get file URL from IPFS
export const getFileURLFromIPFS = (cid) => {
  return `${PINATA_GATEWAY}${cid}`;
};
