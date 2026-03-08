
import { CreateMatchDto, UpdateMatchDto, MatchFilters, ContactMatchDto } from '../types/match.types';
import { handleResponse } from './api';

const BASE_URL = '/api/matches';

export const matchService = {
    getAll: (filters: MatchFilters) => {
        const query = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined) query.append(key, String(value));
        });
        return `${BASE_URL}?${query.toString()}`;
    },

    create: async (data: CreateMatchDto, token: string) => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}${BASE_URL}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    update: async (id: string, data: UpdateMatchDto, token: string) => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}${BASE_URL}/${id}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    delete: async (id: string, token: string) => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}${BASE_URL}/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        return handleResponse(response);
    },

    contact: async (id: string, data: ContactMatchDto, token: string) => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}${BASE_URL}/${id}/contact`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    getRequests: async (token: string) => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}${BASE_URL}/requests`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
        });
        return handleResponse(response);
    },

    getParticipations: async (token: string) => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}${BASE_URL}/participations`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
        });
        return handleResponse(response);
    },

    updateRequestStatus: async (matchId: string, userId: string, status: 'accepted' | 'refused', token: string) => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}${BASE_URL}/${matchId}/requests/${userId}`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status }),
        });
        return handleResponse(response);
    },

    cancelRequest: async (matchId: string, userId: string, token: string) => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}${BASE_URL}/${matchId}/requests/${userId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        return handleResponse(response);
    },

    markNotificationsAsRead: async (matchId: string, token: string) => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}${BASE_URL}/${matchId}/notifications/read`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
        });
        return handleResponse(response);
    },

    generatePairings: async (matchId: string, token: string) => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}${BASE_URL}/${matchId}/pairings/generate`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });
        return handleResponse(response);
    },

    getPairings: async (matchId: string, token: string) => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}${BASE_URL}/${matchId}/pairings`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
        });
        return handleResponse(response);
    },

    updatePairingTime: async (pairingId: string, scheduledTime: string, token: string) => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}${BASE_URL}/pairings/${pairingId}`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ scheduled_time: scheduledTime }),
        });
        return handleResponse(response);
    },

    closeRegistrations: async (id: string, token: string) => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}${BASE_URL}/${id}/close-registrations`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
        });
        return handleResponse(response);
    }
};
