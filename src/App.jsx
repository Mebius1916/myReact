import React from "./react";
import { useState } from "./hooks/useState";
import { useEffect } from "./hooks/useEffect";

function App(){
  const [a, setA] = useState(1);
  // 1) 不传依赖：每次提交都运行，更新前清理上一次
  useEffect(() => {
    console.log("effect: no deps run");
    return () => console.log("effect: no deps cleanup");
  });

  // 2) 空依赖：仅挂载运行一次，卸载时清理
  useEffect(() => {
    console.log("effect: [] run (mount only)");
    return () => console.log("effect: [] cleanup (unmount)");
  }, []);

  // 3) 指定依赖 [a]：a 变化时先清理后重建
  useEffect(() => {
    console.log("effect: [a] run", a);
    return () => console.log("effect: [a] cleanup", a);
  }, [a]);
  const handle = () => {
    setA(v => v + 1);
  }
  return (
    <div>
      <button id="app" onClick={handle}>
        mebius - {a}
      </button>
      {a % 2 ? <div>奇数</div> : <p>偶数</p>}
    </div>
  )
}
export default App;