const video = document.getElementById("video");

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {

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

  async function getLabeledFaceDescriptionsFromSupabase() {
    let data = [];
    let error = null;
    try {
      const response = await fetch("api/persons/name_images");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      data = await response.json();
      if (!Array.isArray(data)) {
        data = [];
      }
    } catch (err) {
      error = err;
      console.error("Erreur lors de la récupération des données:", error);
      return [];
    }

    const labeledFaceDescriptors = [];

    for (const person of data) {
      const { nom, photo1_url, photo2_url } = person;
      const descriptions = [];

      // Fetch both images and compute face descriptors
      const imageUrls = [photo1_url, photo2_url].filter(Boolean);

      for (const url of imageUrls) {
      try {
        const img = await faceapi.fetchImage(url);
        const detection = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();
        if (detection && detection.descriptor) {
        descriptions.push(detection.descriptor);
        }
      } catch (err) {
        console.error(`Error processing image for ${nom}:`, err);
      }
      }

      if (descriptions.length > 0) {
      labeledFaceDescriptors.push(
        new faceapi.LabeledFaceDescriptors(nom, descriptions)
      );
      }
    }

  return labeledFaceDescriptors;
}


  video.addEventListener("play", async () => {
    const labeledFaceDescriptors = await getLabeledFaceDescriptionsFromSupabase();
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
      if (results && resizedDetections) {
        results.forEach((result, i) => {
          const box = resizedDetections[i].detection.box;
          const label = result.toString();
          const name = label.split(" ")[0]; // Extract the name from the label

          // Get the context to measure text width
          const ctx = canvas.getContext("2d");
          ctx.font = "14px Arial";
          const textMetrics = ctx.measureText(name); // Use the name for text measurement
          const textWidth = textMetrics.width;
          const textHeight = 14; // Approximate text height

          const labelX = box.x;
          const labelY = box.y + box.height + textHeight; // Position below the box

          // Check if the click coordinates are within the label bounds
          if (
            x >= labelX &&
            x <= labelX + textWidth &&
            y >= labelY - textHeight &&
            y <= labelY
          ) {
            window.open(`https://www.example.com/${name}`, "_blank"); // Open the URL in a new tab
          }
        });
      }
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
        const name = label.split(" ")[0]; // Extract the name

        // Draw the bounding box
        const drawBox = new faceapi.draw.DrawBox(box, { label: "" }); // Don't draw the label in the box
        drawBox.draw(canvas);

        // Draw the label (as a visual cue for the clickable area) below the box
        const ctx = canvas.getContext("2d");
        ctx.font = "14px Arial";
        ctx.fillStyle = "white";
        const text = name; // Use the name here
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
});