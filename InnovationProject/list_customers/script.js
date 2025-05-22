const SUPABASE_URL = "https://ayrljfcrhcvhexfdbjln.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5cmxqZmNyaGN2aGV4ZmRiamxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjUxOTc3NiwiZXhwIjoyMDYyMDk1Nzc2fQ.dKfQ2E23n4DOw6qc9vksbxuJxoGxSyEfVw-NS6Rly9o";

// Get references to main elements
const dataContainer = document.getElementById('data-container');
const errorMessage = document.getElementById('error-message');
const searchInput = document.getElementById('search-input');
const addPersonButton = document.getElementById('add-person-button');

// Get references to edit form elements
const editFormContainer = document.getElementById('edit-form-container');
const editForm = document.getElementById('edit-form');
const saveEditButton = document.getElementById('save-edit-button');
const cancelEditButton = document.getElementById('cancel-edit-button');
const editIdInput = document.getElementById('edit-id');
const editNomInput = document.getElementById('edit-nom');
const editPrenomInput = document.getElementById('edit-prenom');
const editDateNaissanceInput = document.getElementById('edit-date_naissance');
const editPhoto1UrlInput = document.getElementById('edit-photo1_url');
const editPhoto2UrlInput = document.getElementById('edit-photo2_url');
const editUrlIdCardInput = document.getElementById('edit-url_id_card');

// Get references to custom modal elements
const confirmModal = document.getElementById('confirm-modal');
const confirmMessage = document.getElementById('confirm-message');
const confirmYesButton = document.getElementById('confirm-yes');
const confirmNoButton = document.getElementById('confirm-no');

const messageBox = document.getElementById('message-box');
const messageText = document.getElementById('message-text');
const messageOkButton = document.getElementById('message-ok');

// Global data storage and state
let allData = [];
let editingRowId = null;

// --- Custom Modal Functions ---

/**
 * Displays a custom confirmation modal.
 * @param {string} message - The message to display in the modal.
 * @returns {Promise<boolean>} - Resolves with true if 'Yes' is clicked, false if 'No'.
 */
function showConfirmModal(message) {
    return new Promise(resolve => {
        confirmMessage.textContent = message;
        confirmModal.style.display = 'flex'; // Use flex to center

        const onYes = () => {
            confirmModal.style.display = 'none';
            confirmYesButton.removeEventListener('click', onYes);
            confirmNoButton.removeEventListener('click', onNo);
            resolve(true);
        };

        const onNo = () => {
            confirmModal.style.display = 'none';
            confirmYesButton.removeEventListener('click', onYes);
            confirmNoButton.removeEventListener('click', onNo);
            resolve(false);
        };

        confirmYesButton.addEventListener('click', onYes);
        confirmNoButton.addEventListener('click', onNo);
    });
}

/**
 * Displays a custom message box.
 * @param {string} message - The message to display.
 * @returns {Promise<void>} - Resolves when 'OK' is clicked.
 */
function showMessageBox(message) {
    return new Promise(resolve => {
        messageText.textContent = message;
        messageBox.style.display = 'flex'; // Use flex to center

        const onOk = () => {
            messageBox.style.display = 'none';
            messageOkButton.removeEventListener('click', onOk);
            resolve();
        };

        messageOkButton.addEventListener('click', onOk);
    });
}

// --- Event Listeners for main actions ---

addPersonButton.addEventListener('click', () => {
    window.location.href = '/InnovationProject/add_person';
});

// --- Data Fetching and Rendering ---

/**
 * Fetches data from Supabase and renders the table.
 */
