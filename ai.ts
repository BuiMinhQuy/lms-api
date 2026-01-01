import express from "express";
export const app = express();
require("dotenv").config();
const axios = require("axios"); // Import Axios library
require("dotenv").config();

const API_URL =
  "https://api-inference.huggingface.co/models/google/gemma-2-2b-it";
const API_TOKEN = process.env.HUGGING_FACE_API_TOKEN; // Đặt token Hugging Face của bạn ở đây
async function query(data: any) {
  try {
    const response = await axios.post(API_URL, data, {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error: any) {
    console.error(
      "Error querying Hugging Face API:",
      error.response?.data || error.message
    );
  }
}

// Thực hiện truy vấn
query({ inputs: "Give me 3 question for travel in itels speaking test" })
  .then((response) => {
    console.log("Hugging Face Response:", JSON.stringify(response, null, 2));
  })
  .catch((error) => {
    console.error("Error in query execution:", error.message);
  });

// todo: create server

// app.listen(process.env.PORT, ()=>{
//     console.log(`Server is running on port ${process.env.PORT}`);

// })
