const ui = {
  uName: document.querySelector('.chat-app__controls__name'),
  uText: document.querySelector('.chat-app__controls__message'),
  mSend: document.querySelector('.chat-app__controls__send'),
  messages: document.querySelector('.chat-app__body'),
};

const config = {
  server: 'https://185.13.90.140:8081/',
};

const socket = window.io(config.server);

// App State and main logic

let appState = {
  count: 0,
  messages: [],
  uName: 'Guest',
};

const htmlent = (str) => String(str)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const setName = (name) => {
  appState.uName = name;
};

const onNewMessageFromTheOthers = (incoming) => {
  appState.count += 1;
  appState.messages.push({
    message: {
      user: incoming.user,
      message: htmlent(incoming.message),
    },
    isIn: true,
    key: appState.count,
  });
};

const onNewMessageFromUser = () => {
  const { uText: { value } } = ui;

  if (value.length) {
    ui.uText.value = '';

    const message = {
      user: appState.uName,
      message: htmlent(value),
    };

    socket.emit('message', JSON.stringify(message));

    appState.count += 1;
    appState.messages.push({
      ...message,
      key: appState.count,
      isIn: false,
    });
  }
};

socket.on('message', (raw) => {
  const message = JSON.parse(raw);
  onNewMessageFromTheOthers(message);
});

ui.mSend.addEventListener('click', onNewMessageFromUser);

ui.uText.addEventListener('keyup', (e) => {
  if (e.which === 13) {
    onNewMessageFromUser();
  }
});

ui.uName.addEventListener('blur', () => {
  const { uName: { value } } = ui;

  if (value.length) {
    setName(value);
  }
});

// Rendering
const renderTree = {
  messages: {},
};

const createMessageDom = (message) => {
  const {
    isIn,
    user,
    key,
    message: text,
  } = message;

  const el = document.createElement('div');
  el.className = [
    'chat-app__message',
    isIn === true
      ? 'chat-app__message--in'
      : 'chat-app__message--out',
  ].join(' ');
  el.innerText = `${user}:${text}`;

  el.setAttribute('rkey', key);
  ui.messages.appendChild(el);
  renderTree.messages[key] = text;
};

const renderMessages = (nextMessages) => {
  const currentKeyMap = renderTree.messages;
  const nextKeyMap = nextMessages
    .filter((m) => m && m.key)
    .reduce((acc, cur) => ({ ...acc, [cur.key]: cur }), {});

  // eslint-disable-next-line no-restricted-syntax
  for (const rKey of Object.keys(nextKeyMap)) {
    if (!(rKey in currentKeyMap)) {
      createMessageDom(nextKeyMap[rKey]);
    }
  }
};

const onDetectedChange = () => {
  requestAnimationFrame(() => {
    renderMessages(appState.messages);
  });
};

// Change detection

const proxies = new WeakSet();

const setTrap = (obj, prop, value) => {
  // eslint-disable-next-line
  obj[prop] = value;
  onDetectedChange();
  return true;
};

const getTrap = (obj, prop) => {
  const target = obj[prop];

  if (typeof target === 'object') {
    if (!proxies.has(target)) {
      // eslint-disable-next-line
      obj[prop] = new Proxy(obj[prop], {
        set: setTrap,
        get: getTrap,
      });

      proxies.add(obj[prop]);
    }
  }

  return obj[prop];
};

appState = new Proxy(appState, {
  set: setTrap,
  get: getTrap,
});