async function fetchData() {
    console.log('Fetching data...');
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/cartes_id?select=id,nom,prenom,date_naissance,photo1_url,photo2_url,url_id_card`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
            }
        });

        if (!response.ok) {
            throw new Error(`Erreur de requête: ${response.status}`);
        }

        const data = await response.json();
        console.log('Data fetched successfully:', data);

        if (data && data.length > 0) {
            allData = data;
            renderTable(data);
        } else {
            dataContainer.innerHTML = '<p>Aucune donnée trouvée dans la table.</p>';
        }

    } catch (error) {
        console.error("Erreur lors de la récupération des données:", error);
        dataContainer.style.display = 'none';
        errorMessage.textContent = "Une erreur est survenue lors du chargement des données.";
        errorMessage.style.display = 'block';
    }
}

/**
 * Renders the data table based on the provided array of data.
 * @param {Array<Object>} data - The array of person data to render.
 */
function renderTable(data) {
    dataContainer.innerHTML = ''; // Clear previous content
    console.log('Rendering table with data:', data);

    if (data.length === 0) {
        dataContainer.innerHTML = '<p>Aucun résultat trouvé.</p>';
        return;
    }

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    const headersConfig = [
        { label: "Nom", key: "nom", sortable: true },
        { label: "Prénom", key: "prenom", sortable: true },
        { label: "Date de naissance", key: "date_naissance", sortable: true },
        { label: "Photo 1", key: "photo1_url", sortable: false },
        { label: "Photo 2", key: "photo2_url", sortable: false },
        { label: "URL Carte ID", key: "url_id_card", sortable: false },
        { label: "Actions", key: "actions", sortable: false }
    ];

    const headerRow = document.createElement('tr');
    headersConfig.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header.label;
        if (header.sortable) {
            const ascButton = document.createElement('button');
            ascButton.textContent = '▲';
            ascButton.title = `Trier par ${header.label} (ascendant)`;
            ascButton.addEventListener('click', () => sortData(header.key, 'asc'));
            th.appendChild(ascButton);

            const descButton = document.createElement('button');
            descButton.textContent = '▼';
            descButton.title = `Trier par ${header.label} (descendant)`;
            descButton.addEventListener('click', () => sortData(header.key, 'desc'));
            th.appendChild(descButton);
        }
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    data.forEach(rowData => {
        const tr = document.createElement('tr');
        tr.dataset.id = rowData.id;

        const nomTd = document.createElement('td');
        nomTd.textContent = rowData.nom;
        tr.appendChild(nomTd);

        const prenomTd = document.createElement('td');
        prenomTd.textContent = rowData.prenom;
        tr.appendChild(prenomTd);

        const dateNaissanceTd = document.createElement('td');
        dateNaissanceTd.textContent = rowData.date_naissance;
        tr.appendChild(dateNaissanceTd);

        const photo1Td = document.createElement('td');
        if (rowData.photo1_url) {
            const img1 = document.createElement('img');
            img1.src = rowData.photo1_url;
            img1.alt = `Photo 1 de ${rowData.prenom} ${rowData.nom}`;
            img1.classList.add('image-preview');
            photo1Td.appendChild(img1);
        } else {
            photo1Td.textContent = 'Pas de photo';
        }
        tr.appendChild(photo1Td);

        const photo2Td = document.createElement('td');
        if (rowData.photo2_url) {
            const img2 = document.createElement('img');
            img2.src = rowData.photo2_url;
            img2.alt = `Photo 2 de ${rowData.prenom} ${rowData.nom}`;
            img2.classList.add('image-preview');
            photo2Td.appendChild(img2);
        } else {
            photo2Td.textContent = 'Pas de photo';
        }
        tr.appendChild(photo2Td);

        const urlIdCardTd = document.createElement('td');
        if (rowData.url_id_card) {
            const link = document.createElement('a');
            link.href = rowData.url_id_card;
            link.textContent = 'Voir la carte';
            link.target = '_blank';
            urlIdCardTd.appendChild(link);
        } else {
            urlIdCardTd.textContent = 'Pas de lien';
        }
        tr.appendChild(urlIdCardTd);

        const actionsTd = document.createElement('td');
        actionsTd.classList.add('action-buttons');

        const editButton = document.createElement('button');
        editButton.textContent = 'Éditer';
        editButton.classList.add('edit-button');
        // This is the crucial part: ensure rowData is correctly captured for each button
        ((currentRowData) => {
            editButton.addEventListener('click', (event) => {
                console.log('Edit button clicked for ID:', currentRowData.id);
                event.stopPropagation(); // Prevent row click from firing
                populateEditForm(currentRowData);
            });
        })(rowData); // Pass rowData to the IIFE
        actionsTd.appendChild(editButton);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Supprimer';
        deleteButton.classList.add('delete-button');
        deleteButton.addEventListener('click', async (event) => {
            console.log('Delete button clicked for ID:', tr.dataset.id);
            event.stopPropagation(); // Prevent row click from firing
            const id = tr.dataset.id;
            const confirmed = await showConfirmModal("Êtes-vous sûr de vouloir supprimer cette personne ?");
            if (confirmed) {
                deletePerson(id);
            }
        });
        actionsTd.appendChild(deleteButton);
        tr.appendChild(actionsTd);

        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    dataContainer.appendChild(table);
}

// --- Edit Form Functions ---

/**
 * Populates the edit form with data from a selected row and displays it.
 * @param {Object} rowData - The data of the row to be edited.
 */
function populateEditForm(rowData) {
    console.log('populateEditForm called with:', rowData);
    editingRowId = rowData.id;
    editIdInput.value = rowData.id;
    editNomInput.value = rowData.nom;
    editPrenomInput.value = rowData.prenom;
    editDateNaissanceInput.value = rowData.date_naissance;
    editPhoto1UrlInput.value = rowData.photo1_url || '';
    editPhoto2UrlInput.value = rowData.photo2_url || '';
    editUrlIdCardInput.value = rowData.url_id_card || '';

    // Ensure the container is visible
    editFormContainer.style.display = 'block';
    console.log('Edit form container display set to:', editFormContainer.style.display);
    // Scroll to the form for better UX on smaller screens
    editFormContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

cancelEditButton.addEventListener('click', () => {
    console.log('Cancel edit button clicked.');
    editFormContainer.style.display = 'none';
    editingRowId = null;
});

saveEditButton.addEventListener('click', async () => {
    console.log('Save edit button clicked. editingRowId:', editingRowId);
    if (!editingRowId) {
        console.warn('No row selected for editing.');
        return;
    }

    const updatedData = {
        nom: editNomInput.value,
        prenom: editPrenomInput.value,
        date_naissance: editDateNaissanceInput.value,
        photo1_url: editPhoto1UrlInput.value,
        photo2_url: editPhoto2UrlInput.value,
        url_id_card: editUrlIdCardInput.value,
    };
    console.log('Attempting to save updated data:', updatedData);

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/cartes_id?id=eq.${editingRowId}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(updatedData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Erreur lors de la mise à jour: ${response.status} - ${JSON.stringify(error)}`);
        }

        const updatedRecord = await response.json();
        console.log('Update successful. Returned record:', updatedRecord);

        if (updatedRecord && updatedRecord.length > 0) {
            // Update the corresponding item in allData
            allData = allData.map(item => item.id === editingRowId ? updatedRecord[0] : item);
            renderTable(allData); // Re-render the table with updated data
            editFormContainer.style.display = 'none';
            editingRowId = null;
            await showMessageBox(`La personne avec l'ID ${updatedRecord[0].id} a été mise à jour.`);
        } else {
            throw new Error("Aucune donnée mise à jour retournée par le serveur.");
        }

    } catch (error) {
        console.error("Erreur lors de la mise à jour de la personne:", error);
        errorMessage.textContent = `Erreur lors de la mise à jour: ${error.message}`;
        errorMessage.style.display = 'block';
    }
});

