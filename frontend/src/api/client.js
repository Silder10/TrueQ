const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

let csrfToken = null;
let csrfTokenPromise = null;

/**
 * Auth por cookie de sesión (Flask-Login), no JWT: el navegador maneja la
 * cookie sola gracias a credentials:'include'. Lo único que hay que llevar
 * a mano es el token CSRF, que se pide una vez y se reenvía en el header
 * X-CSRFToken en cada POST/PUT/DELETE — es el equivalente SPA del
 * {{ form.hidden_tag() }} que usaban las plantillas server-rendered.
 */
async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  if (!csrfTokenPromise) {
    csrfTokenPromise = fetch(`${API_BASE}/api/auth/csrf`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        csrfToken = data.csrf_token;
        return csrfToken;
      });
  }
  return csrfTokenPromise;
}

export function resetCsrfToken() {
  csrfToken = null;
  csrfTokenPromise = null;
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

async function request(path, { method = "GET", body, isFormData = false } = {}) {
  const headers = {};
  let finalBody = body;

  if (!isFormData && body !== undefined) {
    headers["Content-Type"] = "application/json";
    finalBody = JSON.stringify(body);
  }

  if (MUTATING_METHODS.has(method)) {
    headers["X-CSRFToken"] = await getCsrfToken();
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: finalBody,
    credentials: "include",
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.error || "Ocurrió un error inesperado.");
    error.status = response.status;
    error.fields = data?.fields;
    throw error;
  }

  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  postForm: (path, formData) => request(path, { method: "POST", body: formData, isFormData: true }),
  put: (path, body) => request(path, { method: "PUT", body }),
  putForm: (path, formData) => request(path, { method: "PUT", body: formData, isFormData: true }),
  delete: (path) => request(path, { method: "DELETE" }),
};

export function uploadUrl(filename) {
  return `${API_BASE}/static/uploads/${filename}`;
}
