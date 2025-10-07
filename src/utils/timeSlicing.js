// @ts-nocheck
import { getNextUnitOfWork, setNextUnitOfWork } from "./fiberState.js";
import { commitRoot } from "./commit.js";
import { performUnitOfWork } from "./renderer.js";
import { 
  taskQueue, 
  executeTask, 
  getCurrentTaskPriority,
  setCurrentTask,
  setCurrentTaskPriority,
  setWorkInterrupted,
  getWorkInterrupted
} from './taskQueue.js';
import { getPriorityName } from './priorities.js';

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
// - 行为：每收到一条消息，视为"开始一帧工作"
const channel = new MessageChannel();
channel.port1.onmessage = () => {
  isMessageLoopRunning = false;
  // 为本帧设置时间预算（deadline），在 flushWork 中循环检查是否超时让步。
  deadline = performance.now() + frameInterval;
  flushWork();
};

export function shouldYield() {
  // 检查时间预算 + 是否有更高优先级任务
  const timeExpired = performance.now() >= deadline;
  const hasHigherPriorityWork = getCurrentTaskPriority() && 
    taskQueue.hasHigherPriorityTask(getCurrentTaskPriority());
  
  return timeExpired || hasHigherPriorityWork;
}

// 开启下一轮时间切片，确保在当前帧结束后触发下一次消息回调
export function ensureHostCallbackScheduled() {
  if (isMessageLoopRunning) return;
  isMessageLoopRunning = true;
  channel.port2.postMessage(null);
}

// 核心工作循环 - 支持任务打断和恢复
export function flushWork() {
  let workCount = 0;
  console.log("🔄 开始工作循环");
  
  // 处理任务队列中的任务
  while (!taskQueue.isEmpty() && !shouldYield()) {
    const task = taskQueue.peek();
    
    // 检查任务是否过期（饥饿防护）
    if (task.expirationTime <= performance.now()) {
      console.log(`⚠️ 任务 ${task.id} 已过期，强制执行`);
      // 过期任务必须执行，不受时间片限制
      executeTask(taskQueue.pop());
      continue;
    }
    
    // 设置当前任务上下文
    setCurrentTask(task);
    setCurrentTaskPriority(task.priority);
    setWorkInterrupted(false);
    
    console.log(`⚡ 开始执行任务 ${task.id}，优先级: ${getPriorityName(task.priority)}`);
    
    // 执行任务
    const result = executeTask(taskQueue.pop());
    
    if (getWorkInterrupted()) {
      console.log(`⏸️ 任务 ${task.id} 被高优先级任务打断`);
      // 如果任务被打断且未完成，重新加入队列
      if (result && !result.completed) {
        taskQueue.push(task);
      }
      break;
    }
    
    workCount++;
  }
  
  // 如果还有 Fiber 工作要做，继续处理
  if (getNextUnitOfWork()) {
    let next = getNextUnitOfWork();
    console.log("🔄 继续处理 Fiber 工作，当前nextUnitOfWork:", next ? "有工作" : "无工作");
    
    while (next && !shouldYield()) {
      workCount++;
      console.log(`⚡ 执行第${workCount}个工作单元:`, next.type || "根节点");
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
      console.log(`✅ 渲染阶段完成，总共处理${workCount}个工作单元，开始提交阶段`);
      commitRoot();
      return;
    }
  }
  
  // 清理当前任务上下文
  setCurrentTask(null);
  setCurrentTaskPriority(null);
  
  if (!taskQueue.isEmpty() || getNextUnitOfWork()) {
    console.log(`📊 本轮处理了 ${workCount} 个任务，还有工作待处理`);
    ensureHostCallbackScheduled();
  } else {
    console.log(`✅ 所有任务处理完成，总共处理了 ${workCount} 个任务`);
  }
}

// 同步刷新的路径（用于立即优先级）
export function flushSyncWork(){
  // 无让步地执行所有剩余的单元工作，然后一次性提交。
  let next = getNextUnitOfWork();
  while (next) {
    setNextUnitOfWork(performUnitOfWork(next));
    next = getNextUnitOfWork();
  }
  commitRoot();
}