import { request } from "./api";

export const PaymentService = {
  async createOrder(body: { consultant_id: number; duration_minutes: number; user_name: string }) {
    return request("/payments/create-order", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async verifyPayment(body: any) {
    return request("/payments/verify", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};
