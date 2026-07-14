export async function compressImage(
  file: File,
  { maxWidth = 2048, maxHeight = 2048, quality = 0.82 }: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<File> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) {
    return file;
  }

  // Create helper to load image
  const imageLoad = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = src;
    });

  try {
    const objectUrl = URL.createObjectURL(file);
    const img = await imageLoad(objectUrl);
    URL.revokeObjectURL(objectUrl);

    let width = img.width;
    let height = img.height;

    // Check if we need to resize
    if (width > maxWidth || height > maxHeight) {
      const ratio = width / height;
      if (width > height) {
        width = maxWidth;
        height = Math.round(width / ratio);
      } else {
        height = maxHeight;
        width = Math.round(height * ratio);
      }
    } else {
      // If the image is already smaller than the max resolution, we still run it through
      // canvas compression unless it is already very small (e.g. < 500KB).
      // This is because high-quality PNGs or uncompressed JPEGs can be quite large.
      if (file.size < 500 * 1024) {
        return file;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return file;
    }

    // Draw image
    ctx.drawImage(img, 0, 0, width, height);

    // Export to Blob
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          // Convert blob back to a File. Use jpeg type to reduce size significantly.
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          
          // Return the smaller of the two files
          if (compressedFile.size < file.size) {
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        quality
      );
    });
  } catch (e) {
    console.error("Image compression failed, using original file:", e);
    return file;
  }
}

export async function runWithConcurrency<T, R>(
  limit: number,
  items: T[],
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const index = currentIndex;
      currentIndex++;
      try {
        results[index] = await fn(items[index], index);
      } catch (err) {
        // Individual tasks handles their errors, but we rethrow just in case
        throw err;
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}
