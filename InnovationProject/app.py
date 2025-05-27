import os
import requests
from flask import Flask, request, jsonify, send_from_directory, render_template
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

SUPABASE_TABLE = "cartes_id"
OCR_API_KEY = os.getenv("OCR_API_KEY")
OCR_API_URL = "https://api.ocr.space/parse/image"

app = Flask(__name__, static_folder=None)

# --- Serve static and HTML files as before (unchanged) ---

# --- API: List all persons ---
@app.route("/api/persons", methods=["GET"])
def api_list_persons():
    response = (
    supabase.table(SUPABASE_TABLE)
    .select("*")
    .execute())

    return response.data, 200

# --- API: Add a person () ---
@app.route("/api/persons", methods=["POST"])
def api_add_person():
    response = (
    supabase.table(SUPABASE_TABLE)
    .insert()
    .execute()
    )

    return response.data, 201

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
    return response.data, 200

    

# --- API: Delete a person ---
@app.route("/api/persons/<int:person_id>", methods=["DELETE"])
def api_delete_person(person_id):
    response = (
        supabase.table(SUPABASE_TABLE)
        .delete()
        .eq("id", person_id)
        .execute()
    )
    return response.data, 200
    

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

@app.route('/api/storage/create_signed_url60', methods=['POST'])
def api_create_signed_url():
    data = request.json
    response = supabase.storage.from_("photos-identite").create_signed_url(data["path"], 60)
    return response.data, 200

if __name__ == "__main__":
    app.run(debug=True)