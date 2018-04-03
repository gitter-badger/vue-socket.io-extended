import Observer from './Observer';
import GlobalEmitter from './GlobalEmitter';
import mixin from './mixin';
import { isSocketIo } from './utils';

export default {
  install(Vue, socket, store) {
    if (!isSocketIo(socket)) {
      throw new Error('[vue-socket.io-ext] you have to pass `socket.io-client` instance');
    }

    const observer = new Observer(socket, store);
    Vue.prototype.$socket = observer.Socket;
    Vue.mixin(mixin(GlobalEmitter));
  },
};
