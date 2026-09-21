import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:5000";

export function getToken() {
  return localStorage.getItem("token") || "";
}

function encerrarSessao() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");

  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
}

export function getAuthHeaders(headers = {}) {
  const token = getToken();

  return token
    ? { ...headers, Authorization: `Bearer ${token}` }
    : headers;
}

export async function apiFetch(path, options = {}) {
  const headers = getAuthHeaders(options.headers || {});

  const resposta = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (resposta.status === 401) {
    encerrarSessao();
  }

  return resposta;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    if (erro.response?.status === 401) {
      encerrarSessao();
    }

    return Promise.reject(erro);
  }
);
