import scan from 'jsqr';
import Jimp from 'jimp';
import InputError from '@tg/bot/utils/input-error';

export default async function scanQrFromImage(path: string): Promise<string> {
  const { bitmap } = await Jimp.read(path);
  const code = scan(new Uint8ClampedArray(bitmap.data), bitmap.width, bitmap.height);
  if (!code) throw new InputError('qrScanFailed');
  return code.data;
}
