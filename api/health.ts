import { json, methodNotAllowed } from "./_shared/http.js";

export default {
  fetch(request: Request) {
    if (request.method !== "GET") return methodNotAllowed();
    return json({ status: "ok", service: "fabrica-api", version: "0.2.0" });
  },
};
