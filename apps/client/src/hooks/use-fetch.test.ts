import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// Mock Auth0
const mockGetToken = vi.fn().mockResolvedValue("test-token");

vi.mock("@auth0/auth0-react", () => ({
  useAuth0: () => ({
    getAccessTokenSilently: mockGetToken,
  }),
}));

// Must import after mocks
const { useFetch } = await import("./use-fetch");

const mockFetch = vi.fn();

vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useFetch", () => {
  it("should return a request function", () => {
    const { result } = renderHook(() => useFetch());

    expect(result.current.request).toBeDefined();
    expect(typeof result.current.request).toBe("function");
  });

  it("should make authenticated requests", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: "test" }),
    });

    const { result } = renderHook(() => useFetch());
    const data = await result.current.request("/api/test");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/test"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
    expect(data).toEqual({ data: "test" });
  });

  it("should retry on 401 with fresh token", async () => {
    const freshToken = "fresh-token";

    mockGetToken
      .mockResolvedValueOnce("expired-token")
      .mockResolvedValueOnce(freshToken);

    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ refreshed: true }),
      });

    const { result } = renderHook(() => useFetch());
    const data = await result.current.request("/api/test");

    expect(data).toEqual({ refreshed: true });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("should throw on non-401 errors", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: "Server Error" }),
    });

    const { result } = renderHook(() => useFetch());

    await expect(result.current.request("/api/test")).rejects.toThrow(
      "Server Error",
    );
  });
});
