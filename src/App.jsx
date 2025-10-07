import React from "./react";
import { useState } from "./hooks/useState";
import { useEffect } from "./hooks/useEffect";
import { scheduleUpdate, Priority } from "./utils/scheduler.js";

// 优先级测试组件
function PriorityTestApp() {
  const [counter, setCounter] = useState(0);
  const [logs, setLogs] = useState([]);
  const [isLowPriorityWorkRunning, setIsLowPriorityWorkRunning] = useState(false);

  // 添加日志的函数
  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setLogs(prevLogs => [...prevLogs, logEntry]);
    console.log(logEntry);
  };

  // 更新计数器
  const updateCounter = (priorityName) => {
    const priority = Priority[priorityName];
    setCounter(prev => prev + 1);
    addLog(`触发 ${priorityName} 优先级更新，计数: ${counter + 1}`);
    scheduleUpdate(priority);
  };

  // 开始低优先级工作
  const startLowPriorityWork = () => {
    if (isLowPriorityWorkRunning) {
      addLog("低优先级工作已在运行中...");
      return;
    }
    
    setIsLowPriorityWorkRunning(true);
    addLog("🐌 开始低优先级工作 (模拟5秒的计算密集型任务)");
    
    const startTime = performance.now();
    let iterations = 0;
    let shouldContinue = true; // 使用局部变量控制循环
    
    // 创建一个可以访问最新状态的日志函数
    const logWithCurrentState = (message) => {
      const timestamp = new Date().toLocaleTimeString();
      const logEntry = `[${timestamp}] ${message}`;
      console.log(logEntry);
      // 使用函数式更新确保获取最新状态
      setLogs(prevLogs => [...prevLogs, logEntry]);
    };
    
    function doWork() {
      if (!shouldContinue) {
        setIsLowPriorityWorkRunning(false);
        logWithCurrentState(`⏹️ 低优先级工作被中断，总计 ${iterations} 次迭代`);
        return;
      }
      
      const batchSize = 1000;
      for (let i = 0; i < batchSize; i++) {
        iterations++;
        // 模拟计算工作
        Math.sqrt(iterations);
      }
      
      const elapsed = performance.now() - startTime;
      if (elapsed < 5000 && shouldContinue) {
        logWithCurrentState(`低优先级工作进行中... 已执行 ${iterations} 次迭代`);
        setTimeout(doWork, 10); // 继续工作
      } else {
        shouldContinue = false;
        setIsLowPriorityWorkRunning(false);
        logWithCurrentState(`✅ 低优先级工作完成，总计 ${iterations} 次迭代`);
      }
    }
    
    // 将停止函数暴露到全局，以便打断函数可以调用
    window.stopLowPriorityWork = () => {
      shouldContinue = false;
    };
    
    doWork();
  };

  // 高优先级打断
  const interruptWithHighPriority = () => {
    addLog("🚨 触发立即优先级任务，应该打断低优先级工作");
    if (window.stopLowPriorityWork) {
      window.stopLowPriorityWork();
    }
    setIsLowPriorityWorkRunning(false);
    setCounter(prev => prev + 10);
    scheduleUpdate(Priority.immediate);
  };

  // 用户阻塞优先级打断
  const interruptWithUserBlocking = () => {
    addLog("👆 触发用户交互优先级任务，应该打断低优先级工作");
    if (window.stopLowPriorityWork) {
      window.stopLowPriorityWork();
    }
    setIsLowPriorityWorkRunning(false);
    setCounter(prev => prev + 5);
    scheduleUpdate(Priority.userBlocking);
  };

  // 清空日志
  const clearLog = () => {
    setLogs([]);
  };

  // 初始化日志
  useEffect(() => {
    addLog("🚀 React 18 优先级打断测试页面已加载");
    addLog("📋 测试步骤:");
    addLog("1. 点击 '开始低优先级工作' 启动5秒的后台任务");
    addLog("2. 在任务运行期间点击高优先级按钮观察打断效果");
    addLog("3. 查看控制台日志了解详细的调度过程");
  }, []);

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px'
    }}>
      <h1>React 18 优先级打断机制测试</h1>
      
      {/* 计数器测试区域 */}
      <div style={{
        margin: '20px 0',
        padding: '15px',
        border: '1px solid #ddd',
        borderRadius: '8px'
      }}>
        <h2>计数器测试</h2>
        <div style={{
          fontSize: '24px',
          fontWeight: 'bold',
          margin: '10px 0'
        }}>
          计数: {counter}
        </div>
        <button 
          style={{
            margin: '5px',
            padding: '10px 15px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            backgroundColor: '#ff4444',
            color: 'white'
          }}
          onClick={() => updateCounter('immediate')}
        >
          立即优先级 (+1)
        </button>
        <button 
          style={{
            margin: '5px',
            padding: '10px 15px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            backgroundColor: '#ff8800',
            color: 'white'
          }}
          onClick={() => updateCounter('userBlocking')}
        >
          用户交互 (+1)
        </button>
        <button 
          style={{
            margin: '5px',
            padding: '10px 15px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            backgroundColor: '#4488ff',
            color: 'white'
          }}
          onClick={() => updateCounter('normal')}
        >
          普通优先级 (+1)
        </button>
        <button 
          style={{
            margin: '5px',
            padding: '10px 15px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            backgroundColor: '#888888',
            color: 'white'
          }}
          onClick={() => updateCounter('low')}
        >
          低优先级 (+1)
        </button>
        <button 
          style={{
            margin: '5px',
            padding: '10px 15px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            backgroundColor: '#cccccc',
            color: 'black'
          }}
          onClick={() => updateCounter('idle')}
        >
          空闲优先级 (+1)
        </button>
      </div>
      
      {/* 批量更新测试区域 */}
      <div style={{
        margin: '20px 0',
        padding: '15px',
        border: '1px solid #ddd',
        borderRadius: '8px'
      }}>
        <h2>批量更新测试</h2>
        <button 
          style={{
            margin: '5px',
            padding: '10px 15px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            backgroundColor: '#888888',
            color: 'white'
          }}
          onClick={startLowPriorityWork}
        >
          开始低优先级工作 (5秒)
        </button>
        <button 
          style={{
            margin: '5px',
            padding: '10px 15px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            backgroundColor: '#ff4444',
            color: 'white'
          }}
          onClick={interruptWithHighPriority}
        >
          立即优先级打断
        </button>
        <button 
          style={{
            margin: '5px',
            padding: '10px 15px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            backgroundColor: '#ff8800',
            color: 'white'
          }}
          onClick={interruptWithUserBlocking}
        >
          用户交互打断
        </button>
        <button 
          style={{
            margin: '5px',
            padding: '10px 15px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            backgroundColor: '#f0f0f0',
            color: 'black'
          }}
          onClick={clearLog}
        >
          清空日志
        </button>
      </div>
      
      {/* 执行日志区域 */}
      <div style={{
        margin: '20px 0',
        padding: '15px',
        border: '1px solid #ddd',
        borderRadius: '8px'
      }}>
        <h2>执行日志</h2>
        <div style={{
          backgroundColor: '#f5f5f5',
          padding: '10px',
          borderRadius: '4px',
          maxHeight: '300px',
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: '12px',
          whiteSpace: 'pre-line'
        }}>
          {logs.join('\n')}
        </div>
      </div>
    </div>
  );
}

// 原有的简单测试组件
function SimpleApp(){
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

// 主应用组件 - 可以切换不同的测试模式
function App() {
  const [testMode, setTestMode] = useState('priority'); // 'priority' 或 'simple'
  
  return (
    <div>
      <div style={{
        padding: '10px',
        backgroundColor: '#f0f0f0',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <button 
          style={{
            margin: '5px',
            padding: '8px 16px',
            backgroundColor: testMode === 'priority' ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
          onClick={() => setTestMode('priority')}
        >
          优先级测试
        </button>
        <button 
          style={{
            margin: '5px',
            padding: '8px 16px',
            backgroundColor: testMode === 'simple' ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
          onClick={() => setTestMode('simple')}
        >
          简单测试
        </button>
      </div>
      
      {testMode === 'priority' ? <PriorityTestApp /> : <SimpleApp />}
    </div>
  );
}

export default App;