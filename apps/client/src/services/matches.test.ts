import { describe, it, expect } from "vitest";

import { Category } from "../types/exercise.types";

import { matchService } from "./matches";

describe("matchService", () => {
  describe("getAll", () => {
    it("should build query string from filters", () => {
      const url = matchService.getAll({
        category: Category.SENIORS,
        type: "match",
      });

      expect(url).toContain("/api/matches?");
      expect(url).toContain("category=Seniors");
      expect(url).toContain("type=match");
    });

    it("should skip undefined filters", () => {
      const url = matchService.getAll({
        category: Category.SENIORS,
      });

      expect(url).toContain("category=Seniors");
      expect(url).not.toContain("level=");
    });

    it("should return base URL with empty filters", () => {
      const url = matchService.getAll({});

      expect(url).toBe("/api/matches?");
    });

    it("should handle boolean filters", () => {
      const url = matchService.getAll({ include_past: true });

      expect(url).toContain("include_past=true");
    });

    it("should handle numeric filters", () => {
      const url = matchService.getAll({ limit: 20, radius_km: 50 });

      expect(url).toContain("limit=20");
      expect(url).toContain("radius_km=50");
    });
  });
});
