import { request } from "./api";

export const AuthService = {
  async userSignUp(body: any) {
    return request("/user/signup", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async userLogin(body: any) {
    return request("/user/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async userForgotPassword(body: any) {
    return request("/user/forgot-password", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async userForgotPasswordSendCode(body: { email: string; role: string }) {
    return request("/user/forgot-password/send-code", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async userForgotPasswordVerifyReset(body: { email: string; role: string; code: string; new_password: string }) {
    return request("/user/forgot-password/verify-reset", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async consultantLogin(body: any) {
    return request("/consultants/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async consultantRegister(body: any) {
    return request("/consultants/register", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};
