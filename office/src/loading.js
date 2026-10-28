/** Asset progress uses actual completed phases, never a timer pretending to load. */
export function createLoadingUI(element) {
  element.replaceChildren();
  const title = document.createElement("strong");
  title.textContent = "走進左左公司";
  const message = document.createElement("span");
  message.textContent = "正在準備角色與辦公室…";
  const progress = document.createElement("progress");
  progress.max = 6;
  progress.value = 0;
  progress.setAttribute("aria-label", "辦公室載入進度");
  element.append(title, progress, message);
  const completed = { reference: 0, materials: 0, environment: 0, scene: 0 };
  const weights = { reference: 1, materials: 3, environment: 1, scene: 1 };
  let done = false;
  function update(phase, loaded = 1, total = 1) {
    if (done || !(phase in completed)) return;
    completed[phase] = Math.max(completed[phase], Math.min(1, loaded / Math.max(total, 1)));
    progress.value = Object.entries(completed).reduce((sum, [key, value]) => sum + value * weights[key], 0);
    message.textContent = `${Math.round(progress.value / progress.max * 100)}% · ${
      { reference: "官方角色已就緒", materials: "載入表面材質", environment: "準備環境光", scene: "完成辦公室" }[phase]}`;
  }
  return {
    update,
    asset(event) { if (event && typeof event === "object") update(event.phase, event.loaded, event.total); },
    finish() { update("scene"); progress.value = progress.max; done = true; element.hidden = true; },
  };
}
