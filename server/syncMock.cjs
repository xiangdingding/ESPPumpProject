const mysql = require('mysql2/promise')
const fs = require('fs')
const path = require('path')

async function syncMockData() {
  const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'hws_esp_pcp_online',
  }

  const pool = mysql.createPool(dbConfig)

  try {
    // 读取组织机构数据
    console.log('读取 bas_org 数据...')
    const [orgs] = await pool.execute('SELECT * FROM bas_org')
    console.log(`组织机构数据: ${orgs.length} 条`)

    // 读取井数据
    console.log('读取 bas_well 数据...')
    const [wells] = await pool.execute('SELECT * FROM bas_well')
    console.log(`井数据: ${wells.length} 条`)

    // 写入组织机构 mock 文件
    const orgMockPath = path.join(__dirname, '..', 'src', 'mock', 'orgData.ts')
    const orgContent = `// 组织机构数据 - 从数据库同步
// 生成时间: ${new Date().toISOString()}

export interface OrgNode {
  id: number
  org_name: string
  org_code: string
  parent_id: number | null
  org_level: number
  org_type?: string
}

export const orgList: OrgNode[] = ${JSON.stringify(orgs, null, 2)}
`
    fs.writeFileSync(orgMockPath, orgContent, 'utf-8')
    console.log(`已写入: ${orgMockPath}`)

    // 写入井 mock 文件
    const wellMockPath = path.join(__dirname, '..', 'src', 'mock', 'wellDbData.ts')
    const wellContent = `// 井基础信息数据 - 从数据库同步
// 生成时间: ${new Date().toISOString()}

export interface DbWell {
  id: string
  well_name: string
  well_code: string
  org_id: number
  org_name?: string
  oil_field?: string
  block_name?: string
  longitude?: number
  latitude?: number
  well_depth?: number
  pump_depth?: number
  pump_model?: string
  motor_power?: number
  well_status?: string
  [key: string]: any
}

export const wellDbList: DbWell[] = ${JSON.stringify(wells, null, 2)}
`
    fs.writeFileSync(wellMockPath, wellContent, 'utf-8')
    console.log(`已写入: ${wellMockPath}`)

    console.log('同步完成!')
  } catch (err) {
    console.error('同步失败:', err.message)
  } finally {
    await pool.end()
  }
}

syncMockData()
