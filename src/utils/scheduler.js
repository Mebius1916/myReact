// @ts-nocheck
import { getNextUnitOfWork, setNextUnitOfWork, getOldRoot, setWipFiber, setWipRoot, getWipRoot } from "./fiberState.js";
import { commitRoot } from "./commit.js";
import { performUnitOfWork } from "./renderer.js";

export function update(){
  setNextUnitOfWork({
    ...getOldRoot(),
    alternate: getOldRoot(),
  })
  setWipRoot(getNextUnitOfWork());
  setWipFiber(getNextUnitOfWork());
}

// 批量调度：将多次 setState 合并到同一微任务中
let updateScheduled = false;
export function scheduleUpdate(){
  if(updateScheduled) return;
  updateScheduled = true;
  Promise.resolve().then(() => {
    updateScheduled = false;
    update();
  });
}

function workLoop(deadling) {
  let shouldYield = false;
  while (getNextUnitOfWork() && !shouldYield) {
    setNextUnitOfWork(performUnitOfWork(getNextUnitOfWork()));
    shouldYield = deadling.timeRemaining() < 1;
  }
  if (!getNextUnitOfWork()) {
    // 提交当前 wipRoot
    commitRoot();
  }
  requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);


