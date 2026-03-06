/**
 * Carga y registra una fuente personalizada en el navegador
 */
export async function loadCustomFont(name: string, file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      if (!arrayBuffer) {
        reject(new Error('No se pudo leer el archivo de fuente'));
        return;
      }

      try {
        const fontFace = new FontFace(name, arrayBuffer);
        const loadedFace = await fontFace.load();
        (document.fonts as any).add(loadedFace);
        resolve(name);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Genera un sticker PNG con transparencia desde texto y una fuente
 */
export function generateTextSticker(
  text: string, 
  fontFamily: string, 
  color: 'white' | 'black',
  fontSize: number = 200
): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Configurar fuente para medir
  ctx.font = `${fontSize}px "${fontFamily}"`;
  const metrics = ctx.measureText(text);
  
  // Ajustar tamaño del canvas al texto (+ margen de seguridad)
  const padding = fontSize * 0.2;
  canvas.width = metrics.width + padding * 2;
  canvas.height = fontSize * 1.5; // Altura estimada para ascendentes/descendentes

  // Re-configurar contexto tras cambiar tamaño
  ctx.font = `${fontSize}px "${fontFamily}"`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = color === 'white' ? '#FFFFFF' : '#000000';

  // Dibujar texto en el centro
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  return canvas.toDataURL('image/png');
}
