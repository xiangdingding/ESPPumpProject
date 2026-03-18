// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '123456',
  database: 'hws_esp_pcp_online',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
}

const DB_NAME = 'hws_esp_pcp_online'

module.exports = { dbConfig, DB_NAME }
