import React, { useState } from 'react';
import VideoUploadProcessing from './VideoUploadProcessing';
import Webcam from './Webcam';

const WebcamVideoSelector: React.FC = () => {
  const [selectedComponent, setSelectedComponent] = useState<string>('');

  return (
    <div>
      {!selectedComponent && (
        <div>
          <button onClick={() => setSelectedComponent('webcam')}>Webcam</button>
          <button onClick={() => setSelectedComponent('video')}>Video</button>
        </div>
      )}

      {selectedComponent === 'webcam' && <Webcam />}
      {selectedComponent === 'video' && <VideoUploadProcessing />}
    </div>
  );
};

export default WebcamVideoSelector;
