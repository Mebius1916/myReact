// @ts-nocheck

// React 18 风格的优先级定义
export const Priority = {
  immediate: 1,      // 同步、不可中断（用户输入、错误处理）
  userBlocking: 2,   // 用户交互（点击、输入）
  normal: 3,         // 默认优先级（网络请求结果）
  low: 4,           // 低优先级（分析、预加载）
  idle: 5,          // 空闲时执行
};

// 优先级比较函数
export function isHigherPriority(p1, p2) {
  return p1 < p2; // 数值越小优先级越高
}

// 获取优先级名称（用于调试）
export function getPriorityName(priority) {
  const names = {
    [Priority.immediate]: 'immediate',
    [Priority.userBlocking]: 'userBlocking', 
    [Priority.normal]: 'normal',
    [Priority.low]: 'low',
    [Priority.idle]: 'idle'
  };
  return names[priority] || 'unknown';
}

// 根据优先级获取超时时间（防止饥饿）
export function getPriorityTimeout(priority) {
  switch (priority) {
    case Priority.immediate:
      return -1; // 立即执行
    case Priority.userBlocking:
      return 250; // 250ms
    case Priority.normal:
      return 5000; // 5s
    case Priority.low:
      return 10000; // 10s
    case Priority.idle:
      return 1073741823; // 永不过期
    default:
      return 5000;
  }
}

// 当前优先级管理
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