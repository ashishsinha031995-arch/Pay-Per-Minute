export function checkAuthToken(): boolean {
  return !!localStorage.getItem("logged_user_id") || !!localStorage.getItem("consultant_session");
}
