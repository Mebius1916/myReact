import { getWipFiber, setWipFiber } from "../utils/fiberState";
import { scheduleUpdate } from "../utils/reconciler";

export function useState(initValue){
  const wipFiber = getWipFiber();
  console.log(wipFiber);
  const alternate = wipFiber?.alternate;
  const hookIndex = wipFiber?.hookIndex ?? 0;
  const oldHook = alternate?.hooks?.[hookIndex];
  const hook = {
    state : oldHook ? oldHook.state : initValue,
    queue:[]
  }
  const actions = oldHook ? oldHook.queue : hook.queue;
  actions.forEach(action => {
    const nextState = action instanceof Function ? action(hook.state) : action;
    // 跳变判断：与当前 state 相同则短路
    if (Object.is(nextState, hook.state)) return;
    hook.state = nextState;
  });
  actions.length = 0;
  const setState = (action) => {
    hook.queue.push(action);
    // 批量：合并到微任务，避免多次重复更新
    scheduleUpdate();
  }
  const newFiber = getWipFiber();
  if(!newFiber){
    throw new Error("useState must be called during a function component render");
  }
  newFiber.hooks.push(hook);
  newFiber.hookIndex = hookIndex + 1;
  setWipFiber(newFiber);
  return [hook.state, setState];
}