/**
 * Compresses an image to a maximum dimension while maintaining aspect ratio.
 */
export const compressImage = (
  file: File,
  maxDim: number = 800,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();

      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height *= maxDim / width;
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width *= maxDim / height;
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

/**
 * Optimizes an image URL via Cloudflare Image Resizing.
 *
 * This uses the /cdn-cgi/image/ endpoint which automatically
 * converts images to AVIF or WebP based on browser support.
 */
export const getCloudflareOptimizedUrl = (
  url: string | undefined,
  options: { width?: number; quality?: number; format?: string } = {},
): string => {
  if (!url || url.startsWith("data:")) return url || "";

  // Bypass Cloudflare optimization in local development as /cdn-cgi/image/ only works on production domains
  const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  if (isLocal) return url;

  // If already a Cloudflare transformation URL, return as is
  if (url.includes("/cdn-cgi/image/")) return url;

  const { width, quality = 80, format = "auto" } = options;
  const params = [];

  if (width) params.push(`width=${width}`);
  params.push(`quality=${quality}`);
  params.push(`format=${format}`);

  const prefix = `/cdn-cgi/image/${params.join(",")}`;

  // If it's a relative path, prefix it
  if (url.startsWith("/")) {
    return `${prefix}${url}`;
  }

  // For external URLs, we assume they are proxied or on a domain
  // where /cdn-cgi/image/ is active.
  return `${prefix}/${url}`;
};
