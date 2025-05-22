const video = document.getElementById("video");

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  const SUPABASE_URL = "https://ayrljfcrhcvhexfdbjln.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5cmxqZmNyaGN2aGV4ZmRiamxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjUxOTc3NiwiZXhwIjoyMDYyMDk1Nzc2fQ.dKfQ2E23n4DOw6qc9vksbxuJxoGxSyEfVw-NS6Rly9o";
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
  const { data, error } = await supabase
    .from('cartes_id')
    .select("nom, photo1_url, photo2_url");

  if (error) {
    console.error("Erreur lors de la récupération des données Supabase:", error);
    return [];
  }

  const labeledFaceDescriptors = [];

  for (const person of data) {
    const { nom, photo1_url, photo2_url } = person;
    const descriptions = [];

    try {
      const signedUrls = [];

      if (photo1_url) {
        const path = photo1_url.split("/").slice(-1)[0]; // extrait le nom du fichier
        const { data: signed1, error: err1 } = await supabase
          .storage
          .from('photos-identite')
          .createSignedUrl(path, 60); // 60 secondes

        if (!err1) {
          signedUrls.push(signed1.signedUrl);
        }
      }

      if (photo2_url) {
        const path = photo2_url.split("/").slice(-1)[0]; // extrait le nom du fichier
        const { data: signed2, error: err2 } = await supabase
          .storage
          .from('photos-identite')
          .createSignedUrl(path, 60);

        if (!err2) {
          signedUrls.push(signed2.signedUrl);
        }
      }

      for (const url of signedUrls) {
        const img = await faceapi.fetchImage(url);
        const detection = await faceapi
          .detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          descriptions.push(detection.descriptor);
        }
      }

      if (descriptions.length > 0) {
        labeledFaceDescriptors.push(
          new faceapi.LabeledFaceDescriptors(nom, descriptions)
        );
      } else {
        console.warn(`Aucun visage détecté pour ${nom}`);
      }

    } catch (error) {
      console.error(`Erreur lors du traitement des images pour ${nom}:`, error);
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