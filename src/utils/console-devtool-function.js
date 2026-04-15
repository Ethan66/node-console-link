function useConsoleDevtools() {
  const EXTENSION_ID_KEY = '__CONSOLE_DEVTOOLS_EXTENSION_ID__'
  const state = {
    port: null,
    extensionId: window[EXTENSION_ID_KEY] || null
  }

  function logError(type, message) {
    console.log(`%c console-devtools-${type}：`, 'background:#f56c6c;color:#fff;', message || 'error')
  }

  function resetConnection(type, message) {
    state.port = null
    logError(type, message)
  }

  function connect() {
    if (state.port) return true
    if (!state.extensionId) {
      logError('ready', '扩展还没有加载')
      return false
    }
    try {
      const nextPort = chrome.runtime.connect(state.extensionId, { name: 'console-devtools' })
      nextPort.onDisconnect.addListener(() => resetConnection('disconnected'))
      state.port = nextPort
      console.log('%c console-devtools-connected：', 'background:#67c23a;color:#fff;', 'success')
      return true
    } catch (e) {
      resetConnection('connect failed', e.message)
      return false
    }
  }

  function send(data) {
    if (!connect()) return
    try {
      state.port.postMessage(data)
    } catch (e) {
      resetConnection('send-failed', e.message)
      if (connect()) {
        state.port.postMessage(data)
      }
    }
  }

  window.addEventListener('console-devtools-ready', e => {
    const extId = e.detail?.extensionId
    console.log('%c console-devtools-ready: ', 'background:#67c23a;color:#fff;', 'success')
    if (!extId) return
    state.extensionId = extId
    window[EXTENSION_ID_KEY] = extId
    connect()
  })
  return { sendConsoleToExtension: send }
}

const { sendConsoleToExtension } = useConsoleDevtools()
window.sendConsoleToExtension = sendConsoleToExtension
