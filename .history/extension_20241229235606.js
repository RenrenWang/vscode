const vscode = require('vscode');
const inspector = require('inspector');

function activate(context) {
    const outputChannel = vscode.window.createOutputChannel("JS Debug");

    const disposable = vscode.commands.registerCommand('extension.runDebugJS', async () => {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showErrorMessage('No active editor found!');
            return;
        }

        const code = editor.document.getText(editor.selection);
        if (!code) {
            vscode.window.showWarningMessage('No JavaScript code selected!');
            return;
        }

        // 获取断点行号
        const breakpointLine = await vscode.window.showInputBox({
            prompt: "Enter line number for breakpoint",
            placeHolder: "e.g., 1",
            ignoreFocusOut: true
        });

        if (!breakpointLine || isNaN(breakpointLine)) {
            vscode.window.showErrorMessage("Invalid line number for breakpoint!");
            return;
        }

        try {
            // 启动调试会话
            const session = new inspector.Session();
            session.connect();

            // 启动脚本并设置断点
            session.post('Debugger.enable', () => {
                session.post('Debugger.setBreakpointByUrl', {
                    lineNumber: parseInt(breakpointLine) - 1,
                    url: 'debug.js' // 用虚拟 URL 表示脚本
                }, () => {
                    outputChannel.appendLine(`Breakpoint set at line ${breakpointLine}`);
                });

                // 执行脚本
                session.post('Runtime.evaluate', {
                    expression: code,
                    contextId: 1
                }, (err, result) => {
                    if (err) {
                        outputChannel.appendLine(`Error: ${err.message}`);
                    } else {
                        outputChannel.appendLine(`Result: ${JSON.stringify(result.result)}`);
                    }
                });
            });

            session.on('Debugger.paused', (message) => {
                outputChannel.appendLine('Debugger paused at breakpoint:');
                outputChannel.appendLine(JSON.stringify(message.params, null, 2));

                // 恢复执行
                session.post('Debugger.resume');
            });

        } catch (err) {
            outputChannel.appendLine(`Error: ${err.message}`);
        }

        outputChannel.show();
    });

    context.subscriptions.push(disposable, outputChannel);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
