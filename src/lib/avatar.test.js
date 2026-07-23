import { describe, expect, it, vi } from "vitest";
import { compressAvatar } from "./avatar.js";

describe("compressAvatar", () => {
  it("rejects non-image files", async () => {
    await expect(compressAvatar({ type: "text/plain" })).rejects.toThrow(
      "请选择图片文件",
    );
  });

  it("uses a centered square crop", async () => {
    const drawImage = vi.fn();
    const image = { width: 1200, height: 800 };
    const result = await compressAvatar(
      { type: "image/jpeg" },
      {
        decode: async () => image,
        createCanvas: () => ({
          getContext: () => ({ drawImage }),
          toDataURL: () => "data:image/webp;base64,test",
        }),
      },
    );

    expect(drawImage).toHaveBeenCalledWith(
      image,
      200,
      0,
      800,
      800,
      0,
      0,
      384,
      384,
    );
    expect(result).toBe("data:image/webp;base64,test");
  });
});
