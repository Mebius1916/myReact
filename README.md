#### 渲染流程

首先我们写`react`代码的时候会使用`jsx`语法，这里的`jsx`代码会被`babel`等插件编译成`react`中`createElement`方法的调用，并传入`type、props、children`。这样`jsx`就会被转换成一个`React Element`对象（也就是虚拟`dom`），随后这个`React Element`和渲染容器会被一同传入`render`方法中。

`render`方法会根据传入的`虚拟dom`创建一个`fiber`根节点，并将传入的虚拟`dom`作为该根节点的子节点，同时记录当前渲染的真实`dom`引用。随后调度器会判断当前是否有待执行的`fiber`节点，并在浏览器有空余时间时调用`fiber`工厂函数以**深度优先遍历**的方式逐层将虚拟`dom`对象转化为`fiber`结构，并通过父、子、兄弟三个指针将它们连接成一个链表化的树。 

在`fiber`树的创建过程中会用到`diff`算法来实现更高效的更新，而`diff`算法依赖于**双缓冲树机制**。React 内部同时维护两棵`fiber`树：一棵是当前屏幕上正在显示的`current fiber tree`，另一棵是正在构建的`workInProgress fiber tree`。当新的`React Element`进来时（虚拟`dom`→`fiber node`），React 会将其与`current fiber tree`对应节点对比，并在`workInProgress`树上生成新的`fiber`节点：
  - 当新旧节点的 `type` 相同时：会创建一个 `effectTag` 为 `UPDATE` 的新 `fiber`，旧的对应 `fiber` 会作为该新 `fiber` 的 `alternate`，用于复用旧 `DOM`；在提交阶段会对比新旧`fiber`节点的属性，并删除不再存在的旧属性，添加新的属性。
  - 当 `type` 不同时且存在新节点：会创建一个 `effectTag` 为 `PLACEMENT` 的新 `fiber`，表示该节点是新增节点；在提交阶段创建并插入对应的 `DOM`。
  - 当旧节点存在但新节点缺失，或类型不同导致旧节点不再需要：会把旧的对应 `fiber` 标记为 `DELETION`，加入删除队列；在提交阶段移除其对应的 `DOM`（必要时递归到实际有 `DOM` 的子节点）。

当`fiber`树构建完成后，代表`render`阶段结束，`commit`阶段开始。在`commit`阶段`React`就不再支持任务中断的时间分片机制，这个阶段会调用`commit`函数，深度优先遍历`fiber`树，通过判断`render`阶段打上的标签来确定是更新、创建还是删除操作，并将变更同步到真实的`dom`上，实现最小化的更新。

`React` 会维护一个优先级任务队列来存储任务。`React` 使用 `Lane` 模型（31 位二进制）来表示任务优先级，每个任务还有属于自己的超时时间，这是 `React` 的饥饿防护机制。如果一个任务过期，那么它会拥有最高优先级并被强制执行。

`React` 默认每 5ms 检查一次是否需要中断当前 `Fiber` 节点的工作单元。如果检测到有高优先级任务或过期任务，则中断当前工作单元的构建，优先执行过期任务或高优先级任务。

`React` 使用 `MessageChannel` 来替代 `requestIdleCallback` 进行任务调度，因为 `requestIdleCallback` 工作帧率低（只有 20FPS）且存在兼容性问题。`MessageChannel` 在这里的作用是创建一个宏任务，用于在下一个事件循环中执行被中断后需要继续的工作。

---

#### useState原理

在`fiber`树的构建过程中，当前正在处理的`fiber`节点会被记录下来。每个`fiber`节点都包含一个`alternate`属性，可以访问到旧`fiber`树中对应的`fiber`节点。这样，我们就能获取到旧的`hook`，也就是之前的`useState` 对象。

这个`useState`对象包含三个属性：`state`（状态）、`queue`（保存`setState`回调函数的队列）、`next`（指向下一个对象）。通过继承旧对象的`state`和`queue`，我们可以创建一个新的`useState`对象。接下来，React 会遍历这个队列中的回调函数，来更新当前对象中的`state`。

`useState`返回两个值：`state`和`setState`。其中，`state`就是新`useState`对象中更新后的状态，而`setState`是一个函数，它将传入的值添加到新`useState`对象的`queue`队列中，并触发`update`。不过，`update` 不是立即执行的，而是被包裹在一个微任务中。

为什么要使用微任务？原因是我们不希望每次调用`setState`都触发一次`update`，因为那样会浪费性能。`setState`是同步的，但为了避免性能问题，React 采用了比同步优先级低的微任务机制。这意味着多个`setState`调用会在同一微任务中批量处理，从而提高性能。这就是`useState` 实现的异步批量更新机制。

---

#### useEffect原理

在 `React` 的 **`render`**** 阶段**（即 `fiber` 树构建阶段），React 会收集所有的 **`effect`**** 回调函数**，并将它们作为 `fiber` 节点的一个属性。待 `fiber` 树构建完成并提交（`commit`）生成真实的 DOM 树后，React 会通过深度优先遍历，对比新旧依赖数组，以决定是否执行收集到的 `effect` 回调函数以及上一轮的清理函数。

这里的 **清理函数**，指的是在 `effect` 回调函数中通过 `return` 返回的函数。上一轮的清理函数不会立即执行，而是会参与当前 `effect` 回调的依赖数组比较，并会在当前轮次的 `effect` 回调之前执行。

具体规则如下：

1. **不存在依赖数组**：直接执行 `effect` 回调函数。
2. **依赖数组为空**（`componentDidMount`）：通过 `fiber` 节点的 `alternate` 属性来判断是否是首次渲染。`alternate` 属性记录了当前 `fiber` 节点对应的旧 `fiber` 节点。如果 `alternate` 存在，说明不是首次渲染，这时候 `effect` 会被跳过。如果是首次渲染，则会执行 `effect` 回调。
3. **依赖数组不为空**（`componentDidUpdate`）：如果依赖数组发生变化，则会先执行上一轮的清理函数，然后执行当前轮次的 `effect` 回调。
4. **依赖数组为空且返回清理函数**（`componentWillUnmount`）：组件在卸载时执行清理函数，卸载组件时会清理掉之前的副作用。

