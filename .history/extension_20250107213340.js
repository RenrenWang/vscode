--------------------------------------------------------------------------------
4. src/DebugSession.js
--------------------------------------------------------------------------------
这是你提供的主要调试会话逻辑，包含了断点管理、MySQL 连接与 SQL 执行的示例代码。

```javascript
```javascript
const {
  LoggingDebugSession,
  InitializedEvent,
  StoppedEvent,
  Breakpoint
} = require('vscode-debugadapter');
const { DebugProtocol } = require('vscode-debugprotocol');
const mysql = require('mysql2/promise');

class MySQLDebugSession extends LoggingDebugSession {
  constructor() {
    super('mysql-debug-log.txt'); // 在日志文件中记录调试信息
    this._breakpoints = new Map();
    this._connection = null;
  }

  // VS Code 首先会发送 initialize 请求
  initializeRequest(response, args) {
    response.body = response.body || {};
    // 告诉前端，我们支持配置完成请求
    response.body.supportsConfigurationDoneRequest = true;
    this.sendResponse(response);

    // 通知 VS Code 初始化已完成
    this.sendEvent(new InitializedEvent());
  }

  // VS Code 设置或移除断点时调用此方法
  setBreakPointsRequest(response, args) {
    const filePath = args.source.path || '';
    const breakpoints = args.breakpoints || [];

    // 将断点信息保存在内存 Map 中
    this._breakpoints.set(filePath, breakpoints);

    // 这里简单地全部认定为有效断点
    const actualBreakpoints = breakpoints.map(bp => {
      return new Breakpoint(true, bp.line);
    });

    response.body = {
      breakpoints: actualBreakpoints
    };
    this.sendResponse(response);
  }

  // 当用户点击“开始调试”后，会调用 launchRequest
  async launchRequest(response, args) {
    try {
      const { host, user, password, database, sql } = args;

      // 建立数据库连接
      await this._createMySQLConnection(host, user, password, database);
      this._log(`开始执行 SQL: ${sql}`);

      // 简化示例，直接执行 SQL
      await this._executeSQL(sql);

      // 执行完后，发送 StoppedEvent，让 VS Code 知道调试已结束
      this.sendEvent(new StoppedEvent('end', 1));
      this.sendResponse(response);
    } catch (err) {
      this.sendErrorResponse(response, 1, err.message);
    }
  }

  async _createMySQLConnection(host, user, password, database) {
    this._connection = await mysql.createConnection({ host, user, password, database });
    this._log('数据库连接已建立');
  }

  async _executeSQL(sql) {
    if (!this._connection) {
      throw new Error('尚未建立数据库连接');
    }
    try {
      const [rows] = await this._connection.query(sql);
      this._log(`执行结果: ${JSON.stringify(rows)}`);
    } finally {
      await this._connection.end();
      this._log('数据库连接已关闭');
    }
  }

  _log(message) {
    this.sendEvent({
      event: 'output',
      body: {
        category: 'console',
        output: `[MySQLDebug] ${message}\n`
      },
      seq: 0,
      type: 'event'
    });
  }
}

// 如果直接用 Node.js 启动该脚本，可用以下方式
if (require.main === module) {
  MySQLDebugSession.run(MySQLDebugSession);
} else {
  module.exports = MySQLDebugSession;
}