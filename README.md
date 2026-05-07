# 🍿 Movie Finder — OMDB SPA

> **Submission by Ahmet Yıldırım** — Yıldız Technical University, Computer Engineering
> i2i Systems Summer Internship 2026 application.

A single-page web app that searches the [OMDB API](https://www.omdbapi.com/) and
displays movie details in a clean, responsive interface. Built with vanilla
HTML / CSS / JavaScript — no frameworks, no bundler, no build step.

## 🔗 Live demo

**`https://ahmetikolik.github.io/omdb-project/`**

(Hosted on GitHub Pages, deployed automatically from `main`.)

## ✨ Features

| | |
| --- | --- |
| 🔎 Title search with real-time error feedback | ✅ |
| 🎯 Filter by **type** (movie / series / episode) | ✅ |
| 📅 Filter by **release year** | ✅ |
| 🎴 Card grid with poster, title, year, type | ✅ |
| 🪟 Detail dialog: genre, director, writer, cast, IMDB rating, full plot | ✅ |
| ⚠️ Friendly error messages (network, not-found, HTTP errors) | ✅ |
| ♻️ Multiple searches with no page refresh | ✅ |
| 💾 Last search persists in `localStorage` (auto-restored on refresh) | ✅ |
| ⚡ Detail responses cached in memory (no duplicate API calls) | ✅ |
| 📱 Fully responsive (mobile, tablet, desktop) | ✅ |
| ⌨️ Keyboard accessible (Enter to open card, Esc to close dialog) | ✅ |

## 📁 Project layout

```
omdb-project/
├── index.html          # Page structure
├── css/
│   └── styles.css      # Theme + layout (deep navy + amber accent)
├── js/
│   ├── api.js          # OMDB endpoint wrapper (search, getById)
│   └── app.js          # UI logic, event handlers, dialog, localStorage
├── assets/             # (kept for future images / icons)
└── README.md
```

I split the JavaScript into two files on purpose:
- **`api.js`** owns network details: building URLs, calling `fetch`, throwing
  clean errors. The rest of the code never touches `fetch` directly.
- **`app.js`** owns UI: DOM refs, rendering, event handlers, the dialog, and
  localStorage. It calls `OMDB.search()` / `OMDB.getById()` like a small SDK.

That separation is overkill for ~250 lines of code, but it makes future changes
(e.g. adding a backend proxy or swapping the API) much easier.

## 🛠️ Run locally

```bash
git clone https://github.com/ahmetikolik/omdb-project.git
cd omdb-project
# any of these works:
python -m http.server 8000      # then open http://localhost:8000
# or just double-click index.html
```

The OMDB API key is already wired in (`13b65e04`), so the app works out of the
box. No `.env`, no setup.

## 🚀 Deploy to GitHub Pages

In the GitHub repo:
1. **Settings → Pages**
2. Source: `Deploy from a branch`
3. Branch: `main`, folder: `/ (root)`
4. Save → wait ~1 min → visit the live URL.

## 🧠 Decisions worth calling out

- **Two-step UX** — the search endpoint returns lightweight summaries (title,
  year, poster). Genre / director / plot only come from the detail endpoint, so
  I fetch those *only* when the user clicks a card. Keeps the initial search
  fast and saves API quota.
- **In-memory detail cache** — clicking the same card twice doesn't re-hit OMDB.
  A `Map` keyed by `imdbID` short-circuits the second fetch.
- **Persistence on refresh** — the last query and filter values are stored in
  `localStorage` and the search is automatically re-run when the page loads.
- **Poster fallback** — OMDB sometimes returns `"N/A"` instead of an image URL.
  The app substitutes a placeholder generated from the movie title so the grid
  never has broken-image holes.
- **HTML escape on user-controlled strings** — movie titles and plots are
  rendered through a small `escape()` helper before reaching `innerHTML`.
  Stops broken rendering and trivial XSS via crafted titles.
- **Keyboard accessible** — cards are focusable; Enter / Space opens them;
  Escape closes the dialog. Click-outside-to-close also works.

---

## Original brief (from i2i Systems)

A responsive Single Page Application that consumes the OMDB API and displays
movie details (title, year, genre, director, poster).

**Functional**

1. Movie search input — bonus for richer UI / filters.
2. Display movie details (title, year, genre, director, poster).
3. Error handling — clear messages on errors / not found.
4. Multiple searches without refresh; persist last search across refreshes.
5. (Optional) Backend proxy for API requests.

**Non-functional**

- Performance — efficient API usage, no needless repeats.
- Usability — simple, intuitive UI.
- Portability — modern browsers, responsive.
- Maintainability — modular, documented code.

**Deliverables**

- Public GitHub repository.
- Live site on GitHub Pages.
