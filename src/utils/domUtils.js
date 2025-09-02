// @ts-nocheck
export const isEvent = (key) => key.startsWith("on");
export const isProperty = (key) => key !== "children" && !isEvent(key);
export const eventType = (key) => key.substring(2).toLowerCase();

export const isGone = (prev, next) => (key) => !(key in next);
export const isNew = (prev, next) => (key) => prev[key] !== next[key];


