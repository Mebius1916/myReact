// @ts-nocheck
import { getWipFiber, getDeletions, setOldRoot, setWipFiber, clearDeletions } from "./fiberState.js";
import { isEvent, isProperty, eventType } from "./domUtils.js";
export function commitRoot() {
  const root = getWipFiber();
  if (!root) return;
  getDeletions().forEach(commitWork)
  commitWork(root.child);
  setOldRoot(root);
  setWipFiber(undefined);
  clearDeletions();
}

function commitWork(fiber) {
  if (!fiber) return;

  let parentFiber = fiber.parent;
  while (parentFiber && !parentFiber.dom) {
    parentFiber = parentFiber.parent;
  }
  const parentDom = parentFiber?.dom;
  if(fiber.effectTag === "DELETION"){
    commitDeletion(fiber, parentDom);
    return;
  }
  if(fiber.effectTag === "UPDATE"){
    if(fiber.dom){
      updateDom(fiber.dom, fiber.alternate.props, fiber.props);
    }
  }
  if (fiber.effectTag === "PLACEMENT" && fiber.dom) {
    if (fiber.dom && parentDom) {
      parentDom.append(fiber.dom);
    }
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function commitDeletion(fiber, parentDom) {
  if (fiber.dom) {
    parentDom.removeChild(fiber.dom);
  } else {
    commitDeletion(fiber.child, parentDom);
  }
}
const isGone = (prev, next) => (key) => !(key in next);
const isNew = (prev, next) => (key) => prev[key] !== next[key];
function updateDom(dom, prevProps, nextProps) {
  // 删除旧的属性
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach(name => dom[name] = '');
  // 添加新的属性
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => dom[name] = nextProps[name]);
  // 删除旧的事件
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(key => !(key in nextProps) || isNew(prevProps, nextProps)(key))
    .forEach(name => {
      dom.removeEventListener(eventType(name), prevProps[name]);
    });
  // 添加新的事件
  Object.keys(nextProps)
  .filter(isEvent)
  .forEach(name => {
    dom.addEventListener(eventType(name), nextProps[name]);
  });
}