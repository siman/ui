// Copyright 2017-2019 @polkadot/ui-keyring authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

import { KeyringPair, KeyringPair$Meta, KeyringPair$Json } from '@polkadot/keyring/types';
import { SingleAddress } from './observable/types';
import { KeyringAddress, KeyringJson, KeyringJson$Meta, KeyringStruct } from './types';

import store from 'store';
import createPair from '@polkadot/keyring/pair';
import { hexToU8a, isHex, isString } from '@polkadot/util';

import env from './observable/development';
import Base from './Base';
import { accountKey, addressKey, accountRegex, addressRegex } from './defaults';
import keyringOption from './options';

// No accounts (or test accounts) should be loaded until after the chain determination.
// Chain determination occurs outside of Keyring. Loading `keyring.loadAll()` is triggered
// from the API after the chain is received
class Keyring extends Base implements KeyringStruct {
  addAccountPair (pair: KeyringPair, password: string): KeyringPair {
    this.keyring.addPair(pair);
    this.saveAccount(pair, password);

    return pair;
  }

  backupAccount (pair: KeyringPair, password: string): KeyringPair$Json {
    if (!pair.isLocked()) {
      pair.lock();
    }

    pair.decodePkcs8(password);

    return pair.toJson(password);
  }

  createAccount (seed: Uint8Array, password?: string, meta: KeyringPair$Meta = {}): KeyringPair {
    const pair = this.keyring.addFromSeed(seed, meta);

    this.saveAccount(pair, password);

    return pair;
  }

  createAccountExternal (publicKey: Uint8Array, meta: KeyringPair$Meta = {}): KeyringPair {
    const pair = this.keyring.addFromAddress(publicKey, { ...meta, isExternal: true });

    this.saveAccount(pair);

    return pair;
  }

  createAccountMnemonic (seed: string, password?: string, meta: KeyringPair$Meta = {}): KeyringPair {
    const pair = this.keyring.addFromMnemonic(seed, meta);

    this.saveAccount(pair, password);

    return pair;
  }

  encryptAccount (pair: KeyringPair, password: string): void {
    const json = pair.toJson(password);

    json.meta.whenEdited = Date.now();

    this.keyring.addFromJson(json);
    this.accounts.add(json.address, json);
  }

  forgetAccount (address: string): void {
    this.keyring.removePair(address);
    this.accounts.remove(address);
  }

  forgetAddress (address: string): void {
    this.addresses.remove(address);
  }

  getAccount (address: string | Uint8Array): KeyringAddress {
    return this.getAddress(address, 'account');
  }

  getAccounts (): Array<KeyringAddress> {
    const available = this.accounts.subject.getValue();

    return Object
      .keys(available)
      .map((address) => this.getAddress(address, 'account'))
      .filter((account) => env.isDevelopment() || account.getMeta().isTesting !== true);
  }

  getAddress (_address: string | Uint8Array, type: 'account' | 'address' = 'address'): KeyringAddress {
    const address = isString(_address)
      ? _address
      : this.encodeAddress(_address);
    const publicKey = this.decodeAddress(address);
    const subject = type === 'account'
      ? this.accounts.subject
      : this.addresses.subject;

    return {
      address: (): string =>
        address,
      isValid: (): boolean =>
        !!subject.getValue()[address],
      publicKey: (): Uint8Array =>
        publicKey,
      getMeta: (): KeyringJson$Meta =>
        subject.getValue()[address].json.meta
    };
  }

  getAddresses (): Array<KeyringAddress> {
    const available = this.addresses.subject.getValue();

    return Object
      .keys(available)
      .map((address) => this.getAddress(address));
  }

  private rewriteKey (json: KeyringJson, key: string, hexAddr: string, creator: (addr: string) => string) {
    if (hexAddr.substr(0, 2) === '0x') {
      return;
    }

    store.remove(key);
    store.set(creator(hexAddr), json);
  }

  private loadAccount (json: KeyringJson, key: string) {
    if (!json.meta.isTesting && (json as KeyringPair$Json).encoded) {
      const pair = this.keyring.addFromJson(json as KeyringPair$Json);

      this.accounts.add(pair.address(), json);
    }

    const [, hexAddr] = key.split(':');

    this.rewriteKey(json, key, hexAddr, accountKey);
  }

  private loadAddress (json: KeyringJson, key: string) {
    const address = this.encodeAddress(
      isHex(json.address)
        ? hexToU8a(json.address)
        : this.decodeAddress(json.address)
    );
    const [, hexAddr] = key.split(':');

    this.addresses.add(address, json);
    this.rewriteKey(json, key, hexAddr, addressKey);
  }

  loadAll (): void {
    super.initKeyring();

    store.each((json: KeyringJson, key: string) => {
      if (accountRegex.test(key)) {
        this.loadAccount(json, key);
      } else if (addressRegex.test(key)) {
        this.loadAddress(json, key);
      }
    });

    keyringOption.init(this);
  }

  restoreAccount (json: KeyringPair$Json, password: string): KeyringPair {
    const pair = createPair(
      {
        publicKey: this.decodeAddress(json.address),
        secretKey: new Uint8Array()
      },
      json.meta,
      hexToU8a(json.encoded)
    );

    // unlock, save account and then lock (locking cleans secretKey, so needs to be last)
    pair.decodePkcs8(password);
    this.addAccountPair(pair, password);
    pair.lock();

    return pair;
  }

  saveAccount (pair: KeyringPair, password?: string): void {
    this.addTimestamp(pair);

    const json = pair.toJson(password);

    this.keyring.addFromJson(json);
    this.accounts.add(json.address, json);
  }

  saveAccountMeta (pair: KeyringPair, meta: KeyringPair$Meta): void {
    const address = pair.address();
    const json = store.get(accountKey(address));

    pair.setMeta(meta);
    json.meta = pair.getMeta();

    this.accounts.add(json.address, json);
  }

  saveAddress (address: string, meta: KeyringPair$Meta): void {
    const available = this.addresses.subject.getValue();

    const json = (available[address] && available[address].json) || {
      address,
      meta: {
        isRecent: void 0,
        whenCreated: Date.now()
      }
    };

    Object.keys(meta).forEach((key) => {
      json.meta[key] = meta[key];
    });

    delete json.meta.isRecent;

    this.addresses.add(address, json);
  }

  saveRecent (address: string): SingleAddress {
    const available = this.addresses.subject.getValue();

    if (!available[address]) {
      const json = {
        address,
        meta: {
          isRecent: true,
          whenCreated: Date.now()
        }
      };

      this.addresses.add(address, (json as KeyringJson));
    }

    return this.addresses.subject.getValue()[address];
  }
}

const keyringInstance = new Keyring();

export default keyringInstance;
