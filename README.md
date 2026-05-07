# OMDB Movie Search Project

> **Submission by Ahmet Yıldırım** — Yıldız Technical University, Computer Engineering
> i2i Systems Summer Internship 2026 application.

A single page application (SPA) that searches movies, series and episodes through the [OMDB API](https://www.omdbapi.com/).
Built with plain HTML, CSS and JavaScript — no frameworks, no build step.

## 🔗 Live Demo

Once deployed, the app will be live at:
**`https://ahmetikolik.github.io/omdb-project/`**

## ✨ Features

- 🔎 Search any movie/series by title
- 🎯 Filter by **type** (movie / series / episode) and **year**
- 🎞️ Movie cards show poster, title and year
- 📋 Click a card to see full details — genre, director, writer, actors, IMDB rating, plot
- ⚠️ Clear error messages for "not found" and network errors
- ♻️ Multiple searches without refreshing
- 💾 Last search and your API key are saved to `localStorage`, so refreshing keeps your view
- 📱 Fully responsive — works on phone, tablet, desktop
- ⚡ Detail responses are cached in memory to avoid duplicate API calls

## 🛠️ How to Run Locally

1. Clone this repo:
   ```bash
   git clone https://github.com/ahmetikolik/omdb-project.git
   cd omdb-project
   ```

2. Get a free OMDB API key from [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx).

3. Open `index.html` in your browser. Any of these works:
   - Double click `index.html`
   - Or use a quick local server: `python -m http.server 8000` and open `http://localhost:8000`

4. The app will ask for your API key on first load. Paste it in — it's stored only in your browser's localStorage.

## 🚀 Deploy to GitHub Pages

In the repository on GitHub:
1. Settings → Pages
2. Source: `Deploy from a branch`
3. Branch: `main` / Folder: `/ (root)` → Save
4. Wait ~1 minute, then visit `https://ahmetikolik.github.io/omdb-project/`

## 📁 Project Structure

```
omdb-project/
├── index.html      # Main page
├── style.css       # All styling (dark theme, responsive grid)
├── script.js       # Search, fetch, render, modal, localStorage
└── README.md
```

## 🧠 Notes & Decisions

- **No build tools** — just open `index.html`. The brief said HTML/CSS/JS, so I kept it framework-free.
- **API key in localStorage** — instead of hardcoding it (which would leak it on GitHub Pages), the user enters their own key once and it stays in their browser. Safer and reusable.
- **Two-step UX** — search returns lightweight cards; full details only fetched when the user clicks a card. This keeps the initial render fast and saves API calls.
- **Detail cache** — clicking the same movie twice doesn't re-hit the API; results are cached in memory for the session.
- **Persistence on refresh** — the last search query, type filter and year filter are saved in `localStorage` and re-run when the page loads.

---

## Original Project Brief (from i2i Systems)

This project is designed to evaluate coding skills in web development. The application consumes the [OMDB API](http://www.omdbapi.com/) and must be a fully responsive Single Page Application showing movie details (title, year, genre, director, poster).

### Functional Requirements

1. **Movie Search Input** — users enter a name and search; bonus points for richer UI (filters).
2. **Display Movie Details** — at least Title, Year, Genre, Director, Poster.
3. **Error Handling** — clear messages on errors / not-found.
4. **Multiple Searches** — work without refresh; persist last search across refreshes.
5. **Backend Proxy** *(optional)* — handle API requests on a backend.

### Non-Functional Requirements

- **Performance** — efficient API calls, no needless repeats.
- **Usability** — simple, intuitive UI.
- **Portability** — works on modern browsers, responsive across screen sizes.
- **Maintainability** — modular, documented code.

### Deliverables

- A public GitHub repository with the project code.
- A hosted version on GitHub Pages.
