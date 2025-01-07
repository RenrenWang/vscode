const vscode = require('vscode');
const path = require('path');
const { DebugAdapterDescriptorFactory } = require('./mysqlDebugAdapter');

function activate(context) {
    // 注册调试适配器描述符工厂
    const factory = new DebugAdapterDescriptorFactory();
    context.subscriptions.push(
        vscode.debug.registerDebugAdapterDescriptorFactory('mysql', factory)
    );

    // 可选：当工厂被注销时清理资源
    context.subscriptions.push({
        dispose: () => {
            factory.dispose();
        }
    });

    console.log('MySQL debugger extension is now active!');
}

function deactivate() {
    // 清理资源
}

module.exports = {
    activate,
    deactivate
};