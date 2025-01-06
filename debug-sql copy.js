const fs = require('fs');
const readline = require('readline');
const mysql = require('mysql2/promise');
const Table = require('cli-table3'); // 用于美化输出的表格

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
            console.log(`\nExecuting statement ${index + 1}:`);

            // 模拟调试断点，等待用户按下 Enter 键
            await pauseForDebug();

            // 记录开始时间
            const startTime = Date.now();

            try {
                const [results] = await connection.query(query);

                // 记录结束时间
                const endTime = Date.now();
                const executionTime = endTime - startTime;

                // 格式化查询结果
                formatQueryResult(results, index + 1);

                // 打印执行时间
                console.log(`Execution time for statement ${index + 1}: ${executionTime} ms`);
            } catch (err) {
                console.error(`Error executing statement ${index + 1}:`, err.message);
            }
        }
    } finally {
        await connection.end();
        console.log('\nConnection closed.');
    }
}

// 暂停等待用户输入继续（模拟断点）
async function pauseForDebug() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        rl.question('Press ENTER to continue to the next statement...', () => {
            rl.close();
            resolve();
        });
    });
}

// 格式化查询结果为表格
function formatQueryResult(results, queryNumber) {
    if (!results || results.length === 0) {
        console.log(`No results for query ${queryNumber}`);
        return;
    }

    // 使用 cli-table3 库输出结果为表格
    const keys = Object.keys(results[0]); // 获取列名
    const table = new Table({
        head: keys,
        colWidths: Array(keys.length).fill(20), // 设置列宽
    });

    results.forEach(row => {
        const rowData = keys.map(key => row[key]);
        table.push(rowData);
    });

    console.log(`Query ${queryNumber} results:`);
    console.log(table.toString()); // 打印表格
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
