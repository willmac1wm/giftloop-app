export async function api(path, { method = "GET", json: body } = {}) {
  let response;
  try {
    response = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const error = new Error("The account service is not reachable from this preview.");
    error.status = 0;
    throw error;
  }
  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      const error = new Error("The account service is not reachable from this preview.");
      error.status = response.status;
      throw error;
    }
  }
  if (!response.ok) {
    const error = new Error(data.error || "Request failed.");
    error.status = response.status;
    throw error;
  }
  return data;
}

export function authErrorMessage(error) {
  const name = error?.name || "";
  const message = error?.message || "";
  if (name === "MissingIdentityError" || /not configured/i.test(message) || message === "Not Found" || error?.status === 404) {
    return "Identity is not turned on for this site yet. In Netlify, open Project configuration, then Identity, and enable it.";
  }
  if (error?.status === 401) return "That email or password did not match.";
  if (error?.status === 422) return message || "Use a real email and a longer password.";
  return message || "Sign-in failed.";
}
