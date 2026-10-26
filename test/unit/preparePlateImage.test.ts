import { afterEach, describe, expect, it, vi } from 'vitest';
import { plateImageSize, preparePlateImage } from '../../src/features/vehicles/preparePlateImage';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('plate photo preparation', () => {
  it('preserves small photo pixels and bounds large images without changing aspect ratio', () => {
    expect(plateImageSize(420, 234)).toEqual({ width: 420, height: 234 });
    for (const [w, h] of [
      [6000, 4000],
      [4000, 6000],
      [8000, 1000],
    ]) {
      const size = plateImageSize(w, h);
      expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(1568);
      expect(size.width * size.height).toBeLessThanOrEqual(1_200_000);
      expect(size.width / size.height).toBeCloseTo(w / h, 1);
    }
  });
  it('rejects unsupported or oversized originals before decoding', async () => {
    const decode = vi.fn();
    vi.stubGlobal('createImageBitmap', decode);
    await expect(
      preparePlateImage(
        new File(['x'], 'x.svg', { type: 'image/svg+xml' }),
        new AbortController().signal,
      ),
    ).rejects.toThrow('20 MB');
    await expect(
      preparePlateImage(
        new File([new Uint8Array(21 * 1024 * 1024)], 'x.jpg', { type: 'image/jpeg' }),
        new AbortController().signal,
      ),
    ).rejects.toThrow('20 MB');
    expect(decode).not.toHaveBeenCalled();
  });
  it('re-encodes as JPEG, uses a neutral name and releases decoded pixels', async () => {
    const close = vi.fn();
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 420, height: 234, close }),
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    const encode = vi
      .spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation((callback) => callback(new Blob(['jpeg'], { type: 'image/jpeg' })));
    const result = await preparePlateImage(
      new File(['original data'], 'sensitive-name.png', { type: 'image/png' }),
      new AbortController().signal,
    );
    expect(result.file.name).toBe('placa.jpg');
    expect(result.file.type).toBe('image/jpeg');
    expect(result.file.size).toBe(4);
    expect(result.width).toBe(420);
    expect(close).toHaveBeenCalledOnce();
    expect(encode).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.86);
  });
});
