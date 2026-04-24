import mysql from 'mysql2';
import dotenv from 'dotenv';
import util from 'util';
import { Message } from '../utils/Messages.js';

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER_NAME,
    password: process.env.DB_USER_PASSWORD,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
};

let connection;

function handleDisconnect() {
    connection = mysql.createConnection(dbConfig);
    connection.connect((err) => {
        if (err) {
            console.log(Message.dbConnectionError, err);
            setTimeout(handleDisconnect, 2000);
        } else {
            console.log(Message.dbConnectionSuccess);
        };
    });

    connection.on('error', (err) => {
        console.log(Message.dbError, err);
        if (err.code === Message.protocolConnectionLost) {
            handleDisconnect();
        } else {
            throw err;
        };
    });
};

handleDisconnect();

function makeDb() {
    return {
        async query(sql, args) {
            return util.promisify(connection.query).call(connection, sql, args);
        },
        async beginTransaction() {
            return util.promisify(connection.beginTransaction).call(connection);
        },
        async commit() {
            return util.promisify(connection.commit).call(connection);
        },
        async rollback() {
            return util.promisify(connection.rollback).call(connection);
        },
        async close() {
            console.log(Message.dbConnectionClosing);
            return util.promisify(connection.end).call(connection);
        }
    };
}

const db = makeDb();

export default db;