const browserAdapters = {
  decode: async (file) => createImageBitmap(file),
  createCanvas: () => document.createElement("canvas"),
};

export async function compressAvatar(file, adapters = browserAdapters) {
  if (!file?.type?.startsWith("image/")) {
    throw new Error("请选择图片文件");
  }

  const image = await adapters.decode(file);
  const size = Math.min(image.width, image.height);
  const sx = (image.width - size) / 2;
  const sy = (image.height - size) / 2;
  const canvas = adapters.createCanvas();
  canvas.width = 384;
  canvas.height = 384;

  const context = canvas.getContext("2d");
  context.drawImage(image, sx, sy, size, size, 0, 0, 384, 384);

  const result = canvas.toDataURL("image/webp", 0.82);
  if (result.length > 700_000) {
    throw new Error("图片过大，请选择另一张照片");
  }
  return result;
}
