export interface PreparedPlateImage {
  file: File;
  originalBytes: number;
  width: number;
  height: number;
}

export function plateImageSize(width: number, height: number) {
  const scale = Math.min(
    1,
    1568 / Math.max(width, height),
    Math.sqrt(1_200_000 / (width * height)),
  );
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
}

export async function preparePlateImage(
  file: File,
  signal: AbortSignal,
): Promise<PreparedPlateImage> {
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    file.size > 20 * 1024 * 1024 ||
    !file.size
  )
    throw new Error('Escolha uma foto JPG, PNG ou WebP de até 20 MB.');
  signal.throwIfAborted();
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('Não foi possível abrir a foto. Escolha outro arquivo JPG, PNG ou WebP.');
  });
  try {
    signal.throwIfAborted();
    if (bitmap.width * bitmap.height > 40_000_000)
      throw new Error('A imagem é muito grande. Recorte a região da placa.');
    const size = plateImageSize(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    let best: Blob | undefined;
    const target = Math.min(200 * 1024, file.size);
    for (;;) {
      canvas.width = size.width;
      canvas.height = size.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Não foi possível preparar a foto.');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, size.width, size.height);
      ctx.drawImage(bitmap, 0, 0, size.width, size.height);
      // Start from the original pixels each time; avoid cumulative JPEG degradation.
      for (const quality of [0.86, 0.78, 0.7]) {
        signal.throwIfAborted();
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (value) =>
              value ? resolve(value) : reject(new Error('Não foi possível reduzir a foto.')),
            'image/jpeg',
            quality,
          ),
        );
        signal.throwIfAborted();
        best = blob;
        if (blob.size <= target) break;
      }
      if (best!.size <= target || Math.max(size.width, size.height) <= 1000) break;
      size.width = Math.max(1, Math.floor(size.width * 0.85));
      size.height = Math.max(1, Math.floor(size.height * 0.85));
    }
    if (!best || best.size > 512 * 1024)
      throw new Error(
        'Não foi possível reduzir a foto mantendo a qualidade. Recorte somente a placa.',
      );
    // Canvas re-encoding strips EXIF/location metadata. Never send the original file.
    return {
      file: new File([best], 'placa.jpg', { type: 'image/jpeg' }),
      originalBytes: file.size,
      ...size,
    };
  } finally {
    bitmap.close();
  }
}
