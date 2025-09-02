// @ts-nocheck
import { fiberState } from "./fiberState.js";
import { commitRoot } from "./commit.js";
import { isEvent, isProperty, eventType } from "./domUtils.js";
function render(element, container) {
  fiberState.nextUnitOfWork = {
    dom: container,
    props: {
      children: [element],
    },
  };
  // wipFiber指向当前fiber树的根节点
  fiberState.wipFiber = fiberState.nextUnitOfWork;
}

export function update(){
  fiberState.nextUnitOfWork = {
    ...fiberState.currentRoot,
    alternate: fiberState.currentRoot,
  }
  fiberState.wipFiber = fiberState.nextUnitOfWork;
}

function workLoop(deadling) {
  let shouldYield = false;
  while (fiberState.nextUnitOfWork && !shouldYield) {
    fiberState.nextUnitOfWork = performUnitOfWork(fiberState.nextUnitOfWork);
    shouldYield = deadling.timeRemaining() < 1;
  }
  if (!fiberState.nextUnitOfWork) {
    commitRoot();
  }
  requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);

function updateFunctionComponent(fiber){
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
      fiberState.deletions.push(oldFiber);
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

