// @ts-nocheck
import { fiberState, getNextUnitOfWork, setNextUnitOfWork, getOldRoot, setWipFiber, pushDeletion } from "./fiberState.js";
import { commitRoot } from "./commit.js";
import { isEvent, isProperty, eventType } from "./domUtils.js";
function render(element, container) {
  setNextUnitOfWork({
    dom: container,
    props: {
      children: [element],
    },
  });
  // wipFiber指向当前fiber树的根节点
  setWipFiber(getNextUnitOfWork());
}

export function update(){
  setNextUnitOfWork({
    ...getOldRoot(),
    alternate: getOldRoot(),
  })
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
    commitRoot();
  }
  requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);

function updateFunctionComponent(fiber){
  fiber.hooks = [];
  fiber.hookIndex = 0;
  setWipFiber(fiber);
  fiber.props.children = [fiber.type(fiber.props)];
  reconcileChildren(fiber,fiber.props.children);
}

function updateHostComponent(fiber){
  if(!fiber.dom){
    fiber.dom = createDom(fiber);
  }
  reconcileChildren(fiber, (fiber.props && fiber.props.children) || []);
}

function reconcileChildren(fiber, elements = []) {
  let oldFiber = fiber.alternate && fiber.alternate.child;
  let index = 0;
  let prevSibling;
  // 层序优先遍历
  while (index < elements.length || oldFiber) {
    const element = elements[index];
    const sameType = oldFiber && element && oldFiber.type === element.type;
    let newFiber;
    if(sameType){
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: fiber,
        alternate: oldFiber,
        child: null,
        sibling: null,
        effectTag: "UPDATE",
      };
    }
    if(element && !sameType){
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: fiber,
        alternate: null,
        child: null,
        sibling: null,
        effectTag: "PLACEMENT",
      };
    }
    if(oldFiber && !sameType){
      oldFiber.effectTag = "DELETION";
      pushDeletion(oldFiber);
    }
    if(oldFiber){
      oldFiber = oldFiber.sibling;
    }
    if (index === 0) {
      fiber.child = newFiber;
    } else if (prevSibling) {
      prevSibling.sibling = newFiber;
    }
    prevSibling = newFiber;
    index++;
  }
}

function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function;
  if(isFunctionComponent){
    updateFunctionComponent(fiber);
  }else{
    updateHostComponent(fiber);
  }
  if (fiber.child) {
    return fiber.child;
  }
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
}

function createDom(fiber) {
  const dom =
    fiber.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(fiber.type);
  Object.keys(fiber.props || {})
    .filter(isProperty)
    .forEach((name) => (dom[name] = fiber.props[name]));
  Object.keys(fiber.props || {})
    .filter(isEvent)
    .forEach((name) => {
      dom.addEventListener(eventType(name), fiber.props[name]);
    });
  return dom;
}

export { render };

