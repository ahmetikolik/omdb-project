// js/app.js
// UI + state. Talks to the OMDB module via window.OMDB, renders results,
// manages the detail dialog, and persists the last search in localStorage.
// Author: Ahmet Yıldırım

(function () {
  // --- DOM refs ---
  const $query        = document.getElementById("query");
  const $searchBtn    = document.getElementById("searchBtn");
  const $clearBtn     = document.getElementById("clearBtn");
  const $typeFilter   = document.getElementById("typeFilter");
  const $yearFilter   = document.getElementById("yearFilter");
  const $status       = document.getElementById("status");
  const $grid         = document.getElementById("grid");
  const $dialog       = document.getElementById("dialog");
  const $dialogBody   = document.getElementById("dialogBody");
  const $dialogClose  = document.getElementById("dialogClose");

  // --- Local storage keys (namespaced so they don't collide with anything) ---
  const LS_KEY = "movieFinder:lastSearch";

  // --- In-memory cache for movie detail responses ---
  // Saves a fetch when the user re-opens the same card during the session.
  const detailCache = new Map();

  // -------------------------------------------------------------------------
  // Boot
  // -------------------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", () => {
    bindEvents();
    restoreLastSearch();
  });

  function bindEvents() {
    $searchBtn.addEventListener("click", handleSearch);
    $clearBtn.addEventListener("click", handleClear);

    // Pressing Enter inside any input triggers the search
    [$query, $yearFilter].forEach(el => {
      el.addEventListener("keydown", e => {
        if (e.key === "Enter") handleSearch();
      });
    });

    // Dialog dismissal: × button, click-outside, Escape key
    $dialogClose.addEventListener("click", closeDialog);
    $dialog.addEventListener("click", e => {
      if (e.target === $dialog) closeDialog();
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") closeDialog();
    });
  }

  // -------------------------------------------------------------------------
  // Search flow
  // -------------------------------------------------------------------------
  async function handleSearch() {
    const query = $query.value.trim();
    if (!query) {
      flash("Please type something to search.", true);
      return;
    }

    const filters = {
      type: $typeFilter.value || "",
      year: $yearFilter.value || ""
    };

    persistSearch(query, filters);
    flash("Searching…");
    $grid.innerHTML = "";
    $searchBtn.disabled = true;

    try {
      const data = await OMDB.search(query, filters);
      flash(`Showing ${data.Search.length} of ${data.totalResults} matches.`);
      renderCards(data.Search);
    } catch (err) {
      // OMDB module already produced a friendly message
      flash(err.message, true);
    } finally {
      $searchBtn.disabled = false;
    }
  }

  function handleClear() {
    $query.value = "";
    $typeFilter.value = "";
    $yearFilter.value = "";
    $grid.innerHTML = "";
    flash("");
    localStorage.removeItem(LS_KEY);
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  function renderCards(items) {
    const fragment = document.createDocumentFragment();
    for (const item of items) {
      fragment.appendChild(buildCard(item));
    }
    $grid.appendChild(fragment);
  }

  function buildCard(item) {
    const card = document.createElement("article");
    card.className = "card";
    card.tabIndex = 0;
    card.addEventListener("click", () => showDetails(item.imdbID));
    card.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        showDetails(item.imdbID);
      }
    });

    const poster = posterOrFallback(item.Poster, item.Title);

    card.innerHTML = `
      <div class="poster"><img src="${poster}" alt="" loading="lazy" /></div>
      <div class="card-body">
        <h3 class="card-title">${escape(item.Title)}</h3>
        <p class="card-meta">${escape(item.Year)} · ${escape(item.Type)}</p>
      </div>
    `;
    return card;
  }

  // -------------------------------------------------------------------------
  // Detail dialog
  // -------------------------------------------------------------------------
  async function showDetails(imdbID) {
    flash("Loading details…");
    try {
      const movie = detailCache.has(imdbID)
        ? detailCache.get(imdbID)
        : await OMDB.getById(imdbID);
      detailCache.set(imdbID, movie);
      renderDialog(movie);
      flash("");
    } catch (err) {
      flash(err.message, true);
    }
  }

  function renderDialog(m) {
    const poster = posterOrFallback(m.Poster, m.Title);

    $dialogBody.innerHTML = `
      <div class="detail">
        <img src="${poster}" alt="" />
        <div class="detail-info">
          <h2>${escape(m.Title)}</h2>
          <p class="detail-meta">
            <span>${escape(m.Year)}</span>
            <span>·</span>
            <span>${escape(m.Rated || "N/A")}</span>
            <span>·</span>
            <span>${escape(m.Runtime || "N/A")}</span>
          </p>
          <dl class="detail-fields">
            <dt>Genre</dt>     <dd>${escape(m.Genre   || "N/A")}</dd>
            <dt>Director</dt>  <dd>${escape(m.Director|| "N/A")}</dd>
            <dt>Writer</dt>    <dd>${escape(m.Writer  || "N/A")}</dd>
            <dt>Cast</dt>      <dd>${escape(m.Actors  || "N/A")}</dd>
            <dt>IMDB</dt>      <dd>${escape(m.imdbRating || "N/A")} (${escape(m.imdbVotes || "0")} votes)</dd>
          </dl>
          <p class="detail-plot">${escape(m.Plot || "")}</p>
        </div>
      </div>
    `;
    $dialog.classList.remove("hidden");
  }

  function closeDialog() {
    $dialog.classList.add("hidden");
    $dialogBody.innerHTML = "";
  }

  // -------------------------------------------------------------------------
  // LocalStorage persistence
  // -------------------------------------------------------------------------
  function persistSearch(query, filters) {
    const payload = { query, ...filters, ts: Date.now() };
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
  }

  function restoreLastSearch() {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    try {
      const last = JSON.parse(raw);
      if (!last || !last.query) return;
      $query.value      = last.query;
      $typeFilter.value = last.type || "";
      $yearFilter.value = last.year || "";
      // Re-run the search so the user sees the same view they left
      handleSearch();
    } catch {
      // Corrupted entry — wipe it
      localStorage.removeItem(LS_KEY);
    }
  }

  // -------------------------------------------------------------------------
  // Utility helpers
  // -------------------------------------------------------------------------
  function flash(text, isError = false) {
    $status.textContent = text;
    $status.classList.toggle("status-error", !!isError);
  }

  // OMDB sometimes returns "N/A" instead of a real poster URL.
  function posterOrFallback(url, title) {
    if (url && url !== "N/A") return url;
    const t = encodeURIComponent(title || "No Poster");
    return `https://placehold.co/300x420/1a1d2b/9aa1b1?text=${t}`;
  }

  // Minimal HTML escape — we drop user data into innerHTML in a couple of
  // places, so this prevents weird rendering and stops trivial injection
  // attempts from movie titles / plots.
  function escape(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g,  "&amp;")
      .replace(/</g,  "&lt;")
      .replace(/>/g,  "&gt;")
      .replace(/"/g,  "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
