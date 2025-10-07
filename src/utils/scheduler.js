// @ts-nocheck
import { getNextUnitOfWork, setNextUnitOfWork, getOldRoot, setWipFiber, setWipRoot } from "./fiberState.js";
import { commitRoot } from "./commit.js";
import { performUnitOfWork } from "./renderer.js";

// 简易优先级定义 & API（模拟 React 18 的并发打断）
// 说明：
// - immediate：同步、不可中断，直接刷新直到提交（用于极高优先级）
// - userBlocking：尽快开始并发渲染，允许让步（用于用户交互）
// - normal/low：通过微任务合并更新，然后并发调度，允许让步（用于背景/过渡）
export const Priority = {
  immediate: "immediate",
  userBlocking: "userBlocking",
  normal: "normal",
  low: "low",
};

let currentPriority = Priority.normal;
export function getCurrentPriority() {
  return currentPriority;
}
export function runWithPriority(priority, fn) {
  const prev = currentPriority;
  currentPriority = priority;
  try {
    return fn();
  } finally {
    currentPriority = prev;
  }
}
export function startTransition(scope) {
  return runWithPriority(Priority.low, scope);
}

export function update(){
  console.log("🚀 触发更新，准备开始新的渲染轮次");
  // 将旧根设置为本次更新的 wipRoot，开始一次新的渲染轮次。
  // 注意：这只是在"render 阶段"准备工作，真正的提交发生在 commitRoot()。
  setNextUnitOfWork({
    ...getOldRoot(),
    alternate: getOldRoot(),
  })
  setWipRoot(getNextUnitOfWork());
  setWipFiber(getNextUnitOfWork());
  console.log("📋 设置工作单元:", getNextUnitOfWork() ? "成功" : "失败");
  // 启动/继续调度
  ensureHostCallbackScheduled();
}

// ---------------------------
// Host scheduler (MessageChannel)
// ---------------------------
// 每次切片预算（毫秒）。React 18 默认约 ~5ms 的让步节奏，这里用固定值模拟。
// 真实实现会根据环境可选 isInputPending()、forceFrameRate() 调整策略。
const frameInterval = 5; // 每次切片预算（毫秒），模拟时间切片
let deadline = 0;
let isMessageLoopRunning = false;
// 使用 MessageChannel 作为宿主回调队列（宏任务）：
// - 优点：避免 setTimeout 的 4ms 最小延迟（clamp），触发更及时
// - 行为：每收到一条消息，视为“开始一帧工作”
const channel = new MessageChannel();
channel.port1.onmessage = () => {
  isMessageLoopRunning = false;
  // 为本帧设置时间预算（deadline），在 flushWork 中循环检查是否超时让步。
  deadline = performance.now() + frameInterval;
  flushWork();
};

function shouldYield() {
  // 当当前时间超过本帧的 deadline，说明预算用尽，需要让出主线程。
  return performance.now() >= deadline;
}

// 开启下一轮时间切片，确保在当前帧结束后触发下一次消息回调
function ensureHostCallbackScheduled() {
  if (isMessageLoopRunning) return;
  isMessageLoopRunning = true;
  channel.port2.postMessage(null);
}

function flushWork() {
  // 并发渲染的核心循环：在时间预算内，增量地执行 Fiber 的单元工作。
  let next = getNextUnitOfWork();
  let workCount = 0;
  console.log("🔄 开始时间分片工作，当前nextUnitOfWork:", next ? "有工作" : "无工作");
  
  while (next && !shouldYield()) {
    workCount++;
    console.log(`⚡ 执行第${workCount}个工作单元:`, next.type || "根节点");
    // 执行一个 Fiber 的 render 单元，并将 nextUnitOfWork 推进到下一个节点。
    setNextUnitOfWork(performUnitOfWork(next));
    next = getNextUnitOfWork();
    
    if (workCount % 5 === 0) {
      console.log(`📊 已处理${workCount}个工作单元，检查是否需要让步...`);
    }
  }
  
  if (shouldYield() && next) {
    console.log(`⏸️ 时间片用尽，已处理${workCount}个单元，保存进度等待下一帧`);
  }
  
  if (!getNextUnitOfWork()) {
    // 完成本次渲染（render 阶段），进入不可中断的 commit 阶段：应用 DOM 变更 & effects。
    console.log(`✅ 渲染阶段完成，总共处理${workCount}个工作单元，开始提交阶段`);
    commitRoot();
    return; // 等待下次有新工作再调度
  }
  // 仍有未完成工作：保留 nextUnitOfWork（渲染进度指针），下一帧从断点继续恢复。
  ensureHostCallbackScheduled();
}

// 批量调度：将多次 setState 合并到同一微任务中（normal/low）
let updateScheduled = false;
export function scheduleUpdate(priority = currentPriority){
  if (priority === Priority.immediate) {
    // 同步抢占：直接刷新直到提交（不让步）。适用于极高优先级、必须立即可见的更新。
    update();
    flushSyncWork();
    return;
  }
  if (priority === Priority.userBlocking) {
    // 用户阻塞：尽快开始并发渲染，但允许让步给浏览器以保持交互流畅。
    update();
    ensureHostCallbackScheduled();
    return;
  }
  // 常规/低优先级：合并到同一微任务，再开始并发调度
  if(updateScheduled) return;
  updateScheduled = true;
  Promise.resolve().then(() => {
    updateScheduled = false;
    update();
    ensureHostCallbackScheduled();
  });
}

// 同步刷新的路径（用于立即优先级）
function flushSyncWork(){
  // 无让步地执行所有剩余的单元工作，然后一次性提交。
  let next = getNextUnitOfWork();
  while (next) {
    setNextUnitOfWork(performUnitOfWork(next));
    next = getNextUnitOfWork();
  }
  commitRoot();
}

// 启动空转的循环以便首次 render 能被处理
ensureHostCallbackScheduled();


