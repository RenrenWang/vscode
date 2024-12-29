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

        const documentUri = editor.document.uri.toString();
        const breakpoints = vscode.debug.breakpoints.filter(bp => bp.location.uri.toString() === documentUri);

        if (breakpoints.length === 0) {
            vscode.window.showWarningMessage("No breakpoints set in the current file!");
            return;
        }

        const breakpointLines = breakpoints.map(bp => bp.location.range.start.line + 1);

        outputChannel.appendLine(`Breakpoints set at lines: ${breakpointLines.join(', ')}`);

        try {
            const session = new inspector.Session();
            session.connect();

            session.post('Debugger.enable', () => {
                breakpointLines.forEach(line => {
                    
                    session.post('Debugger.setBreakpointByUrl', {
                        lineNumber: line - 1,
                        url: editor.document.fileName // 使用真实文件路径
                    }, () => {
                        outputChannel.appendLine(`Breakpoint set at line ${line}`);
                    });
                });

                session.post('Runtime.evaluate', {
                    expression: code,
                    contextId: 1
                }, (err, result) => {
                    if (err) {
                        outputChannel.appendLine(`Error: ${err.message}`);
                    } else {
                        outputChannel.appendLine(`Execution started...`);
                    }
                });
            });

            session.on('Debugger.paused', async (message) => {
                outputChannel.appendLine('Debugger paused at breakpoint:');
                outputChannel.appendLine(JSON.stringify(message.params, null, 2));

                // 用户交互
                let shouldContinue = true;
                while (shouldContinue) {
                    const choice = await vscode.window.showQuickPick(
                        ['Continue', 'Step Into', 'Stop Debugging'],
                        { placeHolder: 'What do you want to do next?' }
                    );

                    if (choice === 'Continue') {
                        session.post('Debugger.resume', () => {
                            outputChannel.appendLine('Execution continued...');
                            shouldContinue = false;
                        });
                    } else if (choice === 'Step Into') {
                        session.post('Debugger.stepInto', () => {
                            outputChannel.appendLine('Stepped into the next line...');
                        });
                    } else if (choice === 'Stop Debugging') {
                        session.disconnect();
                        outputChannel.appendLine('Debugging stopped.');
                        shouldContinue = false;
                    }
                }
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
