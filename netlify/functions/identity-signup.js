import { memberOnlyRoles } from "../../src/server/access.js";

export async function handler(event) {
  const { user } = JSON.parse(event.body || "{}");
  return {
    statusCode: 200,
    body: JSON.stringify({
      app_metadata: {
        ...(user?.app_metadata || {}),
        roles: memberOnlyRoles(user?.app_metadata?.roles),
      },
    }),
  };
}
