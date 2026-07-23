function removeListenerHandle(handle, onError) {
  Promise.resolve(handle.remove()).catch(onError);
}

export function registerNativeAppStateListener(appPlugin, onForeground, onError = () => {}) {
  let disposed = false;
  let listenerHandle;

  Promise.resolve(appPlugin.addListener("appStateChange", (state) => {
    if (state.isActive) return onForeground();
    return undefined;
  }))
    .then((handle) => {
      if (disposed) {
        removeListenerHandle(handle, onError);
        return;
      }
      listenerHandle = handle;
    })
    .catch((error) => {
      if (!disposed) onError(error);
    });

  return () => {
    disposed = true;
    if (listenerHandle) {
      removeListenerHandle(listenerHandle, onError);
      listenerHandle = undefined;
    }
  };
}
