import { Socket } from 'node:net';

globalThis.fetch = () => {
  throw new Error('NETWORK_BLOCKED');
};
Socket.prototype.connect = () => {
  throw new Error('NETWORK_BLOCKED');
};
