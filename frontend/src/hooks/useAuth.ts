import { useState, useEffect } from "react";
import { UserService } from "../services/user.service";

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refreshUserProfile = async (id: number) => {
    if (!id || isNaN(id)) {
      setLoading(false);
      return;
    }
    try {
      const data = await UserService.getUserProfile(id);
      if (data.success && data.user) {
        if (data.user.is_blocked === 1) {
          if (data.user.suspended_until) {
            if (data.user.suspended_until === 'permanent') {
              alert('Your account has been permanently suspended by the admin due to Privacy Breach.');
            } else {
              const expiry = new Date(data.user.suspended_until).getTime();
              if (!isNaN(expiry)) {
                const diffMs = expiry - Date.now();
                const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                const unlockDateStr = new Date(data.user.suspended_until).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
                alert(`Your account has been suspended due to Privacy Breach. You will be able to log in again on ${unlockDateStr} (${daysRemaining} days remaining).`);
              } else {
                alert('Your account has been suspended by the admin due to Privacy Breach.');
              }
            }
          } else {
            alert('Your account has been blocked by the admin due to Privacy Breach.');
          }
          logout();
        } else {
          setCurrentUser(data.user);
        }
      }
    } catch (err) {
      console.warn("Could not refresh profile temporarily:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userId = localStorage.getItem("logged_user_id");
    if (userId) {
      refreshUserProfile(parseInt(userId, 10));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (user: any) => {
    setCurrentUser(user);
    localStorage.setItem("logged_user_id", user.id.toString());
  };

  const logout = () => {
    localStorage.removeItem("logged_user_id");
    setCurrentUser(null);
  };

  return { currentUser, setCurrentUser, loading, login, logout, refreshUserProfile };
}
