const vscode = require('vscode');
const path = require('path');
const { DebugAdapterDescriptorFactory } = require('./mysqlDebugAdapter.js');

function activate(context) {
    // 更改调试器类型为 mysql-debug
    const factory = new DebugAdapterDescriptorFactory();
    context.subscriptions.push(
        vscode.debug.registerDebugAdapterDescriptorFactory('mysql-debug', factory)
    );

    // 注册一个命令来启动调试
    let disposable = vscode.commands.registerCommand('mysql-debug.start', () => {
        vscode.debug.startDebugging(undefined, {
            type: 'mysql-debug',
            name: 'Debug MySQL Query',
            request: 'launch',
            host: 'localhost',
            user: 'root', 
            password: '123456',
            database: 'admin',
            sql: '${file}'
        });
    });

    context.subscriptions.push(disposable);

    console.log('MySQL debugger extension is now active!');
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};