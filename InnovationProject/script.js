const video = document.getElementById("video");

Promise.all([
  faceapi.nets.ssdMobilenetv1.loadFromUri("./models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("./models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("./models"),
]).then(startWebcam);

function startWebcam() {
  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: false,
    })
    .then((stream) => {
      video.srcObject = stream;
    })
    .catch((error) => {
      console.error(error);
    });
}

function getLabeledFaceDescriptions() {
  const labels = ["Mathieu", "Frank", "Alex", "Shayaan"];
  return Promise.all(
    labels.map(async (label) => {
      const descriptions = [];
      for (let i = 1; i <= 2; i++) {
        const img = await faceapi.fetchImage(`./labels/${label}/${i}.png`);
        const detections = await faceapi
          .detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor();
        descriptions.push(detections.descriptor);
      }
      return new faceapi.LabeledFaceDescriptors(label, descriptions);
    })
  );
}

// Define a mapping between labels and URLs
const labelToUrl = {
  "Mathieu": "https://www.example.com/",
  "Frank": "https://www.example.com/",
  "Alex": "https://www.example.com/",
  "Shayaan": "https://www.example.com/",
  "unknown": "https://www.example.com/",
  // Add more mappings as needed
};

video.addEventListener("play", async () => {
  const labeledFaceDescriptors = await getLabeledFaceDescriptions();
  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);

  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);

  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);

  // Add event listener to the canvas to handle clicks on the labels
  canvas.addEventListener("click", (event) => {
    const x = event.offsetX;
    const y = event.offsetY;

    // Iterate through the detected faces and check if the click is within the label area
    results.forEach((result, i) => {
      const box = resizedDetections[i].detection.box;
      const label = result.toString();
      const text = label; // Use the label for now, we'll adjust later
      const name = label.split(" ")[0]; // Extract the name from the label

      // Get the context to measure text width
      const ctx = canvas.getContext("2d");
      const textMetrics = ctx.measureText(text);
      const textWidth = textMetrics.width;
      const textHeight = 14; // Approximate text height

      const labelX = box.x;
      const labelY = box.y + box.height + textHeight; // Position below the box

      // Check if the click coordinates are within the label bounds
      if (x >= labelX && x <= labelX + textWidth && y >= labelY - textHeight && y <= labelY) {
        const url = labelToUrl[name];
        if (url) {
          window.open(url, "_blank"); // Open the URL in a new tab
        } else {
          console.warn(`No URL defined for label: ${name}`);
        }
      }
    });
  });

  let detections; // Declare detections outside the interval for event listener access
  let resizedDetections;
  let results;

  setInterval(async () => {
    detections = await faceapi
      .detectAllFaces(video)
      .withFaceLandmarks()
      .withFaceDescriptors();

    resizedDetections = faceapi.resizeResults(detections, displaySize);

    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

    results = resizedDetections.map((d) => {
      return faceMatcher.findBestMatch(d.descriptor);
    });

    results.forEach((result, i) => {
      const box = resizedDetections[i].detection.box;
      const label = result.toString();

      // Draw the bounding box
      const drawBox = new faceapi.draw.DrawBox(box, { label: "" }); // Don't draw the label in the box
      drawBox.draw(canvas);

      // Draw the label (as a visual cue for the clickable area) below the box
      const ctx = canvas.getContext("2d");
      ctx.font = "14px Arial";
      ctx.fillStyle = "white";
      const text = label;
      const textMetrics = ctx.measureText(text);
      const textWidth = textMetrics.width;
      const textHeight = 14;
      const labelX = box.x;
      const labelY = box.y + box.height + textHeight;

      ctx.fillText(text, labelX, labelY);

      // Optionally, add a visual cue that it's clickable (e.g., underline or different color)
      ctx.strokeStyle = "white";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(labelX, labelY + 2);
      ctx.lineTo(labelX + textWidth, labelY + 2);
      ctx.stroke();
    });
  }, 100);
});