const vscode = require('vscode');
const { DebugSession } = require('./mysqlDebugSession');
const path = require('path');

class DebugAdapterDescriptorFactory {
    constructor() {
    }

    createDebugAdapterDescriptor(session) {
        // 返回一个可执行的调试适配器
        const debuggerPath = path.join(__dirname, 'mysqlDebugSession.js');
        return new vscode.DebugAdapterExecutable(
            process.execPath,
            [debuggerPath],
            { cwd: process.cwd() }
        );
    }

    dispose() {
    }
}

// 如果直接运行此文件，启动调试会话
if (require.main === module) {
    DebugSession.run(DebugSession);
}

module.exports = {
    DebugAdapterDescriptorFactory
};