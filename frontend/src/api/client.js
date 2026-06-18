const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export const apiClient = async (path, options = {}, token = null) => {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      `Cannot reach the API at ${API_BASE_URL}. Start the backend with: python3 manage.py runserver`
    );
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 404) {
      throw new ApiError("Server endpoint not found. Refresh the page and try again.", response.status);
    }
    if (response.status === 403) {
      throw new ApiError("You do not have permission for this action.", response.status);
    }
    let detail = data.detail;
    if (typeof detail === "object" && detail !== null) {
      detail = Object.entries(detail)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
        .join("; ");
    }
    if (!detail) {
      detail = Object.entries(data)
        .filter(([key]) => key !== "detail")
        .map(([key, value]) => {
          const text = Array.isArray(value) ? value.join(", ") : String(value);
          if (key === "category") {
            return "Please choose a category.";
          }
          if (key === "sku") {
            return text;
          }
          return `${key}: ${text}`;
        })
        .join(" ");
    }
    if (!detail) {
      detail = "Request failed.";
    }
    throw new ApiError(detail, response.status);
  }

  return data;
};

export const apiFormClient = async (path, options = {}, token = null) => {
  const headers = { ...(options.headers || {}) };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      `Cannot reach the API at ${API_BASE_URL}. Start the backend with: python3 manage.py runserver`
    );
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 404) {
      throw new ApiError("Server endpoint not found. Refresh the page and try again.", response.status);
    }
    if (response.status === 403) {
      throw new ApiError("You do not have permission for this action.", response.status);
    }
    let detail = data.detail;
    if (typeof detail === "object" && detail !== null) {
      detail = Object.entries(detail)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
        .join("; ");
    }
    if (!detail) {
      detail = Object.entries(data)
        .filter(([key]) => key !== "detail")
        .map(([key, value]) => {
          const text = Array.isArray(value) ? value.join(", ") : String(value);
          if (key === "category") {
            return "Please choose a category.";
          }
          if (key === "sku") {
            return text;
          }
          if (key === "image") {
            return "Please upload a valid image file (JPG or PNG).";
          }
          return `${key}: ${text}`;
        })
        .join(" ");
    }
    if (!detail) {
      detail = "Request failed.";
    }
    throw new ApiError(detail, response.status);
  }

  return data;
};
