const vscode = require('vscode');
const { MySQLDebugAdapterDescriptorFactory } = require('./MySQLDebugAdapter.js');

function activate(context) {
  // 注册自定义调试类型 "mysqlsql" 的描述符工厂
  const factory = new MySQLDebugAdapterDescriptorFactory();
  const registration = vscode.debug.registerDebugAdapterDescriptorFactory('mysqlsql', factory);

  // 将 registration 添加到 context.subscriptions
  context.subscriptions.push(registration);
}

function deactivate() {
  // 插件被关闭时的清理逻辑（如果需要的话）
}

module.exports = {
  activate,
  deactivate
};