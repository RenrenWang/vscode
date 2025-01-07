const {
    LoggingDebugSession,
    InitializedEvent,
    StoppedEvent,
    TerminatedEvent,
    OutputEvent,
    Breakpoint,
    Source
} = require('vscode-debugadapter');
const mysql = require('mysql2/promise');
const path = require('path');

class MySQLDebugSession extends LoggingDebugSession {
    constructor() {
        super("mysql-debug.txt");
        this._connection = null;
        this._statements = [];
        this._currentStatement = 0;
        this._breakpoints = new Map();
        this._isPaused = false;
    }

    initializeRequest(response, args) {
        response.body = response.body || {};
        // 声明调试器支持的功能
        response.body.supportsConfigurationDoneRequest = true;
        response.body.supportsStepFeatures = true;
        response.body.supportsBreakpointLocationsRequest = true;
        response.body.supportsSingleThreadExecutionAtBreakpoints = true;
        response.body.supportsStepBack = false;
        response.body.supportsSetVariable = false;
        response.body.supportsRestartFrame = false;
        response.body.supportsGotoTargetsRequest = false;
        response.body.supportsStepInTargetsRequest = false;
        response.body.supportsCompletionsRequest = false;
        response.body.supportsModulesRequest = false;
        response.body.supportsValueFormattingOptions = false;
        response.body.supportsHitConditionalBreakpoints = false;
        response.body.supportsSetExpression = false;

        this.sendResponse(response);
        this.sendEvent(new InitializedEvent());
    }

    setBreakPointsRequest(response, args) {
        const path = args.source.path;
        const clientLines = args.lines || [];

        // 清除旧的断点
        this._breakpoints.delete(path);
        
        // 存储新的断点
        const breakpoints = clientLines.map(line => {
            const bp = new Breakpoint(true, line);
            bp.verified = true;
            return bp;
        });
        this._breakpoints.set(path, breakpoints);

        // 发送断点响应
        response.body = {
            breakpoints: breakpoints
        };
        this.sendResponse(response);
    }

    async launchRequest(response, args) {
        try {
            const { host, user, password, database, statements, program } = args;
            this._statements = statements;
            
            // 存储源文件路径
            this._sourcePath = program;

            // 连接数据库
            await this._createMySQLConnection(host, user, password, database);
            
            // 发送连接信息
            this.sendEvent(new OutputEvent(`Connected to MySQL at ${host}\n`));
            this.sendEvent(new OutputEvent(`Database: ${database}\n`));
            this.sendEvent(new OutputEvent(`User: ${user}\n`));
            this.sendEvent(new OutputEvent(`Current Time (UTC): ${new Date().toISOString()}\n\n`));

            // 开始执行
            await this._executeNextStatement();

            this.sendResponse(response);
        } catch (err) {
            this.sendErrorResponse(response, {
                id: 1,
                format: `Error: ${err.message}`,
                showUser: true
            });
        }
    }

    async continueRequest(response, args) {
        this._isPaused = false;
        await this._executeNextStatement();
        this.sendResponse(response);
    }

    async nextRequest(response, args) {
        await this._executeNextStatement();
        this.sendResponse(response);
    }

    async _executeNextStatement() {
        if (this._currentStatement >= this._statements.length) {
            await this._connection.end();
            this.sendEvent(new OutputEvent('Execution completed.\n'));
            this.sendEvent(new TerminatedEvent());
            return;
        }

        const statement = this._statements[this._currentStatement];
        
        // 检查是否有断点
        const shouldBreak = this._shouldBreakOnLine(statement.startLine);

        // 发送高亮事件
        this.sendEvent({
            event: 'highlightSQL',
            body: { 
                lineNumber: statement.startLine,
                sql: statement.sql
            }
        });

        // 如果有断点，暂停执行
        if (shouldBreak && !this._isPaused) {
            this._isPaused = true;
            this.sendEvent(new StoppedEvent('breakpoint', 1));
            return;
        }

        // 执行SQL
        this.sendEvent(new OutputEvent(`Executing SQL:\n${statement.sql}\n`));
        
        try {
            const [rows] = await this._connection.query(statement.sql);
            const resultStr = Array.isArray(rows) 
                ? `Results (${rows.length} rows):\n${JSON.stringify(rows, null, 2)}\n\n`
                : `Affected rows: ${rows.affectedRows}\n\n`;
            this.sendEvent(new OutputEvent(resultStr));
        } catch (err) {
            this.sendEvent(new OutputEvent(`Error executing SQL: ${err.message}\n`, 'stderr'));
            throw err;
        }

        this._currentStatement++;

        if (this._currentStatement < this._statements.length) {
            this.sendEvent(new StoppedEvent('step', 1));
        } else {
            await this._connection.end();
            this.sendEvent(new OutputEvent('Execution completed.\n'));
            this.sendEvent(new TerminatedEvent());
        }
    }

    _shouldBreakOnLine(line) {
        if (!this._sourcePath || !this._breakpoints.has(this._sourcePath)) {
            return false;
        }

        const bps = this._breakpoints.get(this._sourcePath);
        return bps.some(bp => bp.line === line && bp.verified);
    }

    threadsRequest(response) {
        // 返回单个线程
        response.body = {
            threads: [
                {
                    id: 1,
                    name: "MySQL Query Thread"
                }
            ]
        };
        this.sendResponse(response);
    }

    stackTraceRequest(response, args) {
        const statement = this._statements[this._currentStatement] || this._statements[0];
        const source = new Source(
            path.basename(this._sourcePath),
            this._sourcePath
        );

        response.body = {
            stackFrames: [{
                id: 1,
                name: "SQL Execution",
                source: source,
                line: statement.startLine,
                column: 0
            }]
        };
        this.sendResponse(response);
    }

    scopesRequest(response, args) {
        response.body = {
            scopes: [{
                name: "SQL Variables",
                variablesReference: 1,
                expensive: false
            }]
        };
        this.sendResponse(response);
    }

    async variablesRequest(response, args) {
        if (!this._connection) {
            response.body = { variables: [] };
            this.sendResponse(response);
            return;
        }

        try {
            const [variables] = await this._connection.query('SHOW VARIABLES');
            response.body = {
                variables: variables.map(v => ({
                    name: v.Variable_name,
                    value: v.Value,
                    variablesReference: 0
                }))
            };
        } catch (err) {
            response.body = { variables: [] };
        }
        
        this.sendResponse(response);
    }

    async _createMySQLConnection(host, user, password, database) {
        this._connection = await mysql.createConnection({
            host,
            user,
            password,
            database,
            multipleStatements: true
        });
    }
}

module.exports = MySQLDebugSession;