// Extend the Window interface to include cvLoaded
interface Window {
  cvLoaded: boolean;
}

// Wait for OpenCV to be loaded before accessing `cv`
if (window.cvLoaded) {
  let video = document.getElementById('video') as HTMLVideoElement;
  let canvas = document.getElementById('canvas') as HTMLCanvasElement;
  let context = canvas.getContext('2d');

  // Set up OpenCV and load the face and eyes classifiers
  let faceCascade = new cv.CascadeClassifier();
  let eyeCascade = new cv.CascadeClassifier();

  // Load the pre-trained Haar cascades for face and eye detection
  faceCascade.load('haarcascade_frontalface_default.xml');
  eyeCascade.load('haarcascade_eye.xml');

  function processVideo() {
    // Capture a frame from the video stream
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
    let src = cv.imread(canvas);  // Read the current frame into OpenCV Mat
    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0); // Convert to grayscale for detection

    // Detect faces
    let faces = new cv.RectVector();
    faceCascade.detectMultiScale(gray, faces, 1.1, 3, 0, new cv.Size(30, 30), new cv.Size());

    // Loop through all detected faces
    for (let i = 0; i < faces.size(); i++) {
      let face = faces.get(i);
      let roiGray = gray.roi(face);

      // Detect eyes within the face region
      let eyes = new cv.RectVector();
      eyeCascade.detectMultiScale(roiGray, eyes, 1.1, 3, 0, new cv.Size(30, 30), new cv.Size());

      // Draw rectangles around the detected eyes
      for (let j = 0; j < eyes.size(); j++) {
        let eye = eyes.get(j);
        let x = face.x + eye.x;
        let y = face.y + eye.y;
        let w = eye.width;
        let h = eye.height;

        // Draw a rectangle around the eyes
        cv.rectangle(src, new cv.Point(x, y), new cv.Point(x + w, y + h), [255, 0, 0, 255], 2);
      }

      // Release resources
      roiGray.delete();
      eyes.delete();
    }

    // Display the processed frame
    cv.imshow(canvas, src);

    // Release memory
    src.delete();
    gray.delete();
    faces.delete();
  }

  // Initialize OpenCV.js and start the video feed
  function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        const videoElement = document.getElementById('video') as HTMLVideoElement;
        videoElement.srcObject = stream;
        videoElement.play();

        // Continuously process frames from the video feed
        setInterval(processVideo, 100); // Process every 100ms
      })
      .catch((err) => {
        console.error("Error accessing the webcam: ", err);
      });
  }

  startVideo();
} else {
  console.error("OpenCV.js is not loaded yet.");
}
