
const vscode = require('vscode');
const path = require('path');

class MySQLDebugAdapterDescriptorFactory {
  createDebugAdapterDescriptor(session) {
    // 指向本项目中的 DebugSession.js
    const adapterPath = path.join(__dirname, 'DebugSession.js');
    // 返回一个 DebugAdapterExecutable，使用 Node.js 启动
    return new vscode.DebugAdapterExecutable('node', [adapterPath]);
  }
}

module.exports = {
  MySQLDebugAdapterDescriptorFactory
};