import React, { useState } from "react";
import VideoUploadProcessing from "./VideoUploadProcessing";
import Webcam from "./Webcam";

const WebcamVideoSelector: React.FC = () => {
  const [selectedComponent, setSelectedComponent] = useState<string>("");

  return (
    <div className="bg-ctp-base text-ctp-text text-base rounded-lg">
      {!selectedComponent && (
        <div className="flex font-semibold">
          <button
            className="bg-ctp-pink rounded-md m-4 p-4 text-ctp-base transition-transform transform-gpu 
                    hover:bg-ctp-pink/50 hover:translate-y-1 hover:shadow"
            onClick={() => setSelectedComponent("webcam")}
          >
            Webcam
          </button>
          <button
            className="bg-ctp-pink rounded-md m-4 p-4 text-ctp-base transition-transform transform-gpu 
                    hover:bg-ctp-pink/50 hover:translate-y-1 hover:shadow"
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
