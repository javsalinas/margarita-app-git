export interface Color {
  hex: string;
  rgb: { r: number; g: number; b: number };
}

export async function extractColorsFromImage(
  imageFile: File,
  numColors: number = 5
): Promise<Color[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      // Reducir tamaño para optimizar procesamiento
      const maxSize = 200;
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      if (!ctx) {
        reject(new Error('No se pudo obtener el contexto del canvas'));
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;

      // Recopilar todos los colores
      const colorMap: { [key: string]: number } = {};

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];

        // Ignorar píxeles transparentes
        if (a < 128) continue;

        // Cuantizar colores (reducir precisión)
        const qr = Math.round(r / 10) * 10;
        const qg = Math.round(g / 10) * 10;
        const qb = Math.round(b / 10) * 10;

        const key = `${qr},${qg},${qb}`;
        colorMap[key] = (colorMap[key] || 0) + 1;
      }

      // Ordenar por frecuencia
      const sortedColors = Object.entries(colorMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, numColors * 3); // Tomar más colores para filtrar

      // Filtrar colores similares y seleccionar los más distintos
      const selectedColors: Color[] = [];
      
      for (const [colorKey] of sortedColors) {
        const [r, g, b] = colorKey.split(',').map(Number);
        
        // Verificar si es suficientemente diferente de los ya seleccionados
        const isDifferent = selectedColors.every(existing => {
          const distance = Math.sqrt(
            Math.pow(existing.rgb.r - r, 2) +
            Math.pow(existing.rgb.g - g, 2) +
            Math.pow(existing.rgb.b - b, 2)
          );
          return distance > 50; // Umbral de diferencia
        });

        if (isDifferent) {
          selectedColors.push({
            hex: rgbToHex(r, g, b),
            rgb: { r, g, b }
          });
        }

        if (selectedColors.length >= numColors) break;
      }

      resolve(selectedColors);
    };

    img.onerror = () => reject(new Error('Error al cargar la imagen'));
    img.src = URL.createObjectURL(imageFile);
  });
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b]
    .map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    })
    .join('');
}
