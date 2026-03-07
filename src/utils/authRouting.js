/**
 * Returns the default path after login/register for a user.
 * Can be extended to role-based routes later.
 */
export function getHomePathForUser(user) {
  return '/dashboard'
}
