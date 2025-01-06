const fs = require('fs');
const mysql = require('mysql2/promise');
const vscode = require('vscode'); // 引入 VS Code API

// 配置数据库连接
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'admin'
};

// 逐条执行 SQL 文件
async function executeSQL(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error('Error: SQL file not found!');
        process.exit(1);
    }

    const sqlContent = fs.readFileSync(filePath, 'utf-8');
    let queries = sqlContent
        .split(';') // 按分号分割语句
        .map(query => query.trim()) // 去除多余空白
        .filter(Boolean); // 移除空行

    if (queries.length === 0) {
        console.error('Error: No valid SQL statements found!');
        process.exit(1);
    }

    console.log(`Found ${queries.length} SQL statements in ${filePath}`);
    console.log('Connecting to database...');

    const connection = await mysql.createConnection(dbConfig);

    try {
        for (const [index, query] of queries.entries()) {
            // 获取当前 SQL 文件中的断点
            const breakpoints = vscode.debug.breakpoints.filter(bp => {
                return bp.location.uri.toString() === vscode.window.activeTextEditor.document.uri.toString()
                       && bp.location.range.start.line === index;
            });

            // 如果该行有断点，暂停执行
            if (breakpoints.length > 0) {
                console.log(`Breakpoint found at statement ${index + 1}:`);
                await pauseForDebug(); // 暂停，等待用户输入继续
            }

            try {
                console.log(`Executing statement ${index + 1}:`);
                const [results] = await connection.query(query);
                console.log(`Results for statement ${index + 1}:`, results);
            } catch (err) {
                console.error(`Error executing statement ${index + 1}:`, err.message);
            }
        }
    } finally {
        await connection.end();
        console.log('\nConnection closed.');
    }
}

// 暂停调试，等待用户输入继续
async function pauseForDebug() {
    return new Promise(resolve => {
        console.log('Press ENTER to continue to the next statement...');
        resolve();
    });
}

// 脚本主入口
(async function main() {
    const filePath = process.argv[2]; // 从命令行参数获取 SQL 文件路径

    if (!filePath) {
        console.error('Usage: node debug-sql.js <path_to_sql_file>');
        process.exit(1);
    }

    try {
        await executeSQL(filePath);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
