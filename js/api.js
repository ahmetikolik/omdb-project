// js/api.js
// Thin wrapper around the OMDB endpoints. Keeping the network code in its own
// file so the rest of the app doesn't care about URL building or fetch details.
// Author: Ahmet Yıldırım

const OMDB = (function () {
  // Personal OMDB API key. OMDB free keys are fine to ship in client code —
  // there is no real "secret" here, the key just rate-limits to 1000 req/day.
  const API_KEY = "13b65e04";
  const ENDPOINT = "https://www.omdbapi.com/";

  // Build a final URL with the api key always appended.
  function buildUrl(params) {
    const usp = new URLSearchParams({ apikey: API_KEY, ...params });
    return `${ENDPOINT}?${usp.toString()}`;
  }

  // Generic fetch helper. Throws a clean error so the UI layer doesn't have
  // to deal with raw HTTP details.
  async function call(params) {
    let resp;
    try {
      resp = await fetch(buildUrl(params));
    } catch (networkErr) {
      throw new Error("Network problem — check your connection.");
    }
    if (!resp.ok) {
      throw new Error(`OMDB returned HTTP ${resp.status}`);
    }
    const data = await resp.json();
    if (data.Response === "False") {
      // OMDB sends Response:"False" with an Error message on no-match
      throw new Error(data.Error || "No results.");
    }
    return data;
  }

  // ---- Public methods ------------------------------------------------------

  // Search by title. Optional filters: type ("movie"|"series"|"episode"), year.
  async function search(query, { type, year } = {}) {
    const params = { s: query };
    if (type) params.type = type;
    if (year) params.y = year;
    return call(params);
  }

  // Fetch full details for a single imdbID. Plot=full gives the longer summary.
  async function getById(imdbID) {
    return call({ i: imdbID, plot: "full" });
  }

  return { search, getById };
})();
