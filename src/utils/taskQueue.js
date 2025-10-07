// @ts-nocheck
import { isHigherPriority, getPriorityName, getPriorityTimeout } from './priorities.js';

// 任务队列管理系统
export class TaskQueue {
  constructor() {
    this.tasks = [];
    this.isFlushingWork = false;
  }

  // 插入任务，按优先级排序，但考虑饥饿防护
  push(task) {
    this.tasks.push(task);
    // 先按过期时间排序（饥饿防护），再按优先级排序
    this.tasks.sort((a, b) => {
      // 如果任务已过期，优先执行
      const aExpired = a.expirationTime <= performance.now();
      const bExpired = b.expirationTime <= performance.now();
      
      if (aExpired && !bExpired) return -1;
      if (!aExpired && bExpired) return 1;
      if (aExpired && bExpired) {
        // 都过期的话，按过期时间排序
        return a.expirationTime - b.expirationTime;
      }
      
      // 都没过期，按优先级排序
      return a.priority - b.priority;
    });
  }

  // 获取最高优先级任务
  peek() {
    return this.tasks[0];
  }

  // 移除并返回最高优先级任务
  pop() {
    return this.tasks.shift();
  }

  // 检查是否有更高优先级的任务
  hasHigherPriorityTask(currentPriority) {
    const nextTask = this.peek();
    if (!nextTask) return false;
    
    // 如果下一个任务已过期，则认为它有更高优先级
    if (nextTask.expirationTime <= performance.now()) {
      return true;
    }
    
    return isHigherPriority(nextTask.priority, currentPriority);
  }

  isEmpty() {
    return this.tasks.length === 0;
  }

  clear() {
    this.tasks = [];
  }

  // 获取过期任务数量（用于监控）
  getExpiredTaskCount() {
    const now = performance.now();
    return this.tasks.filter(task => task.expirationTime <= now).length;
  }
}

// 创建任务对象
export function createTask(priority, callback) {
  const task = {
    id: Math.random().toString(36).substr(2, 9),
    priority,
    callback,
    startTime: performance.now(),
    expirationTime: performance.now() + getPriorityTimeout(priority),
  };
  
  console.log(`📋 创建任务 ${task.id}，优先级: ${getPriorityName(priority)}, 过期时间: ${task.expirationTime}`);
  return task;
}

// 执行单个任务
export function executeTask(task) {
  try {
    return task.callback();
  } catch (error) {
    console.error(`❌ 任务 ${task.id} 执行出错:`, error);
    return { completed: true, error };
  }
}

// 全局任务队列实例
export const taskQueue = new TaskQueue();

// 当前正在执行的任务状态
export let currentTask = null;
export let currentTaskPriority = null;
export let isWorkInterrupted = false;

// 设置当前任务状态的函数
export function setCurrentTask(task) {
  currentTask = task;
}

export function setCurrentTaskPriority(priority) {
  currentTaskPriority = priority;
}

export function setWorkInterrupted(interrupted) {
  isWorkInterrupted = interrupted;
}

export function getCurrentTask() {
  return currentTask;
}

export function getCurrentTaskPriority() {
  return currentTaskPriority;
}

export function getWorkInterrupted() {
  return isWorkInterrupted;
}