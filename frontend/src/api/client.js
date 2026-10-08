// In production the API is reached through the Vercel rewrite in vercel.json, so the session
// cookie is first-party. Calling Render directly makes it a third-party cookie, which Safari
// (and every iOS browser) blocks - users then look logged in but every request is a 401.
const BASE_URL = import.meta.env.PROD
  ? "/api"
  : import.meta.env.VITE_API_URL || "http://localhost:4000";

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const err = new Error(data?.error || `Request failed with status ${res.status}`);
    err.field = data?.field;
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  delete: (path) => request(path, { method: "DELETE" }),
};
