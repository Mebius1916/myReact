// 是否为事件属性
export const isEvent = (key) => key.startsWith("on");

// 是否为DOM属性
export const isProperty = (key) => key !== "children" && !isEvent(key);

// 提取事件类型
export const eventType = (key) => key.substring(2).toLowerCase();

// 属性是否被移除
export const isGone = (prev, next) => (key) => !(key in next);

// 属性是否为新值
export const isNew = (prev, next) => (key) => prev[key] !== next[key];


