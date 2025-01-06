const vscode = require('vscode');
const { spawn } = require('child_process');

function activate(context) {
    const outputChannel = vscode.window.createOutputChannel("JS Debug");

    const disposable = vscode.commands.registerCommand('dd.helloWorld', async () => {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showErrorMessage('No active editor found!');
            return;
        }

        const scriptPath = editor.document.fileName;
        const terminal = vscode.window.createTerminal('JS Debug');
        terminal.show();

        const nodeProcess = spawn('node', ['--inspect-brk', scriptPath]);

        nodeProcess.stdout.on('data', (data) => {
            outputChannel.appendLine(data.toString());
        });

        nodeProcess.stderr.on('data', (data) => {
            outputChannel.appendLine(`Error: ${data.toString()}`);
        });

        nodeProcess.on('close', (code) => {
            outputChannel.appendLine(`Node.js process exited with code ${code}`);
        });

        // Example of setting a breakpoint at line 10
        const breakpoints = vscode.debug.breakpoints.filter(bp => bp.location.uri.toString() === editor.document.uri.toString());
        const breakpointLines = breakpoints.map(bp => bp.location.range.start.line + 1);

        outputChannel.appendLine(`Breakpoints set at lines: ${breakpointLines.join(', ')}`);

        // Attach to the Node.js process for debugging
        vscode.debug.startDebugging(undefined, {
            type: 'node',
            request: 'attach',
            name: 'Attach to Node.js',
            port: 9229
        });

        outputChannel.show();
    });

    context.subscriptions.push(disposable, outputChannel);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};