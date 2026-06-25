import { request } from "./api";

export const ChatService = {
  async getSession(id: string) {
    return request(`/sessions/${id}`);
  },

  async acceptSession(id: string) {
    return request(`/sessions/${id}/accept`, {
      method: "POST",
    });
  },

  async rejectSession(id: string) {
    return request(`/sessions/${id}/reject`, {
      method: "POST",
    });
  },

  async endSession(id: string) {
    return request(`/sessions/${id}/end`, {
      method: "POST",
    });
  },

  async sendMessage(id: string, message: any) {
    return request(`/sessions/${id}/messages`, {
      method: "POST",
      body: JSON.stringify(message),
    });
  },
};
