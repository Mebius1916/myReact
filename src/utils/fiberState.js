export const fiberState = {
  nextUnitOfWork: undefined, //当前正在执行的fiber节点
  wipFiber: undefined, // 新fiber树的根节点
  oldRoot: undefined, // 旧fiber树的根节点
  deletions: [], // 需要删除的fiber节点
};

// nextUnitOfWork
export const getNextUnitOfWork = () => fiberState.nextUnitOfWork;
export const setNextUnitOfWork = (value) => {
  fiberState.nextUnitOfWork = value;
  return value;
};

// wipFiber
export const getWipFiber = () => fiberState.wipFiber;
export const setWipFiber = (value) => {
  fiberState.wipFiber = value;
  return value;
};

// oldRoot
export const getOldRoot = () => fiberState.oldRoot;
export const setOldRoot = (value) => {
  fiberState.oldRoot = value;
  return value;
};

// deletions
export const getDeletions = () => fiberState.deletions;
export const pushDeletion = (fiber) => {
  fiberState.deletions.push(fiber);
};
export const clearDeletions = () => {
  fiberState.deletions = [];
};

