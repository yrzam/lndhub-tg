/**
 * Mapped invoice has public ID bound to it. Anyone who knows it
 * can access the underlying invoice. isPaid method allows to request
 * status from destination wallet, although it is possible only once
 * due to obvious reasons.
 *  */

/* eslint-disable @typescript-eslint/no-non-null-assertion */
import winston from '@utils/logger-service';
import { plainToInstance } from 'class-transformer';
import crypto from 'crypto';
import { Wallet } from '@model';
import { MappedUnpInvs } from '@model/schemas/db';
import { MappedUnpInvError, WalletError } from '@model/schemas/errors';
import { UnpaidInvoice } from '../base-layer';

type MaybePromise<T> = T | Promise<T>;

export class MappedUnpaidInvoice {
  readonly publicId!: string;

  private cache: {
    invoice?: UnpaidInvoice,
    isPaid?: boolean
  } = {};

  constructor(publicId: string) {
    if (!publicId) return;
    this.publicId = publicId;
  }

  static async map(publicId: string, invoice: UnpaidInvoice, destWalletId?: string)
    : Promise<MappedUnpaidInvoice> {
    winston.info('MappedUnpInv: creating with id=%s', publicId);
    await MappedUnpInvs.create({ _id: publicId, invoice, destWalletId });
    return new MappedUnpaidInvoice(publicId);
  }

  async checkInvoice() {
    const rec = await MappedUnpInvs.findById(this.publicId);
    winston.debug('MappedUnpInv: getting invo %s', this.publicId);
    if (!rec) MappedUnpInvError.throwGetInfoFailed('notFound', this.publicId);
    const invo = plainToInstance(UnpaidInvoice, rec.invoice);
    if (!invo.isPayable || rec.confirmedOnDest) {
      MappedUnpInvError.throwGetInfoFailed('unpayable', this.publicId);
    }
    winston.debug('Success');
    this.cache.invoice = invo;
    return invo;
  }

  async checkIfPaid() {
    winston.info('MappedUnpInv: checking status of invo %s', this.publicId);
    const rec = await MappedUnpInvs.findById(this.publicId);
    if (rec?.confirmedOnDest) return true;
    if (!rec) MappedUnpInvError.throwGetInfoFailed('notFound', this.publicId);
    if (!rec.destWalletId) MappedUnpInvError.throwGetInfoFailed('noBoundDestWallet', this.publicId);
    if (rec.checkedOnDest) MappedUnpInvError.throwGetInfoFailed('alreadyChecked', this.publicId);
    let paid = false;
    try {
      paid = await new Wallet(rec.destWalletId as unknown as string)
        .checkReceival(plainToInstance(UnpaidInvoice, rec.invoice));
      winston.debug('Result: %s', paid);
    } finally {
      winston.debug('Posting result %s to db', paid);
      rec.checkedOnDest = true;
      rec.confirmedOnDest = paid;
      await rec.save();
    }
    this.cache.isPaid = paid;
    return paid;
  }

  static async createInvoice(wallet: Wallet, ...invData: Parameters<Wallet['createInvoice']>) {
    try {
      return await MappedUnpaidInvoice.map(
        crypto.randomBytes(32).toString('base64url').substring(0, 32),
        await wallet.createInvoice(...invData),
        wallet.id,
      );
    } catch (err) {
      if (err instanceof WalletError) {
        throw new MappedUnpInvError(`Failed to create invoice: ${err.message}`, {
          type: 'createFailed', walletError: err,
        });
      }
      throw err;
    }
  }

  async pay(wallet: Wallet) {
    try {
      return await wallet.payInvoice(await this.invoice);
    } catch (err) {
      if (err instanceof WalletError) {
        throw new MappedUnpInvError(`Failed to pay invoice: ${err.message}`, {
          type: 'paymentFailed', walletError: err, publicId: this.publicId,
        });
      }
      throw err;
    }
  }

  get invoice(): MaybePromise<UnpaidInvoice> {
    if (this.cache.invoice) return this.cache.invoice;
    return this.checkInvoice().then(() => this.cache.invoice!);
  }

  get isPaid(): MaybePromise<boolean> {
    if (this.cache.isPaid) return this.cache.isPaid;
    return this.checkIfPaid().then(() => this.cache.isPaid!);
  }
}
export { MappedUnpInvError };
