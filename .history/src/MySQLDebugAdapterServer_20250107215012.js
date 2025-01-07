--------------------------------------------------------------------------------
四、MySQLDebugAdapterServer.js
--------------------------------------------------------------------------------

此文件返回一个 DebugAdapterServer 描述符，从而让 VS Code 通过 TCP 端口连接到我们的调试会话。

```javascript
```javascript
const vscode = require('vscode');

class MySQLDebugAdapterServerDescriptorFactory {
  constructor(port) {
    this.port = port;
  }

  createDebugAdapterDescriptor(session) {
    // 返回一个 DebugAdapterServer，VS Code 会连接到该服务器
    return new vscode.DebugAdapterServer(this.port, '127.0.0.1');
  }
}

module.exports = {
  MySQLDebugAdapterServerDescriptorFactory
};