说明要点:  
1. 去掉了原先 "program": "./src/..." 等字段，因为我们这次会用 DebugAdapterServer 的模式。  
2. 保持 "type": "mysqlsql"，以与 launch.json 或用户配置匹配。  

--------------------------------------------------------------------------------
三、extension.js
--------------------------------------------------------------------------------

在激活时，我们将注册一个 DebugAdapterDescriptorFactory，但是返回的是 DebugAdapterServer。其逻辑是：  
• 插件先在本地监听一个 TCP 端口 (例如 4711)，再用自定义的 DebugSession 管理请求。  
• 当 VS Code 请求调试适配器时，就通过 DebugAdapterServer 连接到该端口。

```javascript
```javascript
const vscode = require('vscode');
const net = require('net');
const { MySQLDebugSession } = require('./DebugSession');
const { MySQLDebugAdapterServerDescriptorFactory } = require('./MySQLDebugAdapterServer');

let server;

/**
 * 在插件激活时启动一个 TCP 服务器，加载 DebugSession。
 */
function activate(context) {
  // 启动 TCP 服务器
  server = net.createServer(socket => {
    const session = new MySQLDebugSession();
    session.setRunAsServer(true);
    session.start(socket, socket);
  });

  // 监听 4711 端口，可根据需要修改
  server.listen(4711, '127.0.0.1', () => {
    console.log('[MySQLDebug] TCP server listening on port 4711');
  });

  // 注册一个返回 DebugAdapterServer 的工厂，VS Code 将连接到 localhost:4711
  const factory = new MySQLDebugAdapterServerDescriptorFactory(4711);
  const registration = vscode.debug.registerDebugAdapterDescriptorFactory('mysqlsql', factory);
  context.subscriptions.push(registration);
}

function deactivate() {
  // 清理资源：关闭服务器
  if (server) {
    server.close();
    server = undefined;
  }
}

module.exports = {
  activate,
  deactivate
};