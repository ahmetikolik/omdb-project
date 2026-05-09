// js/app.js
// UI + state. Talks to OMDB module via window.OMDB, renders results,
// manages the detail dialog, the favorites list, and persists everything
// to localStorage.
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
  const $noFavorites  = document.getElementById("noFavorites");
  const $dialog       = document.getElementById("dialog");
  const $dialogBody   = document.getElementById("dialogBody");
  const $dialogClose  = document.getElementById("dialogClose");
  const $chips        = document.querySelectorAll(".chip");
  const $favToggle    = document.getElementById("favoritesToggle");
  const $favCount     = document.getElementById("favoritesCount");

  // Local storage keys (namespaced)
  const LS_KEY      = "movieFinder:lastSearch";
  const LS_FAV_KEY  = "movieFinder:favorites";

  // In-memory cache for movie detail responses (per session)
  const detailCache = new Map();

  // Favorites: { imdbID: { Title, Year, Type, Poster, imdbID } }
  let favorites = loadFavorites();

  // View mode: "search" (default) or "favorites"
  let viewMode = "search";

  // -------------------------------------------------------------------------
  // Boot
  // -------------------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", () => {
    buildSkeleton();
    bindEvents();
    refreshFavBadge();
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

    // Suggestion chips
    $chips.forEach(chip => {
      chip.addEventListener("click", () => {
        $query.value = chip.dataset.q;
        $typeFilter.value = "";
        $yearFilter.value = "";
        handleSearch();
      });
    });

    // Favorites toggle (top-right button)
    $favToggle.addEventListener("click", () => {
      if (viewMode === "favorites") {
        switchToSearch();
      } else {
        switchToFavorites();
      }
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
  // Skeleton loader
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
  // View mode helpers
  // -------------------------------------------------------------------------
  function showWelcome() {
    $welcome.classList.remove("hidden");
    $empty.classList.add("hidden");
    $noFavorites.classList.add("hidden");
    $skeleton.classList.add("hidden");
    $grid.innerHTML = "";
  }

  function showSkeleton() {
    $welcome.classList.add("hidden");
    $empty.classList.add("hidden");
    $noFavorites.classList.add("hidden");
    $skeleton.classList.remove("hidden");
    $grid.innerHTML = "";
  }

  function showResults() {
    $welcome.classList.add("hidden");
    $empty.classList.add("hidden");
    $noFavorites.classList.add("hidden");
    $skeleton.classList.add("hidden");
  }

  function showEmpty() {
    $welcome.classList.add("hidden");
    $skeleton.classList.add("hidden");
    $noFavorites.classList.add("hidden");
    $grid.innerHTML = "";
    $empty.classList.remove("hidden");
  }

  function showNoFavorites() {
    $welcome.classList.add("hidden");
    $skeleton.classList.add("hidden");
    $empty.classList.add("hidden");
    $grid.innerHTML = "";
    $noFavorites.classList.remove("hidden");
  }

  // -------------------------------------------------------------------------
  // Search flow
  // -------------------------------------------------------------------------
  async function handleSearch() {
    // If we were in favorites view, switching to a search drops it
    if (viewMode === "favorites") switchToSearch();

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
    if (viewMode === "favorites") {
      renderFavoritesView();
    } else {
      showWelcome();
    }
  }

  // -------------------------------------------------------------------------
  // Favorites
  // -------------------------------------------------------------------------
  function loadFavorites() {
    try {
      return JSON.parse(localStorage.getItem(LS_FAV_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveFavorites() {
    localStorage.setItem(LS_FAV_KEY, JSON.stringify(favorites));
  }

  function isFavorite(imdbID) {
    return Object.prototype.hasOwnProperty.call(favorites, imdbID);
  }

  function toggleFavorite(item, btnEl) {
    if (isFavorite(item.imdbID)) {
      delete favorites[item.imdbID];
      btnEl.classList.remove("active");
      btnEl.textContent = "☆";
      btnEl.setAttribute("aria-label", "Add to favorites");
    } else {
      favorites[item.imdbID] = {
        imdbID: item.imdbID,
        Title:  item.Title,
        Year:   item.Year,
        Type:   item.Type,
        Poster: item.Poster
      };
      btnEl.classList.add("active");
      btnEl.textContent = "★";
      btnEl.setAttribute("aria-label", "Remove from favorites");
    }
    saveFavorites();
    refreshFavBadge();

    // If we're currently in favorites view, re-render to drop the unfavorited card
    if (viewMode === "favorites") {
      renderFavoritesView();
    }
  }

  function refreshFavBadge() {
    const count = Object.keys(favorites).length;
    $favCount.textContent = String(count);
    $favCount.classList.toggle("hidden", count === 0);
  }

  function switchToFavorites() {
    viewMode = "favorites";
    $favToggle.classList.add("active");
    flash("");
    renderFavoritesView();
  }

  function switchToSearch() {
    viewMode = "search";
    $favToggle.classList.remove("active");
  }

  function renderFavoritesView() {
    const items = Object.values(favorites);
    if (items.length === 0) {
      showNoFavorites();
      flash("");
      return;
    }
    showResults();
    flash(`You have ${items.length} favorite${items.length > 1 ? "s" : ""}.`);
    renderCards(items);
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
    const isFav = isFavorite(item.imdbID);

    card.innerHTML = `
      <div class="poster">
        <button type="button"
                class="fav-btn ${isFav ? "active" : ""}"
                aria-label="${isFav ? "Remove from favorites" : "Add to favorites"}"
                data-imdb="${escape(item.imdbID)}">${isFav ? "★" : "☆"}</button>
        <span class="card-badge">${escape(item.Type || "")}</span>
        <img src="${poster}" alt="" loading="lazy" />
      </div>
      <div class="card-body">
        <h3 class="card-title">${escape(item.Title)}</h3>
        <p class="card-meta">${escape(item.Year)}</p>
      </div>
    `;

    // Star button: stop propagation so clicking it doesn't open the dialog
    const favBtn = card.querySelector(".fav-btn");
    favBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(item, favBtn);
    });

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
  // LocalStorage persistence (search)
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
