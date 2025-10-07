// @ts-nocheck
import { getWipFiber, getDeletions, setOldRoot, setWipFiber, clearDeletions, getWipRoot, setWipRoot } from "./fiberState.js";
import { isEvent, isProperty, eventType } from "./domUtils.js";

function depsChanged(nextDeps, prevDeps){
  if(!nextDeps) return true; // 未提供依赖：每次都视为变化
  if(!prevDeps) return true; // 之前没有依赖记录：视为变化（首次更新时）
  if(nextDeps.length !== prevDeps.length) return true;
  for(let i=0;i<nextDeps.length;i++){
    if(nextDeps[i] !== prevDeps[i]) return true;
  }
  return false;
}

export function commitEffect(fiber) {
  if(!fiber) return;
  const effects = fiber.effect || [];
  const prevEffects = fiber.alternate?.effect || [];
  effects.forEach((effect, index) => {
    if(!fiber.alternate){
      // 初次挂载：直接执行并记录 cleanup
      const cleanup = effect.callback?.();
      effect.clear = typeof cleanup === 'function' ? cleanup : undefined;
      return;
    }
    const prev = prevEffects[index];
    const shouldRerun = depsChanged(effect.deps, prev?.deps);
    if(shouldRerun){
      // 依赖变化：先清上一次 cleanup，再执行新的 effect
      prev?.clear?.();
      const cleanup = effect.callback?.();
      effect.clear = typeof cleanup === 'function' ? cleanup : undefined;
    } else {
      // 未变化：保持上一次的 cleanup 引用
      effect.clear = prev?.clear;
    }
  });
  commitEffect(fiber.child);
  commitEffect(fiber.sibling);
}
export function commitRoot() {
  const wipRoot = getWipRoot();
  if (!wipRoot) return;
  getDeletions().forEach(commitWork)
  commitWork(wipRoot.child);
  commitEffect(wipRoot.child);
  setOldRoot(wipRoot);
  setWipFiber(undefined);
  setWipRoot(undefined);
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
  
  if(fiber.effectTag === "UPDATE" && fiber.dom){
    updateDom(fiber.dom, fiber.alternate?.props, fiber.props);
  }
  
  if (fiber.effectTag === "PLACEMENT" && fiber.dom) {
    if (parentDom && !parentDom.contains(fiber.dom)) {
      parentDom.append(fiber.dom);
    }
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function cleanupEffectsRecursively(fiber){
  if(!fiber) return;
  const effects = fiber.effect || [];
  effects.forEach(e => e?.clear?.());
  cleanupEffectsRecursively(fiber.child);
  cleanupEffectsRecursively(fiber.sibling);
}

function commitDeletion(fiber, parentDom) {
  // 卸载前先清理整个子树的 effect
  cleanupEffectsRecursively(fiber);
  if (fiber.dom) {
    // 检查节点是否确实是父节点的子节点
    if (parentDom && parentDom.contains(fiber.dom)) {
      parentDom.removeChild(fiber.dom);
    }
  } else {
    commitDeletion(fiber.child, parentDom);
  }
}
const isGone = (prev, next) => (key) => !(key in next);
const isNew = (prev, next) => (key) => prev[key] !== next[key];
function updateDom(dom, prevProps, nextProps) {
  prevProps = prevProps || {};
  nextProps = nextProps || {};
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