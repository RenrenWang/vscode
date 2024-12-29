const vscode = require('vscode');
const inspector = require('inspector');

function activate(context) {
    const outputChannel = vscode.window.createOutputChannel("JS Debug");

    const disposable = vscode.commands.registerCommand('dd.helloWorld', async () => {
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

        // 获取当前文件的 URI 和断点
        const documentUri = editor.document.uri.toString();
        const breakpoints = vscode.debug.breakpoints.filter(bp => bp.location.uri.toString() === documentUri);

        if (breakpoints.length === 0) {
            vscode.window.showWarningMessage("No breakpoints set in the current file!");
            return;
        }

        // 提取断点的行号
        const breakpointLines = breakpoints.map(bp => bp.location.range.start.line + 1); // 行号是从 0 开始的

        outputChannel.appendLine(`Breakpoints set at lines: ${breakpointLines.join(', ')}`);

        try {
            // 启动调试会话
            const session = new inspector.Session();
            session.connect();

            // 启动脚本并设置断点
            session.post('Debugger.enable', () => {
                breakpointLines.forEach(line => {
                    session.post('Debugger.setBreakpointByUrl', {
                        lineNumber: line - 1,
                        url: 'debug.js' // 用虚拟 URL 表示脚本
                    }, () => {
                        outputChannel.appendLine(`Breakpoint set at line ${line}`);
                    });
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
