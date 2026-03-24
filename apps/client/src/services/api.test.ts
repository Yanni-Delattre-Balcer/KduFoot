import { describe, it, expect, vi, beforeEach } from "vitest";
import { api, getAuthHeaders } from "./api";

// Mock import.meta.env
vi.stubGlobal("import", {
  meta: { env: { API_BASE_URL: "https://api.test.com" } },
});

// Mock fetch globally
const mockFetch = vi.fn();

vi.stubGlobal("fetch", mockFetch);

const mockGetToken = vi.fn().mockResolvedValue("test-token-123");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getAuthHeaders", () => {
  it("should return headers with Bearer token", async () => {
    const headers = await getAuthHeaders(mockGetToken);

    expect(headers).toEqual({
      Authorization: "Bearer test-token-123",
      "Content-Type": "application/json",
    });
  });

  it("should call getAccessTokenSilently", async () => {
    await getAuthHeaders(mockGetToken);
    expect(mockGetToken).toHaveBeenCalledOnce();
  });
});

describe("api", () => {
  describe("get", () => {
    it("should make GET request with auth headers", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "Content-Type": "application/json" }),
        json: () => Promise.resolve({ success: true }),
      });

      const result = await api.get("/test", mockGetToken);

      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/test"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token-123",
          }),
        }),
      );
    });

    it("should throw on non-ok response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Server Error"),
      });

      await expect(api.get("/test", mockGetToken)).rejects.toThrow(
        "Server Error",
      );
    });

    it("should throw on non-JSON response", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "Content-Type": "text/html" }),
        json: () => Promise.resolve({}),
      });

      await expect(api.get("/test", mockGetToken)).rejects.toThrow(
        "Invalid response format",
      );
    });
  });

  describe("post", () => {
    it("should make POST request with body", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "Content-Type": "application/json" }),
        json: () => Promise.resolve({ id: "123" }),
      });

      const result = await api.post("/test", { name: "test" }, mockGetToken);

      expect(result).toEqual({ id: "123" });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/test"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "test" }),
        }),
      );
    });
  });

  describe("delete", () => {
    it("should make DELETE request", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "Content-Type": "application/json" }),
        json: () => Promise.resolve({ success: true }),
      });

      await api.delete("/test/123", mockGetToken);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/test/123"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });
});
