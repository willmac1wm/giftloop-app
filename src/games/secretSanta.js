import { initialSecretSantaEvent } from '../data/mockData.js';
import { createBlankSecretSantaEvent, normalizeLoadedEvent } from '../data/eventState.js';

export { default as ExchangeScreen } from '../components/SecretSantaTab.jsx';

/**
 * This app ships one exchange. Email and text sharing, and the affiliate
 * shop, live outside this module so another gift type can replace the draw.
 */
export const EXCHANGE_NAME = 'Secret Santa';
export const EXCHANGE_STORAGE_KEY = 'giftloop_secretsanta_v2';

export function loadExchange(saved) {
  return normalizeLoadedEvent(saved, initialSecretSantaEvent, createBlankSecretSantaEvent);
}

export function blankExchange() {
  return createBlankSecretSantaEvent();
}

export function sampleExchange() {
  return structuredClone(initialSecretSantaEvent);
}
