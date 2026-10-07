import test from "node:test";
import assert from "node:assert/strict";

import { resolveApiBaseUrl } from "./api.js";

test("respeita VITE_API_URL quando configurado", () => {
  assert.equal(
    resolveApiBaseUrl({ VITE_API_URL: "https://api.exemplo.com", DEV: false }),
    "https://api.exemplo.com"
  );
});

test("usa URL relativa em desenvolvimento para funcionar com proxy do Vite", () => {
  assert.equal(resolveApiBaseUrl({ VITE_API_URL: "", DEV: true }), "");
});
