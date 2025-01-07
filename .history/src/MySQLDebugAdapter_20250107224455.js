const vscode = require('vscode');
const DebugSession = require('./mysqlDebugSession.js');
const path = require('path');

class DebugAdapterDescriptorFactory {
    createDebugAdapterDescriptor(session) {
        // 返回一个 debug adapter 执行器
        return new vscode.DebugAdapterInlineImplementation(new DebugSession());
    }
}

module.exports = {
    DebugAdapterDescriptorFactory
};