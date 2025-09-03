import { update } from "../utils/reconciler";

export function useState(initValue){
  const hook = {
    state : initValue,
  }
  const setState = (newValue) => {
    update();
  }
  return [hook.state, setState];
}