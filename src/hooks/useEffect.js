import { getWipFiber, setWipFiber } from "../utils/fiberState.js";
export const useEffect = (callback, deps) => {
  const newWipFiber = getWipFiber();
  const effect = {
    callback, // 回调函数
    deps, // 依赖数组
    clear: null, // 清理函数（依赖更新、组件卸载）
  };
  newWipFiber.effect.push(effect);
  setWipFiber(newWipFiber);
};