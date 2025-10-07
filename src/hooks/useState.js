import { getWipFiber, setWipFiber } from "../utils/fiberState";
import { scheduleUpdate } from "../utils/scheduler";

export function useState(initValue){
  const wipFiber = getWipFiber();
  const oldHook = wipFiber.nextOldHook;

  // 创建新 hook（链表节点）
  const newHook = {
    state: oldHook ? oldHook.state : initValue,
    queue: oldHook ? oldHook.queue || [] : [],
    next: null,
  };

  // 执行累计的 action 队列
  const actions = newHook.queue;
  actions.forEach(action => {
    const nextState = action instanceof Function ? action(newHook.state) : action;
    if (!Object.is(nextState, newHook.state)) {
      newHook.state = nextState;
    }
  });
  newHook.queue = [];

  const setState = (action) => {
    newHook.queue.push(action);
    scheduleUpdate();
  }

  // 追加到本次 fiber 的 hooks 链表尾部
  if(!wipFiber.headState){
    wipFiber.headState = newHook;
  }else{
    wipFiber.lastHook.next = newHook;
  }
  wipFiber.lastHook = newHook;

  // 推进旧 hook 游标（下一个 useXxx 会用到）
  wipFiber.nextOldHook = oldHook?.next || null;
  setWipFiber(wipFiber);

  return [newHook.state, setState];
}