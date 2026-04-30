import pg from 'pg';
import dotenv from 'dotenv';
import { AsyncLocalStorage } from 'async_hooks';
import { Message } from '../utils/Messages.js';

dotenv.config();

const { Pool } = pg;

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER_NAME,
    password: process.env.DB_USER_PASSWORD,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
};

const pool = new Pool(dbConfig);
const transactionStorage = new AsyncLocalStorage();

const normalizeSql = (sql) => {
    return sql
        .replace(/`([^`]+)`/g, '"$1"')
        .replace(/\bTHEN\s+"([^"]*)"/g, "THEN '$1'")
        .replace(/\bELSE\s+"([^"]*)"/g, "ELSE '$1'");
};

const convertPlaceholders = (sql, args = []) => {
    let parameterIndex = 1;
    let argIndex = 0;
    let formattedSql = "";
    const formattedArgs = [];
    let inSingleQuote = false;
    let inDoubleQuote = false;

    for (let i = 0; i < sql.length; i += 1) {
        const char = sql[i];
        const prevChar = sql[i - 1];

        if (char === "'" && prevChar !== "\\" && !inDoubleQuote) {
            inSingleQuote = !inSingleQuote;
            formattedSql += char;
            continue;
        }

        if (char === '"' && prevChar !== "\\" && !inSingleQuote) {
            inDoubleQuote = !inDoubleQuote;
            formattedSql += char;
            continue;
        }

        if (char === '?' && !inSingleQuote && !inDoubleQuote) {
            const value = args[argIndex++];

            if (Array.isArray(value)) {
                if (value.length === 0) {
                    formattedSql += "NULL";
                } else {
                    const placeholders = value.map(() => `$${parameterIndex++}`);
                    formattedSql += placeholders.join(", ");
                    formattedArgs.push(...value);
                }
            } else {
                formattedSql += `$${parameterIndex++}`;
                formattedArgs.push(value);
            }
            continue;
        }

        formattedSql += char;
    }

    return {
        text: normalizeSql(formattedSql),
        values: formattedArgs
    };
};

const extractInsertId = (row = {}) => {
    if (row.id !== undefined) return row.id;

    const idKey = Object.keys(row).find((key) => key.endsWith('_id'));
    return idKey ? row[idKey] : null;
};

const formatResult = (result) => {
    const command = result.command?.toUpperCase();

    if (command === 'SELECT') {
        return result.rows;
    }

    const baseResult = {
        affectedRows: result.rowCount || 0,
        changedRows: result.rowCount || 0,
        rows: result.rows || []
    };

    if (command === 'INSERT') {
        return {
            ...baseResult,
            insertId: extractInsertId(result.rows?.[0]),
        };
    }

    return baseResult;
};

async function verifyConnection() {
    try {
        const client = await pool.connect();
        client.release();
        console.log(Message.dbConnectionSuccess);
    } catch (err) {
        console.log(Message.dbConnectionError, err);
    }
}

verifyConnection();

pool.on('error', (err) => {
    console.log(Message.dbError, err);
});

function getExecutor() {
    return transactionStorage.getStore() || pool;
}

function withReturningForInsert(sql) {
    if (!/^\s*insert\s+/i.test(sql) || /\breturning\b/i.test(sql)) {
        return sql;
    }

    return `${sql.trim()} RETURNING *`;
}

function makeDb() {
    return {
        async query(sql, args = []) {
            const executor = getExecutor();
            const prepared = convertPlaceholders(withReturningForInsert(sql), args);
            const result = await executor.query(prepared);
            return formatResult(result);
        },
        async beginTransaction() {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                transactionStorage.enterWith(client);
            } catch (error) {
                client.release();
                throw error;
            }
        },
        async commit() {
            const client = transactionStorage.getStore();
            if (!client) return;

            try {
                await client.query('COMMIT');
            } finally {
                client.release();
                transactionStorage.enterWith(null);
            }
        },
        async rollback() {
            const client = transactionStorage.getStore();
            if (!client) return;

            try {
                await client.query('ROLLBACK');
            } finally {
                client.release();
                transactionStorage.enterWith(null);
            }
        },
        async close() {
            console.log(Message.dbConnectionClosing);
            return pool.end();
        }
    };
}

const db = makeDb();

export default db;
