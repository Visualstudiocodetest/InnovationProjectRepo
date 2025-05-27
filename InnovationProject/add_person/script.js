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

    // Génère une URL signée valable 190 ans (6000000000 secondes)
    const { data: signedUrlData, error: signedUrlError } = await supabaseClient
      .storage
      .from(BUCKET_NAME)
      .createSignedUrl(data.path, 6000000000 ) // 190 ans

    if (signedUrlError) {
      console.error("Erreur lors de la création de l'URL signée:", signedUrlError);
      alert(`Erreur lors de la création de l'URL signée pour ${imageName}: ${signedUrlError.message}`);
      return null;
    }

    return signedUrlData.signedUrl;
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
    // 1. OCR: Send the ID card image to Flask backend for OCR
    const ocrFormData = new FormData();
    ocrFormData.append('file', idCardFile);

    const ocrResponse = await fetch('/api/ocr', {
      method: 'POST',
      body: ocrFormData
    });

    const ocrData = await ocrResponse.json();

    if (ocrData.IsErroredOnProcessing) {
      resultDiv.textContent = 'Error OCR: ' + ocrData.ErrorMessage;
      return;
    }

    const extractedText = ocrData.ParsedResults[0].ParsedText;
    resultDiv.textContent = extractedText;

    // 2. Extract info
    const info = extractInfoFromOCR(extractedText);

    // 3. Send all data and files to Flask backend for storage and DB
    const formData = new FormData();
    formData.append('id_card', idCardFile);
    formData.append('photo1', photo1File);
    formData.append('photo2', photo2File);
    formData.append('nom', info.nom);
    formData.append('prenoms', info.prenoms);
    formData.append('date_naissance', info.date_naissance);

    const saveResponse = await fetch('/api/persons', {
      method: 'POST',
      body: formData
    });

    const saveResult = await saveResponse.json();

    if (saveResponse.ok) {
      alert(`✅ Données et images enregistrées avec succès !\nNom: ${info.nom}\nPrénoms: ${info.prenoms}\nDate de naissance: ${info.date_naissance}`);
      window.location.href = "/InnovationProject/list_customers";
    } else {
      alert("Erreur lors de l'enregistrement des données : " + (saveResult.error || ''));
    }

  } catch (error) {
    resultDiv.textContent = 'Error: ' + error.message;
    console.error(error);
  }
}