// @ts-nocheck
import { getNextUnitOfWork, setNextUnitOfWork, getOldRoot, setWipFiber, setWipRoot } from "./fiberState.js";
import { 
  Priority, 
  getCurrentPriority, 
  runWithPriority, 
  startTransition,
  isHigherPriority,
  getPriorityName
} from './priorities.js';
import { 
  taskQueue, 
  createTask, 
  getCurrentTask,
  getCurrentTaskPriority,
  setWorkInterrupted
} from './taskQueue.js';
import { 
  ensureHostCallbackScheduled, 
  flushSyncWork 
} from './timeSlicing.js';

// 导出优先级相关功能
export { Priority, getCurrentPriority, runWithPriority, startTransition };

// 更新函数 - 准备新的渲染轮次
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
}

// 批量调度：将多次 setState 合并到同一微任务中（normal/low）
let updateScheduled = false;

// 核心调度函数 - 实现真正的抢占式调度
export function scheduleUpdate(priority = getCurrentPriority()){
  console.log(`📋 调度更新，优先级: ${getPriorityName(priority)}`);
  
  // 创建渲染任务
  const renderTask = createTask(priority, () => {
    console.log("🎯 执行渲染任务");
    
    // 执行更新
    update();
    
    return { completed: true }; // 任务完成
  });
  
  // 检查是否需要打断当前工作
  if (getCurrentTask() && getCurrentTaskPriority() && 
      isHigherPriority(priority, getCurrentTaskPriority())) {
    console.log(`🚨 高优先级任务 (${getPriorityName(priority)}) 打断当前任务 (${getPriorityName(getCurrentTaskPriority())})`);
    setWorkInterrupted(true);
  }
  
  if (priority === Priority.immediate) {
    // 立即执行，清空队列中的低优先级任务
    console.log("🔥 立即优先级任务，清空队列并同步执行");
    taskQueue.clear();
    update();
    flushSyncWork();
    return;
  }
  
  // 将任务加入队列
  taskQueue.push(renderTask);
  
  if (priority === Priority.userBlocking) {
    // 用户交互优先级，立即开始调度
    console.log("👆 用户交互优先级，立即开始调度");
    ensureHostCallbackScheduled();
    return;
  }
  
  // 常规/低优先级：合并到同一微任务
  if (priority >= Priority.normal) {
    if(updateScheduled) return;
    updateScheduled = true;
    Promise.resolve().then(() => {
      updateScheduled = false;
      ensureHostCallbackScheduled();
    });
  }
}

// 启动空转的循环以便首次 render 能被处理
ensureHostCallbackScheduled();


