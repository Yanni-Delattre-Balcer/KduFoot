export const getAuthHeaders = async (
  getAccessTokenSilently: () => Promise<string>,
) => {
  const token = await getAccessTokenSilently();

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

const handleResponse = async <T>(response: Response): Promise<T> => {
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
  get: async <T>(
    url: string,
    getAccessTokenSilently: () => Promise<string>,
  ): Promise<T> => {
    const headers = await getAuthHeaders(getAccessTokenSilently);
    const response = await fetch(`${import.meta.env.API_BASE_URL}${url}`, {
      headers,
    });

    return handleResponse<T>(response);
  },
  post: async <T>(
    url: string,
    body: unknown,
    getAccessTokenSilently: () => Promise<string>,
  ): Promise<T> => {
    const headers = await getAuthHeaders(getAccessTokenSilently);
    const response = await fetch(`${import.meta.env.API_BASE_URL}${url}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    return handleResponse<T>(response);
  },
  put: async <T>(
    url: string,
    body: unknown,
    getAccessTokenSilently: () => Promise<string>,
  ): Promise<T> => {
    const headers = await getAuthHeaders(getAccessTokenSilently);
    const response = await fetch(`${import.meta.env.API_BASE_URL}${url}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });

    return handleResponse<T>(response);
  },
  delete: async <T>(
    url: string,
    getAccessTokenSilently: () => Promise<string>,
  ): Promise<T> => {
    const headers = await getAuthHeaders(getAccessTokenSilently);
    const response = await fetch(`${import.meta.env.API_BASE_URL}${url}`, {
      method: "DELETE",
      headers,
    });

    return handleResponse<T>(response);
  },
};
