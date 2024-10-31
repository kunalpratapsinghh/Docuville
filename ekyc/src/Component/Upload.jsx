import React, { useState } from "react";
import { Upload, Button, message, Image, Spin, Tooltip } from "antd"; // Import Tooltip from antd
import { UploadOutlined, CloseCircleOutlined } from "@ant-design/icons";
import axios from "axios";
import TableComponent from "./Table";

const DragAndDropUpload = () => {
  // State variables
  const [fileList, setFileList] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [base64String, setBase64String] = useState("");
  const [responseData, setResponseData] = useState({});
  const [loading, setLoading] = useState(false); // Loading state

  // Function to handle file change
  const handleUploadChange = ({ fileList }) => {
    const newFileList = fileList.slice(-1); // Keep only the last file
    setFileList(newFileList);

    if (newFileList.length > 0) {
      const previewUrl = URL.createObjectURL(newFileList[0].originFileObj);
      setImagePreview(previewUrl);

      const reader = new FileReader();
      reader.onload = (e) => {
        setBase64String(e.target.result); // Set base64 string once the file is read
      };
      reader.readAsDataURL(newFileList[0].originFileObj); // Start reading the file
    } else {
      setImagePreview(null);
      setBase64String(""); // Reset base64 string if no file
    }
  };

  // Function to remove the uploaded image
  const removeImage = () => {
    setFileList([]);
    setImagePreview(null);
    setBase64String("");
    setResponseData({});
  };

  // Function to fetch details
  const fetchDetails = async () => {
    if (fileList.length === 0) {
      message.error("Please upload an image first!");
      return;
    }

    setLoading(true); // Set loading to true before fetching
    try {
      const response = await axios.post("http://localhost:8080/base", {
        image: base64String.split(",")[1], // Send the base64 string if needed
      });
      setResponseData(response.data.data);
      message.success("Details fetched successfully!");
      console.log(response.data);
    } catch (error) {
      message.error("Failed to fetch details: " + error.message);
      console.error(error);
    } finally {
      setLoading(false); // Set loading to false after fetching
    }
  };

  return (
    <>
      {loading && <Spin size="large" />}

      <div
        style={{
          padding: "20px",
          display: "flex",
          justifyContent: "space-around",
        }}
      >
        <div className="drag-upload-container">
          {" "}
          {/* Apply the new class */}
          {imagePreview === null && (
            <Upload
              accept="image/*"
              listType="picture"
              fileList={fileList}
              onChange={handleUploadChange}
              beforeUpload={() => false} // Prevent auto upload
            >
              <Button icon={<UploadOutlined />} className="upload-button">
                click to upload
              </Button>
            </Upload>
          )}
          {imagePreview && (
            <div className="image-preview">
              <Image width={300} src={imagePreview} alt="Preview" />
              <Tooltip title="Remove image">
                {" "}
                {/* Add tooltip here */}
                <CloseCircleOutlined
                  className="close-icon" // Apply class for close icon
                  onClick={removeImage}
                  style={{ fontSize: "30px", color: "red", cursor: "pointer" }} // Increase size and customize
                />
              </Tooltip>
            </div>
          )}
          {Object.keys(responseData).length == 0 && (
            <Button
              type="primary"
              onClick={fetchDetails}
              className="upload-button" // Use the same button style
              style={{ marginTop: "10px" }}
            >
              Fetch Details
            </Button>
          )}
        </div>
        <div className="table-container">
          {Object.keys(responseData).length > 0 && (
            <TableComponent data={responseData} />
          )}
        </div>
      </div>
    </>
  );
};

export default DragAndDropUpload;
