/* eslint-disable @typescript-eslint/no-explicit-any */
export const getAuthHeaders = async (
  getAccessTokenSilently: () => Promise<string>,
) => {
  const token = await getAccessTokenSilently();

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");

    throw new Error(errorText || `HTTP error! status: ${response.status}`);
  }
  const contentType = response.headers.get("Content-Type");

  if (!contentType || !contentType.includes("application/json")) {
    throw new Error("Invalid response format: Expected JSON");
  }

  return response.json();
};

export const api = {
  get: async (url: string, getAccessTokenSilently: () => Promise<string>) => {
    const headers = await getAuthHeaders(getAccessTokenSilently);
    const response = await fetch(`${import.meta.env.API_BASE_URL}${url}`, {
      headers,
    });

    return handleResponse(response);
  },
  post: async (
    url: string,
    body: any,
    getAccessTokenSilently: () => Promise<string>,
  ) => {
    const headers = await getAuthHeaders(getAccessTokenSilently);
    const response = await fetch(`${import.meta.env.API_BASE_URL}${url}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    return handleResponse(response);
  },
  put: async (
    url: string,
    body: any,
    getAccessTokenSilently: () => Promise<string>,
  ) => {
    const headers = await getAuthHeaders(getAccessTokenSilently);
    const response = await fetch(`${import.meta.env.API_BASE_URL}${url}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });

    return handleResponse(response);
  },
  delete: async (
    url: string,
    getAccessTokenSilently: () => Promise<string>,
  ) => {
    const headers = await getAuthHeaders(getAccessTokenSilently);
    const response = await fetch(`${import.meta.env.API_BASE_URL}${url}`, {
      method: "DELETE",
      headers,
    });

    return handleResponse(response);
  },
};
