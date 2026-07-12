export function getLocalStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error("Error reading localStorage key", key, error);
    return defaultValue;
  }
}

export function setLocalStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Error setting localStorage key", key, error);
  }
}

/**
 * Compresses any image in base64 format (JPEG/PNG/etc) to be under maxBytes (e.g., 50KB).
 * It preserves high visual quality by trying higher qualities first, and iteratively
 * reducing JPEG quality or downscaling dimensions slightly if necessary.
 */
export function compressImageBase64(
  base64Str: string,
  maxBytes: number = 50 * 1024,
  maxDimension: number = 1000
): Promise<string> {
  return new Promise((resolve) => {
    if (!base64Str) {
      resolve(base64Str);
      return;
    }

    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        // Resize dimensions if they exceed maxDimension initially
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64Str);
          return;
        }

        let quality = 0.85;
        let scale = 1.0;
        let resultBase64 = '';
        let attempts = 0;

        const attemptCompression = () => {
          attempts++;
          canvas.width = Math.round(width * scale);
          canvas.height = Math.round(height * scale);

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Fill white background in case of PNG transparency converting to JPEG
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Standard quality factors: 0.85, 0.7, 0.5, 0.3
          resultBase64 = canvas.toDataURL('image/jpeg', quality);
          const currentSizeInBytes = resultBase64.length * 0.75;

          if (currentSizeInBytes <= maxBytes || attempts > 15) {
            console.log(`[Compression Utility] Image compressed successfully after ${attempts} attempt(s). Output size: ${(currentSizeInBytes / 1024).toFixed(2)}KB (Quality: ${quality}, Dimensions: ${canvas.width}x${canvas.height})`);
            resolve(resultBase64);
          } else {
            // Adjust params and try again
            if (quality > 0.35) {
              quality -= 0.15;
            } else {
              scale *= 0.8;
              quality = 0.5; // Reset quality to a reasonable value for smaller canvas
            }
            attemptCompression();
          }
        };

        attemptCompression();
      } catch (err) {
        console.error('[Compression Utility] Error during image compression process:', err);
        resolve(base64Str);
      }
    };

    img.onerror = (err) => {
      console.error('[Compression Utility] Image element failed to load source:', err);
      resolve(base64Str);
    };
  });
}

