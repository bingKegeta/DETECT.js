import React, { useState } from "react";
import VideoUploadProcessing from "./VideoUploadProcessing";
import Webcam from "./Webcam";

const WebcamVideoSelector: React.FC = () => {
  const [selectedComponent, setSelectedComponent] = useState<string>("");

  return (
    <div className="bg-base-200 text-base-content rounded-lg p-4 shadow-lg h-[66vh] border-4 border-primary">
      {!selectedComponent && (
        <div className="flex font-semibold justify-center space-x-4">
          <button
            className="bg-neutral text-neutral-content rounded-md px-6 py-3 
            border-4 border-primary transition-transform transform-gpu
            hover:bg-primary hover:translate-y-1 hover:text-primary-content
            hover:shadow-lg duration-500"
            onClick={() => setSelectedComponent("webcam")}
          >
            Webcam
          </button>
          <button
            className="bg-neutral text-neutral-content rounded-md px-6 py-3 
            border-4 border-primary transition-transform transform-gpu
            hover:bg-primary hover:translate-y-1 hover:text-primary-content
            hover:shadow-lg duration-500"
            onClick={() => setSelectedComponent("video")}
          >
            Video
          </button>
        </div>
      )}

      {selectedComponent === "webcam" && <Webcam />}
      {selectedComponent === "video" && <VideoUploadProcessing />}
    </div>
  );
};

export default WebcamVideoSelector;
