import * as core from "@actions/core";

import { publishQuickPlayMaps } from "../src/publishQuickPlayMaps.ts";
import { summon } from "../src/helpers/summon.ts";

// Mock the dependencies
jest.mock("@actions/core");
jest.mock("../src/helpers/summon.ts");

const mockCore = core as jest.Mocked<typeof core>;
const mockSummon = summon as jest.MockedFunction<typeof summon>;

const mockApiUrlLive = "https://dndbeyond.com/games/api";
const mockApiUrlStg = "https://stg.dndbeyond.com/games/api";

describe("publishQuickPlayMaps", () => {
  const mockInput = {
    live: {
      url: mockApiUrlLive,
      token: "live-token-123",
    },
    stg: {
      url: mockApiUrlStg,
      token: "stg-token-456",
    },
  };

  const mockMapsData = {
    data: [
      { id: 1, name: "Map 1", difficulty: "easy" },
      { id: 2, name: "Map 2", difficulty: "medium" },
      { id: 3, name: "Map 3", difficulty: "hard" },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("successful execution", () => {
    it("should successfully fetch maps from staging and publish to live", async () => {
      // Mock successful staging response
      const mockStagingResponse: Partial<Response> = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockMapsData),
        status: 200,
        statusText: "OK",
      };

      // Mock successful live response
      const mockLiveResponse: Partial<Response> = {
        ok: true,
        status: 200,
        statusText: "OK",
      };

      mockSummon
        .mockResolvedValueOnce(mockStagingResponse as Response)
        .mockResolvedValueOnce(mockLiveResponse as Response);

      await publishQuickPlayMaps(mockInput);

      // Verify staging API call
      expect(mockSummon).toHaveBeenCalledWith(
        `${mockApiUrlStg}/admin/prepared-maps`,
        {
          requestInit: {
            method: "GET",
            headers: {
              Authorization: "Bearer stg-token-456",
              "Content-Type": "application/json",
            },
          },
          timeout: 20_000,
          backoffOptions: {
            numOfAttempts: 5,
            startingDelay: 500,
            timeMultiple: 2,
          },
        }
      );

      // Verify live API call
      expect(mockSummon).toHaveBeenCalledWith(
        `${mockApiUrlLive}/admin/prepared-maps`,
        {
          requestInit: {
            method: "PUT",
            headers: {
              Authorization: "Bearer live-token-123",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              preparedMaps: mockMapsData.data,
            }),
          },
          timeout: 60_000,
          backoffOptions: {
            numOfAttempts: 5,
            startingDelay: 500,
            timeMultiple: 2,
          },
        }
      );

      // Verify core.info calls
      expect(mockCore.info).toHaveBeenCalledWith(
        "Fetched 3 prepared maps from staging."
      );
      expect(mockCore.info).toHaveBeenCalledWith(
        "Publishing prepared maps to live..."
      );
    });

    it("should handle empty maps data", async () => {
      const emptyMapsData = { data: [] };

      const mockStagingResponse: Partial<Response> = {
        ok: true,
        json: jest.fn().mockResolvedValue(emptyMapsData),
        status: 200,
        statusText: "OK",
      };

      const mockLiveResponse: Partial<Response> = {
        ok: true,
        status: 200,
        statusText: "OK",
      };

      mockSummon
        .mockResolvedValueOnce(mockStagingResponse as Response)
        .mockResolvedValueOnce(mockLiveResponse as Response);

      await publishQuickPlayMaps(mockInput);

      expect(mockCore.info).toHaveBeenCalledWith(
        "Fetched 0 prepared maps from staging."
      );
      expect(mockSummon).toHaveBeenCalledTimes(2);
    });
  });

  describe("error handling", () => {
    it("should throw error when staging API returns non-ok response", async () => {
      const mockStagingResponse: Partial<Response> = {
        ok: false,
        status: 404,
        statusText: "Not Found",
      };

      mockSummon.mockResolvedValueOnce(mockStagingResponse as Response);

      await expect(publishQuickPlayMaps(mockInput)).rejects.toThrow(
        "Failed to fetch prepared maps from staging: 404 Not Found"
      );

      expect(mockSummon).toHaveBeenCalledTimes(1);
    });

    it("should throw error when live API returns non-ok response", async () => {
      const mockStagingResponse: Partial<Response> = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockMapsData),
        status: 200,
        statusText: "OK",
      };

      const mockLiveResponse: Partial<Response> = {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      };

      mockSummon
        .mockResolvedValueOnce(mockStagingResponse as Response)
        .mockResolvedValueOnce(mockLiveResponse as Response);

      await expect(publishQuickPlayMaps(mockInput)).rejects.toThrow(
        "Failed to publish prepared maps to live: 500 Internal Server Error"
      );

      expect(mockSummon).toHaveBeenCalledTimes(2);
    });

    it("should throw error when staging response JSON parsing fails", async () => {
      const mockStagingResponse: Partial<Response> = {
        ok: true,
        json: jest.fn().mockRejectedValue(new Error("JSON parse error")),
        status: 200,
        statusText: "OK",
      };

      mockSummon.mockResolvedValueOnce(mockStagingResponse as Response);

      await expect(publishQuickPlayMaps(mockInput)).rejects.toThrow(
        "JSON parse error"
      );

      expect(mockSummon).toHaveBeenCalledTimes(1);
    });

    it("should throw error when summon fails for staging request", async () => {
      const networkError = new Error("Network error");
      mockSummon.mockRejectedValueOnce(networkError);

      await expect(publishQuickPlayMaps(mockInput)).rejects.toThrow(
        "Network error"
      );

      expect(mockSummon).toHaveBeenCalledTimes(1);
    });

    it("should throw error when summon fails for live request", async () => {
      const mockStagingResponse: Partial<Response> = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockMapsData),
        status: 200,
        statusText: "OK",
      };

      const networkError = new Error("Network error");
      mockSummon
        .mockResolvedValueOnce(mockStagingResponse as Response)
        .mockRejectedValueOnce(networkError);

      await expect(publishQuickPlayMaps(mockInput)).rejects.toThrow(
        "Network error"
      );

      expect(mockSummon).toHaveBeenCalledTimes(2);
    });
  });

  describe("API call parameters", () => {
    it("should use correct timeout values", async () => {
      const mockStagingResponse: Partial<Response> = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockMapsData),
        status: 200,
        statusText: "OK",
      };

      const mockLiveResponse: Partial<Response> = {
        ok: true,
        status: 200,
        statusText: "OK",
      };

      mockSummon
        .mockResolvedValueOnce(mockStagingResponse as Response)
        .mockResolvedValueOnce(mockLiveResponse as Response);

      await publishQuickPlayMaps(mockInput);

      // Check staging timeout (20 seconds)
      expect(mockSummon).toHaveBeenNthCalledWith(1, expect.any(String),
        expect.objectContaining({ timeout: 20_000 })
      );

      // Check live timeout (60 seconds)
      expect(mockSummon).toHaveBeenNthCalledWith(2, expect.any(String),
        expect.objectContaining({ timeout: 60_000 })
      );
    });

    it("should use correct backoff options", async () => {
      const mockStagingResponse: Partial<Response> = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockMapsData),
        status: 200,
        statusText: "OK",
      };

      const mockLiveResponse: Partial<Response> = {
        ok: true,
        status: 200,
        statusText: "OK",
      };

      mockSummon
        .mockResolvedValueOnce(mockStagingResponse as Response)
        .mockResolvedValueOnce(mockLiveResponse as Response);

      await publishQuickPlayMaps(mockInput);

      const expectedBackoffOptions = {
        numOfAttempts: 5,
        startingDelay: 500,
        timeMultiple: 2,
      };

      expect(mockSummon).toHaveBeenNthCalledWith(1, expect.any(String),
        expect.objectContaining({ backoffOptions: expectedBackoffOptions })
      );

      expect(mockSummon).toHaveBeenNthCalledWith(2, expect.any(String),
        expect.objectContaining({ backoffOptions: expectedBackoffOptions })
      );
    });
  });

  describe("data transformation", () => {
    it("should correctly transform staging data for live API", async () => {
      const customMapsData = {
        data: [
          { id: 10, name: "Custom Map", type: "custom" },
          { id: 11, name: "Another Map", type: "tournament" },
        ],
      };

      const mockStagingResponse: Partial<Response> = {
        ok: true,
        json: jest.fn().mockResolvedValue(customMapsData),
        status: 200,
        statusText: "OK",
      };

      const mockLiveResponse: Partial<Response> = {
        ok: true,
        status: 200,
        statusText: "OK",
      };

      mockSummon
        .mockResolvedValueOnce(mockStagingResponse as Response)
        .mockResolvedValueOnce(mockLiveResponse as Response);

      await publishQuickPlayMaps(mockInput);

      // Verify the data transformation
      expect(mockSummon).toHaveBeenNthCalledWith(2, expect.any(String),
        expect.objectContaining({
          requestInit: expect.objectContaining({
            body: JSON.stringify({
              preparedMaps: customMapsData.data,
            }),
          }),
        })
      );
    });
  });
});
