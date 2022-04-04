import scan from 'jsqr';
import Jimp from 'jimp';

export default async function scanQrFromImage(path: string): Promise<string> {
  const { bitmap } = await Jimp.read(path);
  const code = scan(new Uint8ClampedArray(bitmap.data), bitmap.width, bitmap.height);
  if (!code) throw new Error('No code found');
  return code.data;
}
