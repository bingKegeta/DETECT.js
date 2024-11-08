navigator.mediaDevices.getUserMedia({ video: true })
  .then((stream) => {
    const videoElement = document.getElementById('video') as HTMLVideoElement;
    videoElement.srcObject = stream;
    videoElement.play();
  })
  .catch((err) => {
    console.error("Error accessing the webcam: ", err);
  });