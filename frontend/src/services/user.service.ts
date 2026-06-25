import { request } from "./api";

export const UserService = {
  async getUserProfile(id: number) {
    return request(`/user/profile/${id}`);
  },

  async updateUserProfile(body: any) {
    return request("/user/update-profile", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async rechargeWallet(body: { id: number; amount: number }) {
    return request("/user/recharge", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async getWalletTransactions(userId: number) {
    return request(`/user/wallet-transactions/${userId}`);
  },

  async getPastSessions(query: string) {
    return request(`/user/sessions?${query}`);
  },

  async getActiveConsultants() {
    return request("/consultants");
  },

  async getConsultantProfile(username: string) {
    return request(`/consultants/profile/${username}`);
  },

  async updateConsultantStatus(id: number, status: { is_online?: number; is_busy?: number }) {
    return request(`/consultants/${id}/status`, {
      method: "PUT",
      body: JSON.stringify(status),
    });
  },

  async updateConsultantProfile(id: number, body: any) {
    return request(`/consultants/${id}/profile`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  async getConsultantStats(id: number) {
    return request(`/consultants/${id}/stats`);
  },

  async getConsultantReviews(id: number) {
    return request(`/consultants/${id}/reviews`);
  },

  async addConsultantReview(id: number, review: { user_name: string; rating: number; text?: string }) {
    return request(`/consultants/${id}/reviews`, {
      method: "POST",
      body: JSON.stringify(review),
    });
  },

  async blockUser(body: { consultant_id: number; user_name: string }) {
    return request("/consultants/block", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async unblockUser(body: { consultant_id: number; user_name: string }) {
    return request("/consultants/unblock", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async getBlockedUsers(id: number) {
    return request(`/consultants/${id}/blocked`);
  },
};
