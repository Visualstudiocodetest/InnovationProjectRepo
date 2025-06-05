document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const name = params.get('name');


  let personData = null;

  if (id) {
    // Fetch by ID
    const res = await fetch(`/api/persons?id=${encodeURIComponent(id)}`);
    const data = await res.json();
    personData = Array.isArray(data) ? data[0] : data;
  } else if (name) {
    // Fetch by name
    const res = await fetch(`/api/persons?name=${encodeURIComponent(name)}`);
    const data = await res.json();
    personData = Array.isArray(data) ? data[0] : data;
  }

  if (personData) {
    document.getElementById('person-name').textContent = `${personData.prenom} ${personData.nom}`;
    document.getElementById('person-info').textContent = `Date de naissance : ${personData.date_naissance}`;
    if (personData.photo1_url) {
      document.getElementById('person-image').innerHTML = `<img src="${personData.photo1_url}" style="width:100px;height:100px;border-radius:50%;">`;
    }
  } else {
    document.getElementById('person-name').textContent = "Personne non trouvée";
    document.getElementById('person-info').textContent = "";
  }
});