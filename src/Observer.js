import GlobalEmitter from './GlobalEmitter';
import { unwrapIfSingle, prefixWith, pipe } from './utils';
import { getRegisteredMutations, getRegisteredActions, trimNamespace } from './utils/vuex';
import { eventToMutationTransformer, eventToActionTransformer } from './utils/observer';

const SYSTEM_EVENTS = ['connect', 'error', 'disconnect', 'reconnect', 'reconnect_attempt', 'reconnecting', 'reconnect_error', 'reconnect_failed', 'connect_error', 'connect_timeout', 'connecting', 'ping', 'pong'];

const actionPrefix = 'socket_';
const mutationPrefix = 'SOCKET_';

export default class Observer {
  constructor(connection, store) {
    this.Socket = connection;

    if (store) this.store = store;

    this.registerEventHandler();
  }

  registerEventHandler() {
    const superOnEvent = this.Socket.onevent;
    this.Socket.onevent = (packet) => {
      superOnEvent.call(this.Socket, packet);

      GlobalEmitter.emit(...packet.data);

      const [eventName, ...args] = packet.data;
      this.passToStore(eventName, [...args]);
    };

    SYSTEM_EVENTS.forEach((eventName) => {
      this.Socket.on(eventName, (...args) => {
        GlobalEmitter.emit(eventName, ...args);
        this.passToStore(eventName, [...args]);
      });
    });
  }


  passToStore(event, payload) {
    if (!this.store) return;

    const unwrappedPayload = unwrapIfSingle(payload);
    const eventToAction = pipe(eventToActionTransformer, prefixWith(actionPrefix));
    const eventToMutation = pipe(eventToMutationTransformer, prefixWith(mutationPrefix));

    const desiredMutation = eventToMutation(event);
    const desiredAction = eventToAction(event);

    const mutations = getRegisteredMutations(this.store);
    const actions = getRegisteredActions(this.store);

    mutations
      .filter(namespacedMutation => trimNamespace(namespacedMutation) === desiredMutation)
      .forEach(namespacedMutation => this.store.commit(namespacedMutation, unwrappedPayload));

    actions
      .filter(namespacedAction => trimNamespace(namespacedAction) === desiredAction)
      .forEach(namespacedAction => this.store.dispatch(namespacedAction, unwrappedPayload));
  }
}
