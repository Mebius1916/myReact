// @ts-nocheck
import { getNextUnitOfWork, setNextUnitOfWork, setWipFiber, pushDeletion, setWipRoot } from "./fiberState.js";
import { commitRoot } from "./commit.js";
import { isEvent, isProperty, eventType } from "./domUtils.js";

function render(element, container) {
  setNextUnitOfWork({
    dom: container,
    props: {
      children: [element],
    },
  });
  setWipRoot(getNextUnitOfWork());
  setWipFiber(getNextUnitOfWork());
}

function updateFunctionComponent(fiber){
  // 使用链表管理 hooks
  fiber.headState = null; // 当前链表头
  fiber.lastHook = null; // 当前链表尾
  fiber.nextOldHook = fiber.alternate?.headState || null; // 移动指针
  fiber.effect = [];
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

export { render, performUnitOfWork };


