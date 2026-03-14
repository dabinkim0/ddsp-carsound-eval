export function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers
  });
}

export function errorResponse(status, message, extras = {}) {
  return json(
    {
      success: false,
      message,
      ...extras
    },
    { status }
  );
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function getAdminToken(request) {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  const fallback = request.headers.get("x-admin-token");
  return fallback ? fallback.trim() : "";
}

export function requireAdmin(request, env) {
  const expected = env.ADMIN_TOKEN;
  if (!expected) {
    return errorResponse(500, "ADMIN_TOKEN is not configured.");
  }

  const token = getAdminToken(request);
  if (!token || token !== expected) {
    return errorResponse(401, "Unauthorized.");
  }

  return null;
}

export function toInt(value) {
  return typeof value === "number" ? value : Number.parseInt(value || "0", 10);
}
