const mysql = require('mysql2/promise')
const { dbConfig } = require('./dbConfig.cjs')

let pool = null

// 获取连接池
function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig)
  }
  return pool
}

// 查询所有数据
async function query(sql, params = []) {
  const pool = getPool()
  const [rows] = await pool.execute(sql, params)
  return rows
}

// 获取表的所有数据
async function getTableData(tableName) {
  return query(`SELECT * FROM ${tableName}`)
}

// 获取表结构
async function getTableSchema(tableName) {
  const sql = `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_COMMENT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`
  const rows = await query(sql, [dbConfig.database, tableName])
  return rows
}

module.exports = { query, getTableData, getTableSchema, getPool }
