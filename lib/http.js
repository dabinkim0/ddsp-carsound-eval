export function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

export function sendError(res, status, message, extras = {}) {
  sendJson(res, status, {
    success: false,
    message,
    ...extras
  });
}

export function getBody(req) {
  if (!req.body) {
    return null;
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }

  return req.body;
}

export function getAdminToken(req) {
  const base64Header = req.headers["x-admin-token-b64"];
  if (base64Header) {
    try {
      return Buffer.from(String(base64Header).trim(), "base64").toString("utf8").trim();
    } catch {
      return "";
    }
  }

  const authHeader = req.headers.authorization || "";
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  const fallback = req.headers["x-admin-token"];
  return fallback ? String(fallback).trim() : "";
}

export function requireMethod(req, res, method) {
  if (req.method !== method) {
    sendError(res, 405, "Method not allowed.");
    return false;
  }

  return true;
}

export function requireAdmin(req, res) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    sendError(res, 500, "ADMIN_TOKEN is not configured.");
    return false;
  }

  const provided = getAdminToken(req);
  if (!provided || provided !== expected) {
    sendError(res, 401, "Unauthorized.");
    return false;
  }

  return true;
}

export function toInt(value) {
  return typeof value === "number" ? value : Number.parseInt(value || "0", 10);
}
