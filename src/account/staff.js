export function staffAccess(user) {
  const roles = [
    ...(Array.isArray(user?.roles) ? user.roles : []),
    ...(Array.isArray(user?.appMetadata?.roles) ? user.appMetadata.roles : []),
    ...(Array.isArray(user?.app_metadata?.roles) ? user.app_metadata.roles : []),
  ];
  if (roles.includes("admin") || roles.includes("administrator")) return "admin";
  if (roles.includes("support")) return "support";
  return "";
}
