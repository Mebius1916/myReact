import { getWipFiber, setWipFiber } from "../utils/fiberState";
import { scheduleUpdate } from "../utils/scheduler";

export function useState(initValue){
  const wipFiber = getWipFiber();
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

  const setState = (action) => {
    hook.queue.push(action);
    // 批量：合并到微任务，避免多次重复更新
    scheduleUpdate();
  }

  wipFiber.hooks.push(hook);
  wipFiber.hookIndex = hookIndex + 1;
  setWipFiber(wipFiber);

  return [hook.state, setState];
}