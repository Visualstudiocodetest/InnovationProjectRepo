const video = document.getElementById("video");

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  const SUPABASE_URL = "https://ayrljfcrhcvhexfdbjln.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5cmxqZmNyaGN2aGV4ZmRiamxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1MTk3NzYsImV4cCI6MjA2MjA5NTc3Nn0.pLAjYhwJF_8vk5VzN4vKihJLK9m0Xgti9SVYuvWQuBo";
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
    let { data , error } = await supabase
    .from('cartes_id')
    .select("nom, photo1_url, photo2_url");

    if (error) {
      console.error("Error fetching data from Supabase:", error);
      return [];
    }

    const labeledFaceDescriptors = [];
    for (const person of data) {
      const { nom, photo1_url, photo2_url } = person;
      const descriptions = [];
      try {
        if (photo1_url) {
          const img1 = await faceapi.fetchImage(photo1_url);
          const detection1 = await faceapi
            .detectSingleFace(img1)
            .withFaceLandmarks()
            .withFaceDescriptor();
          if (detection1) {
            descriptions.push(detection1.descriptor);
          }
        }
        if (photo2_url) {
          const img2 = await faceapi.fetchImage(photo2_url);
          const detection2 = await faceapi
            .detectSingleFace(img2)
            .withFaceLandmarks()
            .withFaceDescriptor();
          if (detection2) {
            descriptions.push(detection2.descriptor);
          }
        }
        if (descriptions.length > 0) {
          labeledFaceDescriptors.push(
            new faceapi.LabeledFaceDescriptors(nom, descriptions)
          );
        } else {
          console.warn(`No face detected in images for ${nom}`);
        }
      } catch (error) {
        console.error(`Error processing images for ${nom}:`, error);
      }
    }
    return labeledFaceDescriptors;
  }

  // Define a mapping between names (from Supabase) and URLs
  const nameToUrl = {
    "Mathieu": "https://www.example.com/mathieu",
    "Frank": "https://www.example.com/frank",
    "Alex": "https://www.example.com/alex",
    "Shayaan": "https://www.example.com/shayaan",
    "unknown": "https://www.example.com/unknown",
    // Add more mappings as needed, ensure these match the 'nom' in your Supabase table
  };

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
            const url = nameToUrl[name];
            if (url) {
              window.open(url, "_blank"); // Open the URL in a new tab
            } else {
              console.warn(`No URL defined for name: ${name}`);
            }
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