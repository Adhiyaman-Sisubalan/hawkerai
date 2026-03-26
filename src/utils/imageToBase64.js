/**
 * imageToBase64.js
 * Converts a File object (from a file input element) to a raw base64 string,
 * with the "data:image/...;base64," prefix stripped.
 *
 * @param {File} file
 * @returns {Promise<string>} Raw base64 string (no data URI prefix)
 */
export function imageToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!(file instanceof File)) {
      reject(new TypeError('Expected a File object'));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = reader.result;
      // dataUrl format: "data:<mediaType>;base64,<base64data>"
      const commaIndex = dataUrl.indexOf(',');
      if (commaIndex === -1) {
        reject(new Error('Unexpected FileReader result format'));
        return;
      }
      resolve(dataUrl.slice(commaIndex + 1));
    };

    reader.onerror = () => {
      reject(new Error(`FileReader error: ${reader.error?.message ?? 'unknown'}`));
    };

    reader.readAsDataURL(file);
  });
}
