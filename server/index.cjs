const express = require('express')
const cors = require('cors')
let dbModule
try { dbModule = require('./db.cjs') } catch (e) { dbModule = null }
const { query, getTableData, getTableSchema } = dbModule || { query: async () => [], getTableData: async () => [], getTableSchema: async () => [] }
const wo = require('./workOrderDb.cjs')

const app = express()
app.use(cors())
app.use(express.json())

// 测试连接
app.get('/api/test', async (req, res) => {
  try {
    const result = await query('SELECT 1 as test')
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 获取所有表
app.get('/api/tables', async (req, res) => {
  try {
    const sql = `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`
    const tables = await query(sql, [require('./dbConfig.cjs').dbConfig.database])
    res.json({ success: true, data: tables.map(t => t.TABLE_NAME) })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 获取组织机构
app.get('/api/bas_org', async (req, res) => {
  try {
    const data = await getTableData('bas_org')
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 获取组织机构树形结构
app.get('/api/bas_org/tree', async (req, res) => {
  try {
    const data = await getTableData('bas_org')
    // 构建树形结构
    const orgMap = new Map()
    const rootNodes = []

    // 首先建立所有节点的映射
    data.forEach((org) => {
      orgMap.set(org.id, { ...org, children: [] })
    })

    // 然后构建树
    data.forEach((org) => {
      const node = orgMap.get(org.id)
      if (org.parent_id && orgMap.has(org.parent_id)) {
        orgMap.get(org.parent_id).children.push(node)
      } else {
        rootNodes.push(node)
      }
    })

    res.json({ success: true, data: rootNodes })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 获取组织机构表结构
app.get('/api/bas_org/schema', async (req, res) => {
  try {
    const schema = await getTableSchema('bas_org')
    res.json({ success: true, data: schema })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 获取井基础信息表结构
app.get('/api/bas_well/schema', async (req, res) => {
  try {
    const schema = await getTableSchema('bas_well')
    res.json({ success: true, data: schema })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 获取井基础信息
app.get('/api/bas_well', async (req, res) => {
  try {
    const data = await getTableData('bas_well')
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 获取单井日生产报表
app.get('/api/rpt_well_prod_daily', async (req, res) => {
  try {
    const data = await getTableData('rpt_well_prod_daily')
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 获取电泵井多参规则权重
app.get('/api/syn_weight', async (req, res) => {
  try {
    const data = await getTableData('syn_weight')
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 获取多参系数界限表
app.get('/api/syn_limit', async (req, res) => {
  try {
    const data = await getTableData('syn_limit')
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 获取多参规则图版
app.get('/api/syn_fault_type_chart', async (req, res) => {
  try {
    const data = await getTableData('syn_fault_type_chart')
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 获取表结构
app.get('/api/schema/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params
    const schema = await getTableSchema(tableName)
    res.json({ success: true, data: schema })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ==================== 工单 API (SQLite) ====================

app.get('/api/workorders', (req, res) => {
  try {
    const data = wo.searchOrders(req.query)
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.get('/api/workorders/stats', (req, res) => {
  try {
    const rows = wo.getStats()
    const stats = {}
    rows.forEach(r => { stats[r.status] = r.count })
    res.json({ success: true, data: stats })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.get('/api/workorders/:id', (req, res) => {
  try {
    const order = wo.getOrder(req.params.id)
    if (!order) return res.status(404).json({ success: false, error: '工单不存在' })
    const logs = wo.getLogs(req.params.id)
    res.json({ success: true, data: { ...order, solution_steps: JSON.parse(order.solution_steps || '[]'), logs } })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.get('/api/workorders/well/:wellId', (req, res) => {
  try {
    const order = wo.getOrderByWell(req.params.wellId)
    if (!order) return res.json({ success: true, data: null })
    const logs = wo.getLogs(order.id)
    res.json({ success: true, data: { ...order, solution_steps: JSON.parse(order.solution_steps || '[]'), logs } })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.post('/api/workorders', (req, res) => {
  try {
    const result = wo.createOrder(req.body)
    const order = wo.getOrder(result.id)
    const logs = wo.getLogs(result.id)
    res.json({ success: true, data: { ...order, solution_steps: JSON.parse(order.solution_steps || '[]'), logs } })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.put('/api/workorders/:id', (req, res) => {
  try {
    const order = wo.advanceOrder(req.params.id, req.body)
    if (!order) return res.status(404).json({ success: false, error: '工单不存在' })
    const logs = wo.getLogs(req.params.id)
    res.json({ success: true, data: { ...order, solution_steps: JSON.parse(order.solution_steps || '[]'), logs } })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.post('/api/workorders/:id/log', (req, res) => {
  try {
    const { phase, action, operator, detail } = req.body
    wo.addOperationLog(req.params.id, phase, action, operator, detail)
    const logs = wo.getLogs(req.params.id)
    res.json({ success: true, data: logs })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

const PORT = 3002
app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`)
  console.log(`[WorkOrder] SQLite database ready`)
})
