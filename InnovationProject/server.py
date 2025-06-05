import os
import requests
from flask import Flask, request, jsonify, send_from_directory, render_template
from dotenv import load_dotenv
from supabase import create_client, Client
from werkzeug.utils import secure_filename

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

SUPABASE_TABLE = "cartes_id"
OCR_API_KEY = os.getenv("API_KEY_OCR")
OCR_API_URL = "https://api.ocr.space/parse/image"

app = Flask(__name__, static_folder=None)

# --- Serve static and HTML files as before (unchanged) ---

# --- API: List all persons ---
@app.route("/api/persons", methods=["GET"])
def api_list_persons():
    name = request.args.get("name")
    person_id = request.args.get("id")
    query = supabase.table(SUPABASE_TABLE).select("*")
    if person_id:
        query = query.eq("id", person_id)
    if name:
        query = query.ilike("nom", name)  # Use ilike for case-insensitive match
    response = query.execute()
    return jsonify(response.data), 200

# --- API: Add a person () ---
@app.route("/api/persons", methods=["POST"])
def api_add_person():
    nom = request.form.get("nom")
    prenoms = request.form.get("prenoms")
    date_naissance = request.form.get("date_naissance")
    id_card_file = request.files.get("id_card")
    photo1_file = request.files.get("photo1")
    photo2_file = request.files.get("photo2")


    import time
    ts = str(int(time.time() * 1000))
    id_card_filename = f"id_card_{ts}_{secure_filename(id_card_file.filename)}"
    photo1_filename = f"photo1_{ts}_{secure_filename(photo1_file.filename)}"
    photo2_filename = f"photo2_{ts}_{secure_filename(photo2_file.filename)}"

    bucket = "photos-identite"
    try:
        id_card_file.stream.seek(0)
        id_card_bytes = id_card_file.read()
        photo1_file.stream.seek(0)
        photo1_bytes = photo1_file.read()
        photo2_file.stream.seek(0)
        photo2_bytes = photo2_file.read()

        id_card_upload = supabase.storage.from_(bucket).upload(
            id_card_filename,
            id_card_bytes,
            {"content-type": id_card_file.mimetype}
        )
        photo1_upload = supabase.storage.from_(bucket).upload(
            photo1_filename,
            photo1_bytes,
            {"content-type": photo1_file.mimetype}
        )
        photo2_upload = supabase.storage.from_(bucket).upload(
            photo2_filename,
            photo2_bytes,
            {"content-type": photo2_file.mimetype}
        )
    except Exception as e:
        return jsonify({"error": f"Erreur upload: {str(e)}"}), 500

    # Get signed URLs
    id_card_url = supabase.storage.from_(bucket).create_signed_url(id_card_filename, 6000000000).get("signedURL")
    photo1_url = supabase.storage.from_(bucket).create_signed_url(photo1_filename, 6000000000).get("signedURL")
    photo2_url = supabase.storage.from_(bucket).create_signed_url(photo2_filename, 6000000000).get("signedURL")

    # Insert into Supabase Database
    try:
        response = (
            supabase.table(SUPABASE_TABLE)
            .insert({
                "nom": nom,
                "prenom": prenoms,
                "date_naissance": date_naissance,
                "url_id_card": id_card_url,
                "photo1_url": photo1_url,
                "photo2_url": photo2_url
            })
            .execute()
        )
    except Exception as e:
        return jsonify({"error": f"Erreur DB: {str(e)}"}), 500

    return jsonify({"success": True}), 201

# --- API: Edit a person ---
@app.route("/api/persons/<int:person_id>", methods=["PATCH"])
def api_edit_person(person_id):
    dataupdate = request.json
    response = (
        supabase.table(SUPABASE_TABLE)
        .update(dataupdate)
        .eq("id", person_id)
        .execute()
    )
    return jsonify(response.data), 200

    

# --- API: Delete a person ---
@app.route("/api/persons/<int:person_id>", methods=["DELETE"])
def api_delete_person(person_id):
    response = (
        supabase.table(SUPABASE_TABLE)
        .delete()
        .eq("id", person_id)
        .execute()
    )
    return jsonify(response.data), 200
    

# --- API: OCR endpoint (proxy to OCR.space) ---
@app.route("/api/ocr", methods=["POST"])
def api_ocr():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files["file"]
    payload = {
        "apikey": OCR_API_KEY,
        "language": "fre",
        "isOverlayRequired": "false",
        "OCREngine": "1"
    }
    files = {"file": (file.filename, file.stream, file.mimetype)}
    r = requests.post(OCR_API_URL, data=payload, files=files)
    return jsonify(r.json()), r.status_code


# Serve main index.html
@app.route("/")
def index():
    return send_from_directory('.', 'index.html')

# Serve static files (JS, CSS, models, etc.)
@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

# Serve add_person subdirectory
@app.route('/add_person/<path:filename>')
def serve_add_person(filename):
    return send_from_directory('add_person', filename)

# Serve list_customers subdirectory
@app.route('/list_customers/<path:filename>')
def serve_list_customers(filename):
    return send_from_directory('list_customers', filename)

# Serve details subdirectory
@app.route('/details/<path:filename>')
def serve_details(filename):
    return send_from_directory('details', filename)

@app.route('/api/persons/name_images')
def api_persons_name_images():
    response = (
    supabase.table(SUPABASE_TABLE)
    .select("nom", "photo1_url", "photo2_url", "url_id_card")
    .execute()
    )
    return response.data, 200

@app.route('/api/storage/create_signed_url190', methods=['POST'])
def api_create_signed_url():

    data = request.json
    response = supabase.storage.from_("photos-identite").create_signed_url(data, 6000000000)
    return jsonify(response.data), 200


if __name__ == "__main__":
    app.run(debug=True)