import React from "./react";
import { useState } from "./hooks/useState";

function App(){
  const [a, setA] = useState(1);
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