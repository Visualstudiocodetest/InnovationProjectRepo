// ⚙️ Config Supabase
    const SUPABASE_URL = "https://ayrljfcrhcvhexfdbjln.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5cmxqZmNyaGN2aGV4ZmRiamxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1MTk3NzYsImV4cCI6MjA2MjA5NTc3Nn0.pLAjYhwJF_8vk5VzN4vKihJLK9m0Xgti9SVYuvWQuBo";
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    const API_KEY = 'K84044132288957';
    const API_URL = 'https://api.ocr.space/parse/image';
    const BUCKET_NAME = 'photos-identite';

    let idCardFile;
    let photo1File;
    let photo2File;

    document.getElementById('id-card-input').addEventListener('change', function (e) {
      idCardFile = e.target.files[0];
      if (idCardFile) {
        const reader = new FileReader();
        reader.onload = function (e) {
          document.getElementById('id-card-preview').src = e.target.result;
          document.getElementById('id-card-preview').style.display = 'block';
        }
        reader.readAsDataURL(idCardFile);
      } else {
        document.getElementById('id-card-preview').style.display = 'none';
        document.getElementById('id-card-preview').src = '#';
      }
    });

    document.getElementById('photo1-input').addEventListener('change', function (e) {
      photo1File = e.target.files[0];
      if (photo1File) {
        const reader = new FileReader();
        reader.onload = function (e) {
          document.getElementById('photo1-preview').src = e.target.result;
          document.getElementById('photo1-preview').style.display = 'block';
        }
        reader.readAsDataURL(photo1File);
      } else {
        document.getElementById('photo1-preview').style.display = 'none';
        document.getElementById('photo1-preview').src = '#';
      }
    });

    document.getElementById('photo2-input').addEventListener('change', function (e) {
      photo2File = e.target.files[0];
      if (photo2File) {
        const reader = new FileReader();
        reader.onload = function (e) {
          document.getElementById('photo2-preview').src = e.target.result;
          document.getElementById('photo2-preview').style.display = 'block';
        }
        reader.readAsDataURL(photo2File);
      } else {
        document.getElementById('photo2-preview').style.display = 'none';
        document.getElementById('photo2-preview').src = '#';
      }
    });

    function extractInfoFromOCR(ocrText) {
  const lines = ocrText.split('\n');
  let nom = '';
  let prenoms = '';
  let dateNaissance = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Extract Nom (cherche "NOM" ou la ligne suivant "IDENTITY CARO")
    if (line.includes('NOM') && !line.includes('USAGE')) {
      if (i + 1 < lines.length) {
        nom = lines[i + 1].trim();
      }
    } else if (line.includes('IDENTITY CARO') && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      const parts = nextLine.split(/\s+/); // Split par un ou plusieurs espaces
      if (parts.length > 0) {
        nom = parts[0].trim(); // Le nom apparaît souvent en premier
      }
    }

    // Extract Prénoms (cherche après le nom sur la même ligne ou ligne suivante)
    if (nom && !prenoms) {
      const nomIndex = lines.findIndex(l => l.includes(nom));
      if (nomIndex !== -1) {
        const lineWithNom = lines[nomIndex].trim();
        const afterNom = lineWithNom.substring(lineWithNom.indexOf(nom) + nom.length).trim().replace(/,/g, '').trim();
        if (afterNom) {
          prenoms = afterNom;
        } else if (nomIndex + 1 < lines.length) {
          prenoms = lines[nomIndex + 1].trim().replace(/,/g, '').trim();
        }
      }
    } else if ((line.includes('Prénoms') || line.includes('Given names') || line.includes('Prencms')) && i + 1 < lines.length) {
      prenoms = lines[i + 1].trim().replace(/,/g, '').trim();
    }

    // Extract Date de naissance (cherche "NAISS" ou "birth" suivi d'une date)
    if (line.includes('NAISS') || line.includes('birth')) {
      const dateMatch1 = line.match(/(\d{2})\s(\d{2})(\d{4})/); // DD MMYYYY
      const dateMatch2 = line.match(/(\d{2})\s(\d{2})\s(\d{4})/); // DD MM<ctrl98>
      if (dateMatch1) {
        dateNaissance = `${dateMatch1[1]}/${dateMatch1[2]}/${dateMatch1[3]}`;
      } else if (dateMatch2) {
        dateNaissance = `${dateMatch2[1]}/${dateMatch2[2]}/${dateMatch2[3]}`;
      } else if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        const nextLineDateMatch1 = nextLine.match(/(\d{2})\s(\d{2})(\d{4})/);
        const nextLineDateMatch2 = nextLine.match(/(\d{2})\s(\d{2})\s(\d{4})/);
        if (nextLineDateMatch1) {
          dateNaissance = `${nextLineDateMatch1[1]}/${nextLineDateMatch1[2]}/${nextLineDateMatch1[3]}`;
        } else if (nextLineDateMatch2) {
          dateNaissance = `${nextLineDateMatch2[1]}/${nextLineDateMatch2[2]}/${nextLineDateMatch2[3]}`;
        }
      }
    }
  }

  return {
    nom: nom,
    prenoms: prenoms,
    date_naissance: dateNaissance
  };
}

    async function uploadImage(file, imageName) {
      try {
        const { data, error } = await supabaseClient
          .storage
          .from(BUCKET_NAME)
          .upload(imageName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error("Erreur lors de l'upload de l'image:", error);
          alert(`Erreur lors de l'upload de l'image ${imageName}: ${error.message}`);
          return null;
        }

        const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${data.path}`;
        return imageUrl;
      } catch (error) {
        console.error("Erreur inattendue lors de l'upload de l'image:", error);
        alert(`Erreur inattendue lors de l'upload de l'image ${imageName}: ${error.message}`);
        return null;
      }
    }

    async function analyserEtEnregistrer() {
      if (!idCardFile || !photo1File || !photo2File) {
        alert("Merci de choisir la carte d'identité et les deux photos de la personne.");
        return;
      }

      const resultDiv = document.getElementById('output');
      resultDiv.textContent = 'Processing...';

      try {
        const formData = new FormData();
        formData.append('file', idCardFile);
        formData.append('apikey', API_KEY);
        formData.append('language', 'fre');
        formData.append('isOverlayRequired', 'false');
        formData.append('OCREngine', '1'); // Using engine 2 for better results

        const response = await fetch(API_URL, {
          method: 'POST',
          body: formData
        });

        const data = await response.json();

        if (data.IsErroredOnProcessing) {
          resultDiv.textContent = 'Error OCR: ' + data.ErrorMessage;
          return;
        }

        const extractedText = data.ParsedResults[0].ParsedText;
        resultDiv.textContent = extractedText;

        // Extract only the needed information
        const info = extractInfoFromOCR(extractedText);

        // Display extracted info
        console.log("Extracted Info:", info);

        // Upload images to Supabase Storage
        const idCardFileName = `id_card_${Date.now()}_${idCardFile.name}`;
        const photo1FileName = `photo1_${Date.now()}_${photo1File.name}`;
        const photo2FileName = `photo2_${Date.now()}_${photo2File.name}`;

        const idCardImageUrl = await uploadImage(idCardFile, idCardFileName);
        const photo1ImageUrl = await uploadImage(photo1File, photo1FileName);
        const photo2ImageUrl = await uploadImage(photo2File, photo2FileName);

        if (idCardImageUrl && photo1ImageUrl && photo2ImageUrl) {
          // 💾 Enregistrement dans Supabase Database avec les URLs des images
          const { error } = await supabaseClient
            .from("cartes_id")
            .insert([{
              nom: info.nom,
              prenom: info.prenoms,
              date_naissance: info.date_naissance,
              url_id_card: idCardImageUrl,
              photo1_url: photo1ImageUrl,
              photo2_url: photo2ImageUrl
            }]);

          if (error) {
            alert("Erreur lors de l'enregistrement des données : " + error.message);
          } else {
            alert(`✅ Données et images enregistrées avec succès !
                    Nom: ${info.nom}
                    Prénoms: ${info.prenoms}
                    Date de naissance: ${info.date_naissance}
                    URL Carte d'Identité: ${idCardImageUrl}
                    URL Photo 1: ${photo1ImageUrl}
                    URL Photo 2: ${photo2ImageUrl}`);
          }
        } else {
          alert("Erreur lors de l'upload des images. Les données n'ont pas été enregistrées.");
        }

      } catch (error) {
        resultDiv.textContent = 'Error: ' + error.message;
        console.error(error);
      }
    }