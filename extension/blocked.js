/* Shows which host the child tried to reach (recorded by the background). */
chrome.runtime.sendMessage({ type: "getLastBlocked" }, (res) => {
  if (chrome.runtime.lastError || !res || !res.host) return;
  const el = document.getElementById("host");
  if (el) el.textContent = res.host;
});
