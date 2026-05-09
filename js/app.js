// js/app.js
// UI + state. Talks to OMDB module via window.OMDB, renders results,
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
  const $skeleton     = document.getElementById("skeleton");
  const $welcome      = document.getElementById("welcome");
  const $empty        = document.getElementById("empty");
  const $dialog       = document.getElementById("dialog");
  const $dialogBody   = document.getElementById("dialogBody");
  const $dialogClose  = document.getElementById("dialogClose");
  const $chips        = document.querySelectorAll(".chip");

  // Local storage key (namespaced so it doesn't collide with anything)
  const LS_KEY = "movieFinder:lastSearch";

  // In-memory cache for movie detail responses (per-session).
  const detailCache = new Map();

  // -------------------------------------------------------------------------
  // Boot
  // -------------------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", () => {
    buildSkeleton();
    bindEvents();
    restoreLastSearch();
  });

  function bindEvents() {
    $searchBtn.addEventListener("click", handleSearch);
    $clearBtn.addEventListener("click", handleClear);

    [$query, $yearFilter].forEach(el => {
      el.addEventListener("keydown", e => {
        if (e.key === "Enter") handleSearch();
      });
    });

    // Suggestion chips: type the chip's query and run a search
    $chips.forEach(chip => {
      chip.addEventListener("click", () => {
        $query.value = chip.dataset.q;
        $typeFilter.value = "";
        $yearFilter.value = "";
        handleSearch();
      });
    });

    // Dialog dismissal
    $dialogClose.addEventListener("click", closeDialog);
    $dialog.addEventListener("click", e => {
      if (e.target === $dialog) closeDialog();
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") closeDialog();
    });
  }

  // -------------------------------------------------------------------------
  // Skeleton loader (8 placeholder cards)
  // -------------------------------------------------------------------------
  function buildSkeleton() {
    const skelCard = `
      <div class="skel-card">
        <div class="skel-poster"></div>
        <div class="skel-line"></div>
        <div class="skel-line short"></div>
      </div>
    `;
    $skeleton.innerHTML = skelCard.repeat(8);
  }

  // -------------------------------------------------------------------------
  // View state helpers
  // -------------------------------------------------------------------------
  function showWelcome() {
    $welcome.classList.remove("hidden");
    $empty.classList.add("hidden");
    $skeleton.classList.add("hidden");
    $grid.innerHTML = "";
  }

  function showSkeleton() {
    $welcome.classList.add("hidden");
    $empty.classList.add("hidden");
    $skeleton.classList.remove("hidden");
    $grid.innerHTML = "";
  }

  function showResults() {
    $welcome.classList.add("hidden");
    $empty.classList.add("hidden");
    $skeleton.classList.add("hidden");
  }

  function showEmpty() {
    $welcome.classList.add("hidden");
    $skeleton.classList.add("hidden");
    $grid.innerHTML = "";
    $empty.classList.remove("hidden");
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
    flash("");
    showSkeleton();
    $searchBtn.disabled = true;

    try {
      const data = await OMDB.search(query, filters);
      flash(`Showing ${data.Search.length} of ${data.totalResults} matches.`);
      showResults();
      renderCards(data.Search);
    } catch (err) {
      // No matches => empty state, real error => error message
      const msg = (err.message || "").toLowerCase();
      if (msg.includes("not found") || msg.includes("no results") || msg.includes("too many")) {
        showEmpty();
        flash("");
      } else {
        showWelcome();
        flash(err.message, true);
      }
    } finally {
      $searchBtn.disabled = false;
    }
  }

  function handleClear() {
    $query.value = "";
    $typeFilter.value = "";
    $yearFilter.value = "";
    flash("");
    localStorage.removeItem(LS_KEY);
    showWelcome();
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  function renderCards(items) {
    const fragment = document.createDocumentFragment();
    for (const item of items) {
      fragment.appendChild(buildCard(item));
    }
    $grid.innerHTML = "";
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
      <div class="poster">
        <span class="card-badge">${escape(item.Type)}</span>
        <img src="${poster}" alt="" loading="lazy" />
      </div>
      <div class="card-body">
        <h3 class="card-title">${escape(item.Title)}</h3>
        <p class="card-meta">${escape(item.Year)}</p>
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
    const hasRating = m.imdbRating && m.imdbRating !== "N/A";

    $dialogBody.innerHTML = `
      <div class="detail">
        <img src="${poster}" alt="" />
        <div class="detail-info">
          <h2>${escape(m.Title)}</h2>
          <div class="detail-meta">
            <span class="pill">${escape(m.Year)}</span>
            <span class="pill">${escape(m.Rated || "N/A")}</span>
            <span class="pill">${escape(m.Runtime || "N/A")}</span>
            <span class="pill">${escape(m.Type || "")}</span>
          </div>
          ${hasRating ? `
            <div class="detail-rating">
              <span class="detail-rating-star">★</span>
              <span><strong>${escape(m.imdbRating)}</strong>/10 · ${escape(m.imdbVotes || "0")} votes</span>
            </div>
          ` : ""}
          <dl class="detail-fields">
            <dt>Genre</dt>     <dd>${escape(m.Genre   || "N/A")}</dd>
            <dt>Director</dt>  <dd>${escape(m.Director|| "N/A")}</dd>
            <dt>Writer</dt>    <dd>${escape(m.Writer  || "N/A")}</dd>
            <dt>Cast</dt>      <dd>${escape(m.Actors  || "N/A")}</dd>
            ${m.Country ? `<dt>Country</dt><dd>${escape(m.Country)}</dd>` : ""}
            ${m.Language ? `<dt>Language</dt><dd>${escape(m.Language)}</dd>` : ""}
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
      handleSearch();
    } catch {
      localStorage.removeItem(LS_KEY);
    }
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  function flash(text, isError = false) {
    $status.textContent = text;
    $status.classList.toggle("status-error", !!isError);
  }

  function posterOrFallback(url, title) {
    if (url && url !== "N/A") return url;
    const t = encodeURIComponent(title || "No Poster");
    return `https://placehold.co/400x600/1f2434/9aa0b3?text=${t}`;
  }

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