// --- Delete Function ---

/**
 * Deletes a person record from Supabase.
 * @param {string} id - The ID of the person to delete.
 */
async function deletePerson(id) {
    console.log('Attempting to delete person with ID:', id);
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/cartes_id?id=eq.${id}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Erreur lors de la suppression: ${response.status} - ${JSON.stringify(error)}`);
        }

        console.log('Delete successful for ID:', id);
        allData = allData.filter(item => item.id !== id); // Remove from local data
        await showMessageBox(`La personne avec l'ID ${id} a été supprimée.`);

    } catch (error) {
        console.error("Erreur lors de la suppression de la personne:", error);
        errorMessage.textContent = `Erreur lors de la suppression: ${error.message}`;
        errorMessage.style.display = 'block';
    }
    renderTable(allData); // Re-render table
}

// --- Search Functionality ---

searchInput.addEventListener('input', function() {
    const searchTerm = searchInput.value.toLowerCase();
    console.log('Search input changed:', searchTerm);
    const filteredData = allData.filter(item =>
        (item.nom && item.nom.toLowerCase().includes(searchTerm)) ||
        (item.prenom && item.prenom.toLowerCase().includes(searchTerm))
    );
    renderTable(filteredData);
});

// --- Sorting Functionality ---

/**
 * Sorts the data based on the specified column and direction.
 * @param {string} columnKey - The key of the column to sort by.
 * @param {'asc'|'desc'} direction - The sorting direction ('asc' or 'desc').
 */
function sortData(columnKey, direction) {
    console.log(`Sorting by ${columnKey} in ${direction} order.`);
    let sortedData = [...allData]; // Create a shallow copy to avoid modifying original

    sortedData.sort((a, b) => {
        let valueA = a[columnKey];
        let valueB = b[columnKey];

        if (columnKey === 'date_naissance') {
            // Convert DD/MM/YYYY to YYYY-MM-DD for correct Date object parsing
            const [dayA, monthA, yearA] = valueA.split('/');
            const isoDateA = `${yearA}-${monthA}-${dayA}`;
            valueA = new Date(isoDateA);

            const [dayB, monthB, yearB] = valueB.split('/');
            const isoDateB = `${yearB}-${monthB}-${dayB}`;
            valueB = new Date(isoDateB);
        } else if (typeof valueA === 'string') {
            valueA = valueA.toLowerCase();
            valueB = valueB.toLowerCase();
        }

        if (direction === 'asc') {
            if (valueA < valueB) return -1;
            if (valueA > valueB) return 1;
            return 0;
        } else if (direction === 'desc') {
            if (valueA < valueB) return 1;
            if (valueA > valueB) return -1;
            return 0;
        }
        return 0;
    });
    renderTable(sortedData);
}

// --- Initial Data Load ---
fetchData();