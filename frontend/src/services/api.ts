import { API_BASE_URL } from "../utils/constants";

export async function request<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  const contentType = response.headers.get("content-type");
  let data: any = null;

  if (contentType && contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch (err) {
      console.error("Failed to parse JSON response:", err);
    }
  }

  if (!response.ok) {
    const errorMsg = (data && data.error) || `Server returned status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}
