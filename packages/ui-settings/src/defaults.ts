// Copyright 2017-2019 @polkadot/ui-settings authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

import { ChainsInfo, Options } from './types';

const CHAINS: ChainsInfo = [
  {
    name: 'Development',
    networkId: 42,
    tokenDecimals: 0,
    tokenSymbol: 'Unit'
  },
  {
    name: 'Local Testnet',
    networkId: 42,
    tokenDecimals: 0,
    tokenSymbol: 'Unit'
  },
  {
    name: 'Charred Cherry',
    networkId: 42,
    tokenDecimals: 15,
    tokenSymbol: 'CHR'
  },
  {
    name: 'Alexander',
    networkId: 42,
    tokenDecimals: 15,
    tokenSymbol: 'DOT'
  }
];

const ENDPOINTS: Options = [
  { text: 'Alexander (Polkadot, hosted by Parity)', value: 'wss://poc3-rpc.polkadot.io/' },
  { text: 'Charred Cherry (Substrate, hosted by Parity)', value: 'wss://substrate-rpc.parity.io/' },
  { text: 'Local Node (127.0.0.1:9944)', value: 'ws://127.0.0.1:9944/' }
];

const LANGUAGES: Options = [
  { value: 'default', text: 'Default browser language (auto-detect)' }
];

const UIMODES: Options = [
  { value: 'full', text: 'Fully featured' },
  { value: 'light', text: 'Basic features only' }
];

const UITHEMES: Options = [
  { value: 'polkadot', text: 'Polkadot' },
  { value: 'substrate', text: 'Substrate' }
];

export {
  CHAINS,
  ENDPOINTS,
  LANGUAGES,
  UIMODES,
  UITHEMES
};
