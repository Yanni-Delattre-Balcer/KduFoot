
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export const getAuthHeaders = async (getAccessTokenSilently: () => Promise<string>) => {
    const token = await getAccessTokenSilently();
    return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
};

export const api = {
    get: async (url: string, getAccessTokenSilently: () => Promise<string>) => {
        const headers = await getAuthHeaders(getAccessTokenSilently);
        const response = await fetch(`${API_URL}${url}`, { headers });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    },
    post: async (url: string, body: any, getAccessTokenSilently: () => Promise<string>) => {
        const headers = await getAuthHeaders(getAccessTokenSilently);
        const response = await fetch(`${API_URL}${url}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    },
    put: async (url: string, body: any, getAccessTokenSilently: () => Promise<string>) => {
        const headers = await getAuthHeaders(getAccessTokenSilently);
        const response = await fetch(`${API_URL}${url}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    },
    delete: async (url: string, getAccessTokenSilently: () => Promise<string>) => {
        const headers = await getAuthHeaders(getAccessTokenSilently);
        const response = await fetch(`${API_URL}${url}`, {
            method: 'DELETE',
            headers,
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json(); // or true
    }
};
