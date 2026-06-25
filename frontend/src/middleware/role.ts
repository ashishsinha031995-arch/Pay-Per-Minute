export function checkRoleAccess(role: string, allowed: string[]): boolean {
  return allowed.includes(role);
}
