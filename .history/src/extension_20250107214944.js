
const vscode = require('vscode');
const net = require('net');
const { MySQLDebugSession } = require('./DebugSession.js');
const { MySQLDebugAdapterServerDescriptorFactory } = require('./MySQLDebugAdapterServer.js');

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