import { afterEach, describe, expect, it, vi } from "vitest";
import { requestJsonWithFetch } from "../src/ai";

describe("UXP AI network adapter", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("rejects non-HTTPS compatible endpoints", async () => {
    await expect(requestJsonWithFetch({ url: "http://localhost/chat/completions" })).rejects.toThrow("must use HTTPS");
  });

  it("posts JSON with fetch and returns response text", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => "{\"ok\":true}" });
    vi.stubGlobal("fetch", fetchMock);
    await expect(requestJsonWithFetch({
      url: "https://api.example.com/chat/completions",
      timeoutMs: 100,
      headers: { Authorization: "Bearer test" },
      body: { model: "test" }
    })).resolves.toBe("{\"ok\":true}");
    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: "POST", credentials: "omit" }));
  });
});
