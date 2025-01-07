const {
    LoggingDebugSession,
    InitializedEvent,
    StoppedEvent,
    TerminatedEvent,
    OutputEvent,
    Source,
    StackFrame,
    Thread
} = require('vscode-debugadapter');
const mysql = require('mysql2/promise');
const path = require('path');

class DebugSession extends LoggingDebugSession {
    constructor() {
        super("mysql-debug.txt");
        this._connection = null;
        this._sqlStatements = [];
        this._currentStatement = 0;
        this._breakpoints = new Map();
        this._stopped = false;
    }

    initializeRequest(response, args) {
        response.body = response.body || {};
        response.body.supportsConfigurationDoneRequest = true;
        response.body.supportsStepBack = false;
        response.body.supportsStepInTargetsRequest = false;
        response.body.supportsStepInRequest = false;
        response.body.supportsStepOutRequest = false;
        response.body.supportsStepOverRequest = true;
        response.body.supportsSingleThreadExecutionAtBreakpoints = true;
        response.body.supportsSetVariable = false;
        
        this.sendResponse(response);
        this.sendEvent(new InitializedEvent());
    }

    // 处理设置断点请求
    setBreakPointsRequest(response, args) {
        const path = args.source.path;
        const clientLines = args.lines || [];

        // 清除旧的断点
        this._breakpoints.clear();
        
        // 设置新的断点
        const breakpoints = clientLines.map(line => {
            const bp = { verified: true, line };
            this._breakpoints.set(line, bp);
            return bp;
        });

        response.body = { breakpoints };
        this.sendResponse(response);
    }

    // 处理单步执行请求
    nextRequest(response, args) {
        this._stopped = false;
        this.sendResponse(response);
        this.executeNextStatement();
    }

    // 处理继续执行请求
    continueRequest(response, args) {
        this._stopped = false;
        this.sendResponse(response);
        this.executeNextStatement();
    }

    threadsRequest(response) {
        response.body = {
            threads: [
                new Thread(1, "主线程")
            ]
        };
        this.sendResponse(response);
    }

    stackTraceRequest(response, args) {
        const frames = [];
        if (this._currentStatement < this._sqlStatements.length) {
            const statement = this._sqlStatements[this._currentStatement];
            frames.push(new StackFrame(
                0,
                `SQL Statement ${this._currentStatement + 1}`,
                new Source(path.basename(this._sourceFile), this._sourceFile),
                this._getStatementLine(this._currentStatement)
            ));
        }
        response.body = {
            stackFrames: frames,
            totalFrames: frames.length
        };
        this.sendResponse(response);
    }

    async launchRequest(response, args) {
        try {
            const { host, user, password, database, sql, sourceFile } = args;
            this._sourceFile = sourceFile;

            // 解析SQL语句
            this._sqlStatements = this._parseSqlStatements(sql);
            if (this._sqlStatements.length === 0) {
                throw new Error('No SQL statements found');
            }

            // 连接数据库
            await this._createMySQLConnection(host, user, password, database);
            
            this.sendEvent(new OutputEvent(`Found ${this._sqlStatements.length} SQL statements to execute\n`));
            
            // 开始执行第一条语句
            this.executeNextStatement();
            
            this.sendResponse(response);
        } catch (err) {
            this.sendEvent(new OutputEvent(`Error: ${err.message}\n`, 'stderr'));
            this.sendErrorResponse(response, {
                id: 1,
                format: `Error: ${err.message}`,
                showUser: true
            });
        }
    }

    async _createMySQLConnection(host, user, password, database) {
        this._connection = await mysql.createConnection({
            host,
            user,
            password,
            database,
            multipleStatements: true // 允许多语句执行
        });
        this.sendEvent(new OutputEvent('Database connection established\n'));
    }

    _parseSqlStatements(sql) {
        // 使用正则表达式分割SQL语句，保留注释
       const sqlList=sql.split(/;(?=(?:[^'"`]*(['"`])[^'"`]*\1)*[^'"`]*$)/g)
        return sqlList.filter(stmt => stmt.trim())
            .map(stmt => stmt.trim())
            .filter(stmt => stmt && !stmt.startsWith('--') && stmt !== '\n');
    }

    async executeNextStatement() {
        if (this._stopped || this._currentStatement >= this._sqlStatements.length) {
            if (this._currentStatement >= this._sqlStatements.length) {
                await this._connection?.end();
                this.sendEvent(new TerminatedEvent());
            }
            return;
        }

        const currentLine = this._getStatementLine(this._currentStatement);
        
        // 检查是否有断点
        if (this._breakpoints.has(currentLine)) {
            this._stopped = true;
            this.sendEvent(new StoppedEvent('breakpoint', 1));
            return;
        }

        try {
            const statement = this._sqlStatements[this._currentStatement];
            this.sendEvent(new OutputEvent(`Executing SQL (${this._currentStatement + 1}/${this._sqlStatements.length}):\n${statement}\n`));

            const [results] = await this._connection.query(statement);
            this.sendEvent(new OutputEvent(`Results:\n${JSON.stringify(results, null, 2)}\n`));

            this._currentStatement++;
            
            if (this._currentStatement < this._sqlStatements.length) {
                // 继续执行下一条语句
                setImmediate(() => this.executeNextStatement());
            } else {
                // 所有语句执行完毕
                await this._connection.end();
                this.sendEvent(new TerminatedEvent());
            }
        } catch (err) {
            this.sendEvent(new OutputEvent(`Error executing statement ${this._currentStatement + 1}: ${err.message}\n`, 'stderr'));
            this._stopped = true;
            this.sendEvent(new StoppedEvent('exception', 1));
        }
    }

    _getStatementLine(statementIndex) {
        // 简单实现：假设每条语句占一行
        return statementIndex + 1;
    }
}

module.exports = DebugSession;