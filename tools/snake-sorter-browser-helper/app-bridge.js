(() => {
  const version = chrome.runtime.getManifest().version;
  document.documentElement.dataset.snakeSorterHelperInstalled = "true";
  document.documentElement.dataset.snakeSorterHelperVersion = version;

  const detail = { installed: true, version };
  window.dispatchEvent(new CustomEvent("snake-sorter-helper-status", { detail }));
})();