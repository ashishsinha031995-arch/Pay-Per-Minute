import { useState, useEffect } from "react";
import { UserService } from "../services/user.service";

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refreshUserProfile = async (id: number) => {
    try {
      const data = await UserService.getUserProfile(id);
      if (data.success && data.user) {
        if (data.user.is_blocked === 1) {
          alert('Aapka account block kar diya gaya hai admin dwara. (Your account is blocked.)');
          logout();
        } else {
          setCurrentUser(data.user);
        }
      }
    } catch (err) {
      console.error("Error refreshing profile:", err);
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
