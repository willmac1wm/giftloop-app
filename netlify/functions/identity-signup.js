export async function handler(event) {
  const { user } = JSON.parse(event.body || "{}");
  const roles = Array.isArray(user?.app_metadata?.roles) ? user.app_metadata.roles : [];
  return {
    statusCode: 200,
    body: JSON.stringify({
      app_metadata: {
        ...(user?.app_metadata || {}),
        roles: Array.from(new Set([...roles, "member"])),
      },
    }),
  };
}
