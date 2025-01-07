
```javascript
const {
  LoggingDebugSession,
  InitializedEvent,
  StoppedEvent,
  Breakpoint
} = require('vscode-debugadapter');
const mysql = require('mysql2/promise');

class MySQLDebugSession extends LoggingDebugSession {
  constructor() {
    // 将日志输出到 mysql-debug-log.txt
    super('mysql-debug-log.txt');
    this._breakpoints = new Map();
    this._connection = null;
  }

  /**
   * VS Code 首先会发送 initialize 请求
   */
  initializeRequest(response, args) {
    response.body = response.body || {};
    response.body.supportsConfigurationDoneRequest = true;
    this.sendResponse(response);
    this.sendEvent(new InitializedEvent());
  }

  /**
   * VS Code 设置或移除断点时，会调用此方法
   */
  setBreakPointsRequest(response, args) {
    const filePath = args.source.path || '';
    const requestedBreakpoints = args.breakpoints || [];

    // 本示例仅将断点“存”在 Map 中，并直接返回全部有效
    this._breakpoints.set(filePath, requestedBreakpoints);

    // 返回给 VS Code 的断点信息
    const actualBreakpoints = requestedBreakpoints.map(bp => new Breakpoint(true, bp.line));
    response.body = { breakpoints: actualBreakpoints };
    this.sendResponse(response);
  }

  /**
   * 当用户点击“开始调试”后，请求将发送到 launchRequest
   */
  async launchRequest(response, args) {
    try {
      const { host, user, password, database, sql } = args;
      await this._createMySQLConnection(host, user, password, database);
      this._log(`开始执行 SQL: ${sql}`);
      await this._executeSQL(sql);

      // 发送 StoppedEvent，表示调试会话可结束
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
      this._connection = null;
      this._log('数据库连接已关闭');
    }
  }

  _log(message) {
    this.sendEvent({
      event: 'output',
      body: { category: 'console', output: `[MySQLDebug] ${message}\n` },
      seq: 0,
      type: 'event'
    });
  }
}

module.exports = {
  MySQLDebugSession
};