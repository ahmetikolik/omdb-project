// OMDB Movie Search SPA
// Author: Ahmet Yıldırım

const API_BASE = "https://www.omdbapi.com/";
const STORAGE_KEYS = {
  apiKey: "omdb_api_key",
  lastSearch: "omdb_last_search",
};

// DOM elements
const apiKeySection = document.getElementById("api-key-section");
const apiKeyInput = document.getElementById("api-key-input");
const saveKeyBtn = document.getElementById("save-key-btn");

const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const typeFilter = document.getElementById("type-filter");
const yearFilter = document.getElementById("year-filter");

const statusMessage = document.getElementById("status-message");
const resultsGrid = document.getElementById("results");

const modal = document.getElementById("modal");
const modalBody = document.getElementById("modal-body");
const modalClose = document.getElementById("modal-close");

// State
let apiKey = localStorage.getItem(STORAGE_KEYS.apiKey) || "";

// On page load
window.addEventListener("DOMContentLoaded", () => {
  // If no API key, show the setup section
  if (!apiKey) {
    apiKeySection.classList.remove("hidden");
  }

  // Restore last search if exists
  const last = JSON.parse(localStorage.getItem(STORAGE_KEYS.lastSearch) || "null");
  if (last && last.query) {
    searchInput.value = last.query;
    if (last.type) typeFilter.value = last.type;
    if (last.year) yearFilter.value = last.year;
    if (apiKey) {
      runSearch();
    }
  }
});

// Save API key
saveKeyBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    setStatus("Please enter a valid API key.", true);
    return;
  }
  apiKey = key;
  localStorage.setItem(STORAGE_KEYS.apiKey, key);
  apiKeySection.classList.add("hidden");
  setStatus("API key saved. You can search now!");
});

// Search
searchBtn.addEventListener("click", runSearch);
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") runSearch();
});

async function runSearch() {
  const query = searchInput.value.trim();
  if (!query) {
    setStatus("Please type a movie name first.", true);
    return;
  }
  if (!apiKey) {
    apiKeySection.classList.remove("hidden");
    setStatus("API key is required.", true);
    return;
  }

  // Save the search to localStorage so we restore it after refresh
  const searchState = {
    query: query,
    type: typeFilter.value,
    year: yearFilter.value,
  };
  localStorage.setItem(STORAGE_KEYS.lastSearch, JSON.stringify(searchState));

  setStatus("Searching...");
  resultsGrid.innerHTML = "";
  searchBtn.disabled = true;

  try {
    // Build URL
    const params = new URLSearchParams({
      apikey: apiKey,
      s: query,
    });
    if (typeFilter.value) params.append("type", typeFilter.value);
    if (yearFilter.value) params.append("y", yearFilter.value);

    const response = await fetch(`${API_BASE}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Network error (${response.status})`);
    }
    const data = await response.json();

    if (data.Response === "False") {
      // OMDB returns Response:"False" with an Error field on no match
      setStatus(data.Error || "No results found.", true);
      return;
    }

    setStatus(`Found ${data.totalResults} results — showing first ${data.Search.length}.`);
    renderResults(data.Search);
  } catch (err) {
    console.error(err);
    setStatus("Something went wrong. Please try again.", true);
  } finally {
    searchBtn.disabled = false;
  }
}

function renderResults(movies) {
  resultsGrid.innerHTML = "";
  movies.forEach((movie) => {
    const card = document.createElement("div");
    card.className = "movie-card";
    card.addEventListener("click", () => openDetails(movie.imdbID));

    const poster =
      movie.Poster && movie.Poster !== "N/A"
        ? movie.Poster
        : "https://via.placeholder.com/200x270/161922/8a8f98?text=No+Poster";

    card.innerHTML = `
      <img src="${poster}" alt="${escapeHTML(movie.Title)}" loading="lazy" />
      <div class="info">
        <div class="title">${escapeHTML(movie.Title)}</div>
        <div class="year">${escapeHTML(movie.Year)}</div>
      </div>
    `;
    resultsGrid.appendChild(card);
  });
}

// Cache for detail responses (avoid repeated requests)
const detailCache = {};

async function openDetails(imdbID) {
  setStatus("Loading details...");
  try {
    let data;
    if (detailCache[imdbID]) {
      data = detailCache[imdbID];
    } else {
      const params = new URLSearchParams({
        apikey: apiKey,
        i: imdbID,
        plot: "full",
      });
      const response = await fetch(`${API_BASE}?${params.toString()}`);
      if (!response.ok) throw new Error("Network error");
      data = await response.json();
      if (data.Response === "False") {
        setStatus(data.Error || "Could not load details.", true);
        return;
      }
      detailCache[imdbID] = data;
    }
    showModal(data);
    setStatus("");
  } catch (err) {
    console.error(err);
    setStatus("Could not load movie details.", true);
  }
}

function showModal(movie) {
  const poster =
    movie.Poster && movie.Poster !== "N/A"
      ? movie.Poster
      : "https://via.placeholder.com/200x270/161922/8a8f98?text=No+Poster";

  modalBody.innerHTML = `
    <div class="modal-detail">
      <img src="${poster}" alt="${escapeHTML(movie.Title)}" />
      <div>
        <h2>${escapeHTML(movie.Title)}</h2>
        <div class="meta">${escapeHTML(movie.Year)} · ${escapeHTML(movie.Rated || "N/A")} · ${escapeHTML(movie.Runtime || "N/A")}</div>
        <div class="field"><strong>Genre:</strong> ${escapeHTML(movie.Genre || "N/A")}</div>
        <div class="field"><strong>Director:</strong> ${escapeHTML(movie.Director || "N/A")}</div>
        <div class="field"><strong>Writer:</strong> ${escapeHTML(movie.Writer || "N/A")}</div>
        <div class="field"><strong>Actors:</strong> ${escapeHTML(movie.Actors || "N/A")}</div>
        <div class="field"><strong>IMDB:</strong> ${escapeHTML(movie.imdbRating || "N/A")} (${escapeHTML(movie.imdbVotes || "0")} votes)</div>
        <p class="plot">${escapeHTML(movie.Plot || "")}</p>
      </div>
    </div>
  `;
  modal.classList.remove("hidden");
}

modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  // Click outside modal-content closes it
  if (e.target === modal) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

function closeModal() {
  modal.classList.add("hidden");
  modalBody.innerHTML = "";
}

function setStatus(text, isError = false) {
  statusMessage.textContent = text;
  statusMessage.classList.toggle("error", isError);
}

// Tiny helper: escape HTML to avoid weird rendering issues
function escapeHTML(str) {
  if (str == null) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
