const Database = require('better-sqlite3')
const path = require('path')

const DB_PATH = path.join(__dirname, 'workorder.db')
const db = new Database(DB_PATH)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ==================== 建表 ====================

db.exec(`
  CREATE TABLE IF NOT EXISTS work_orders (
    id              TEXT PRIMARY KEY,
    ticket_no       TEXT UNIQUE NOT NULL,
    well_id         TEXT NOT NULL,
    well_name       TEXT NOT NULL,
    oil_field       TEXT DEFAULT '',
    block_name      TEXT DEFAULT '',
    condition_code  TEXT DEFAULT '',
    diagnosis_type  TEXT DEFAULT '',
    problem_type    TEXT DEFAULT 'parameter_abnormal',
    problem_desc    TEXT DEFAULT '',
    severity        TEXT DEFAULT 'high' CHECK(severity IN ('urgent','high','medium','low')),
    status          TEXT DEFAULT 'discovered' CHECK(status IN ('discovered','analyzing','solution_proposed','pending_approval','executing','verifying','completed','closed','cancelled')),
    priority        TEXT DEFAULT 'high',
    assigned_team   TEXT DEFAULT '',
    discovered_by   TEXT DEFAULT '智能诊断系统',
    discovered_time TEXT NOT NULL,
    analyzer        TEXT DEFAULT '',
    analyze_time    TEXT DEFAULT '',
    solution        TEXT DEFAULT '',
    solution_steps  TEXT DEFAULT '[]',
    solution_time   TEXT DEFAULT '',
    solution_by     TEXT DEFAULT '',
    executor        TEXT DEFAULT '',
    execute_time    TEXT DEFAULT '',
    verify_result   TEXT DEFAULT '',
    verify_time     TEXT DEFAULT '',
    verify_by       TEXT DEFAULT '',
    completed_time  TEXT DEFAULT '',
    close_reason    TEXT DEFAULT '',
    close_time      TEXT DEFAULT '',
    closed_by       TEXT DEFAULT '',
    estimated_cost  REAL DEFAULT 0,
    actual_cost     REAL DEFAULT 0,
    remark          TEXT DEFAULT '',
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS work_order_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id    TEXT NOT NULL REFERENCES work_orders(id),
    phase       TEXT NOT NULL,
    action      TEXT NOT NULL,
    operator    TEXT DEFAULT '系统管理员',
    detail      TEXT DEFAULT '',
    created_at  TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_logs_order ON work_order_logs(order_id);
  CREATE INDEX IF NOT EXISTS idx_orders_well ON work_orders(well_id);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON work_orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_time ON work_orders(discovered_time);
`)

// ==================== 种子数据 ====================

function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM work_orders').get()
  if (count.cnt > 0) return

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

  const orders = [
    {
      id: 'WO-001', ticket_no: 'WO-20260316-001', well_id: '0441387008', well_name: 'Ronier-4',
      oil_field: 'Bongor盆地', block_name: 'Ronier区块', condition_code: 'C02', diagnosis_type: '气锁',
      problem_type: 'equipment_failure', problem_desc: '泵腔充满气体，固定阀/游动阀无法启闭，产量归零。电流骤降，功图呈8字形。',
      severity: 'urgent', status: 'executing', priority: 'urgent', assigned_team: '作业队',
      discovered_by: '智能诊断系统', discovered_time: '2026-03-16 08:00:00',
      analyzer: '张工', analyze_time: '2026-03-16 08:30:00',
      solution: '停机放气，安装高效分离器，加深泵挂', solution_steps: '["开套管放气降低气液比","安装旋流式气体分离器","加深泵挂增大沉没度","采用长冲程慢冲次工作制度"]',
      solution_time: '2026-03-16 09:00:00', solution_by: '张工',
      executor: '王班长', execute_time: '2026-03-16 10:00:00',
      estimated_cost: 25000, remark: '紧急处理，已派遣作业队',
    },
    {
      id: 'WO-002', ticket_no: 'WO-20260315-002', well_id: '1100672000', well_name: 'Ronier-101',
      oil_field: 'Bongor盆地', block_name: 'Ronier区块', condition_code: 'C05', diagnosis_type: '供液不足',
      problem_type: 'performance_decline', problem_desc: '动液面下降，沉没度不足，泵筒不能充满。产液量波动下降30%。',
      severity: 'high', status: 'verifying', priority: 'high', assigned_team: '采油一班',
      discovered_by: '智能诊断系统', discovered_time: '2026-03-15 14:30:00',
      analyzer: '李工', analyze_time: '2026-03-15 15:00:00',
      solution: '降频匹配供液，改间歇抽油，酸化增产', solution_steps: '["降低运行频率至30Hz","改间歇抽油制度","申请酸化增产措施","下调泵挂深度"]',
      solution_time: '2026-03-15 16:00:00', solution_by: '李工',
      executor: '赵班长', execute_time: '2026-03-15 17:00:00',
      verify_result: '参数改善明显，持续观察', verify_time: '2026-03-16 10:00:00', verify_by: '李工',
      estimated_cost: 12000, actual_cost: 10500,
    },
    {
      id: 'WO-003', ticket_no: 'WO-20260314-003', well_id: '0441387008', well_name: 'Ronier-4',
      oil_field: 'Bongor盆地', block_name: 'Ronier区块', condition_code: 'C04', diagnosis_type: '叶轮磨损',
      problem_type: 'equipment_failure', problem_desc: '叶轮间隙增大，扬程排量同步下降，泵效持续走低。振动频谱中出现叶频谐波异常。',
      severity: 'high', status: 'closed', priority: 'high', assigned_team: '维修班',
      discovered_by: '张工', discovered_time: '2026-03-10 09:00:00',
      analyzer: '张工', analyze_time: '2026-03-10 10:00:00',
      solution: '起泵检修更换叶轮，加装除砂器', solution_steps: '["起泵检修","更换磨损叶轮和导轮","加装井下除砂器","选用碳化钨耐磨泵级"]',
      solution_time: '2026-03-10 14:00:00', solution_by: '张工',
      executor: '王班长', execute_time: '2026-03-11 08:00:00',
      verify_result: '参数恢复正常，工况消除', verify_time: '2026-03-13 08:00:00', verify_by: '张工',
      completed_time: '2026-03-13 08:00:00',
      close_reason: '叶轮更换完成，泵效恢复至45%以上，振动恢复正常', close_time: '2026-03-13 10:00:00', closed_by: '张工',
      estimated_cost: 35000, actual_cost: 32000,
    },
    {
      id: 'WO-004', ticket_no: 'WO-20260312-004', well_id: '1100672000', well_name: 'Ronier-101',
      oil_field: 'Bongor盆地', block_name: 'Ronier区块', condition_code: 'C01', diagnosis_type: '气体影响',
      problem_type: 'parameter_abnormal', problem_desc: '气油比偏高，电流波动增大，泵效下降明显。功图底部出现鸭嘴形下凹。',
      severity: 'medium', status: 'closed', priority: 'medium', assigned_team: '采油二班',
      discovered_by: '智能诊断系统', discovered_time: '2026-03-08 06:00:00',
      analyzer: '李工', analyze_time: '2026-03-08 08:00:00',
      solution: '安装气体分离器，增大沉没度，降频', solution_steps: '["安装旋流式气体分离器","增大沉没度","降低运行频率至35Hz","校核套管气油比"]',
      solution_time: '2026-03-08 10:00:00', solution_by: '李工',
      executor: '赵班长', execute_time: '2026-03-08 14:00:00',
      verify_result: '参数恢复正常，工况消除', verify_time: '2026-03-10 08:00:00', verify_by: '李工',
      completed_time: '2026-03-10 08:00:00',
      close_reason: '分离器安装完成，气体影响消除，泵效恢复', close_time: '2026-03-10 10:00:00', closed_by: '李工',
      estimated_cost: 18000, actual_cost: 16500,
    },
    {
      id: 'WO-005', ticket_no: 'WO-20260316-005', well_id: '0441387008', well_name: 'Ronier-4',
      oil_field: 'Bongor盆地', block_name: 'Ronier区块', condition_code: 'C07', diagnosis_type: '泵内堵塞',
      problem_type: 'equipment_failure', problem_desc: '结蜡/结垢堵塞阀座，排量急剧下降。产液骤降>50%，电流升高。',
      severity: 'urgent', status: 'analyzing', priority: 'urgent', assigned_team: '',
      discovered_by: '智能诊断系统', discovered_time: '2026-03-16 14:00:00',
      analyzer: '张工', analyze_time: '2026-03-16 14:30:00',
      estimated_cost: 0,
    },
    {
      id: 'WO-006', ticket_no: 'WO-20260316-006', well_id: '1100672000', well_name: 'Ronier-101',
      oil_field: 'Bongor盆地', block_name: 'Ronier区块', condition_code: 'C10', diagnosis_type: '出砂',
      problem_type: 'parameter_abnormal', problem_desc: '地层出砂，含砂浓度超标，冲蚀泵叶轮。振动异常增大，电流波动。',
      severity: 'high', status: 'discovered', priority: 'high', assigned_team: '',
      discovered_by: '智能诊断系统', discovered_time: '2026-03-17 06:00:00',
      estimated_cost: 0,
    },
    {
      id: 'WO-007', ticket_no: 'WO-20260305-007', well_id: '0441387008', well_name: 'Ronier-4',
      oil_field: 'Bongor盆地', block_name: 'Ronier区块', condition_code: 'C03', diagnosis_type: '稠油及乳化',
      problem_type: 'performance_decline', problem_desc: '原油黏度高，抽汲阻力增大，电流持续偏高。产液量缓慢下降。',
      severity: 'medium', status: 'completed', priority: 'medium', assigned_team: '采油一班',
      discovered_by: '李工', discovered_time: '2026-03-01 10:00:00',
      analyzer: '李工', analyze_time: '2026-03-01 11:00:00',
      solution: '井筒加热降黏，加注破乳剂，降低冲次', solution_steps: '["井筒加热降黏","加注破乳剂/降黏剂","降低冲次减小抽汲速度"]',
      solution_time: '2026-03-01 14:00:00', solution_by: '李工',
      executor: '赵班长', execute_time: '2026-03-02 08:00:00',
      verify_result: '参数恢复正常，工况消除', verify_time: '2026-03-04 08:00:00', verify_by: '李工',
      completed_time: '2026-03-04 08:00:00',
      estimated_cost: 8000, actual_cost: 7200,
    },
  ]

  const insertOrder = db.prepare(`
    INSERT INTO work_orders (id, ticket_no, well_id, well_name, oil_field, block_name,
      condition_code, diagnosis_type, problem_type, problem_desc, severity, status, priority,
      assigned_team, discovered_by, discovered_time, analyzer, analyze_time, solution,
      solution_steps, solution_time, solution_by, executor, execute_time, verify_result,
      verify_time, verify_by, completed_time, close_reason, close_time, closed_by,
      estimated_cost, actual_cost, remark, created_at, updated_at)
    VALUES (@id, @ticket_no, @well_id, @well_name, @oil_field, @block_name,
      @condition_code, @diagnosis_type, @problem_type, @problem_desc, @severity, @status, @priority,
      @assigned_team, @discovered_by, @discovered_time, @analyzer, @analyze_time, @solution,
      @solution_steps, @solution_time, @solution_by, @executor, @execute_time, @verify_result,
      @verify_time, @verify_by, @completed_time, @close_reason, @close_time, @closed_by,
      @estimated_cost, @actual_cost, @remark, @created_at, @updated_at)
  `)

  const insertLog = db.prepare(`
    INSERT INTO work_order_logs (order_id, phase, action, operator, detail, created_at)
    VALUES (@order_id, @phase, @action, @operator, @detail, @created_at)
  `)

  const seedTx = db.transaction(() => {
    for (const o of orders) {
      insertOrder.run({
        ...o,
        analyzer: o.analyzer || '', analyze_time: o.analyze_time || '',
        solution: o.solution || '', solution_steps: o.solution_steps || '[]',
        solution_time: o.solution_time || '', solution_by: o.solution_by || '',
        executor: o.executor || '', execute_time: o.execute_time || '',
        verify_result: o.verify_result || '', verify_time: o.verify_time || '', verify_by: o.verify_by || '',
        completed_time: o.completed_time || '',
        close_reason: o.close_reason || '', close_time: o.close_time || '', closed_by: o.closed_by || '',
        estimated_cost: o.estimated_cost || 0, actual_cost: o.actual_cost || 0,
        remark: o.remark || '',
        created_at: o.discovered_time, updated_at: now,
      })

      insertLog.run({ order_id: o.id, phase: 'discovered', action: '系统自动发现异常', operator: o.discovered_by, detail: `检测到 ${o.diagnosis_type}（${o.condition_code}），严重程度：${o.severity}`, created_at: o.discovered_time })

      if (o.analyze_time) {
        insertLog.run({ order_id: o.id, phase: 'analyzing', action: '开始分析问题', operator: o.analyzer, detail: o.problem_desc, created_at: o.analyze_time })
      }
      if (o.solution_time) {
        insertLog.run({ order_id: o.id, phase: 'solution_proposed', action: '制定处理方案', operator: o.solution_by, detail: o.solution, created_at: o.solution_time })
      }
      if (o.execute_time) {
        insertLog.run({ order_id: o.id, phase: 'executing', action: '下发工单开始执行', operator: o.executor || '系统管理员', detail: `指派 ${o.assigned_team}，优先级：${o.priority}`, created_at: o.execute_time })
      }
      if (o.verify_time) {
        insertLog.run({ order_id: o.id, phase: 'verifying', action: '处理完成进入验证', operator: o.verify_by, detail: o.verify_result, created_at: o.verify_time })
      }
      if (o.completed_time) {
        insertLog.run({ order_id: o.id, phase: 'completed', action: '验证通过', operator: o.verify_by || '系统管理员', detail: o.verify_result, created_at: o.completed_time })
      }
      if (o.close_time) {
        insertLog.run({ order_id: o.id, phase: 'closed', action: '关闭工单', operator: o.closed_by, detail: o.close_reason, created_at: o.close_time })
      }
    }
  })

  seedTx()
  console.log(`[WorkOrder DB] Seeded ${orders.length} work orders`)
}

seedIfEmpty()

// ==================== 查询方法 ====================

const listOrders = db.prepare(`
  SELECT * FROM work_orders ORDER BY
    CASE status
      WHEN 'discovered' THEN 0 WHEN 'analyzing' THEN 1 WHEN 'solution_proposed' THEN 2
      WHEN 'pending_approval' THEN 3 WHEN 'executing' THEN 4 WHEN 'verifying' THEN 5
      WHEN 'completed' THEN 6 WHEN 'closed' THEN 7 WHEN 'cancelled' THEN 8
    END,
    CASE severity WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
    discovered_time DESC
`)

const getOrder = db.prepare('SELECT * FROM work_orders WHERE id = ?')
const getOrderByWell = db.prepare("SELECT * FROM work_orders WHERE well_id = ? AND status NOT IN ('closed','cancelled') ORDER BY created_at DESC LIMIT 1")
const getLogs = db.prepare('SELECT * FROM work_order_logs WHERE order_id = ? ORDER BY created_at ASC')
const getStats = db.prepare(`
  SELECT status, COUNT(*) as count FROM work_orders GROUP BY status
`)

function nextTicketNo() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const row = db.prepare(`SELECT COUNT(*) as cnt FROM work_orders WHERE ticket_no LIKE ?`).get(`WO-${today}%`)
  const seq = String((row.cnt || 0) + 1).padStart(3, '0')
  return `WO-${today}-${seq}`
}

// ==================== 写入方法 ====================

const _insertOrder = db.prepare(`
  INSERT INTO work_orders (id, ticket_no, well_id, well_name, oil_field, block_name,
    condition_code, diagnosis_type, problem_type, problem_desc, severity, status, priority,
    assigned_team, discovered_by, discovered_time, created_at, updated_at)
  VALUES (@id, @ticket_no, @well_id, @well_name, @oil_field, @block_name,
    @condition_code, @diagnosis_type, @problem_type, @problem_desc, @severity, 'discovered', @priority,
    '', @discovered_by, @discovered_time, @created_at, @updated_at)
`)

const _insertLog = db.prepare(`
  INSERT INTO work_order_logs (order_id, phase, action, operator, detail, created_at)
  VALUES (@order_id, @phase, @action, @operator, @detail, @created_at)
`)

const _updateOrder = db.prepare(`
  UPDATE work_orders SET
    status = COALESCE(@status, status),
    analyzer = CASE WHEN @analyzer != '' THEN @analyzer ELSE analyzer END,
    analyze_time = CASE WHEN @analyze_time != '' THEN @analyze_time ELSE analyze_time END,
    solution = CASE WHEN @solution != '' THEN @solution ELSE solution END,
    solution_steps = CASE WHEN @solution_steps != '' THEN @solution_steps ELSE solution_steps END,
    solution_time = CASE WHEN @solution_time != '' THEN @solution_time ELSE solution_time END,
    solution_by = CASE WHEN @solution_by != '' THEN @solution_by ELSE solution_by END,
    assigned_team = CASE WHEN @assigned_team != '' THEN @assigned_team ELSE assigned_team END,
    priority = CASE WHEN @priority != '' THEN @priority ELSE priority END,
    executor = CASE WHEN @executor != '' THEN @executor ELSE executor END,
    execute_time = CASE WHEN @execute_time != '' THEN @execute_time ELSE execute_time END,
    verify_result = CASE WHEN @verify_result != '' THEN @verify_result ELSE verify_result END,
    verify_time = CASE WHEN @verify_time != '' THEN @verify_time ELSE verify_time END,
    verify_by = CASE WHEN @verify_by != '' THEN @verify_by ELSE verify_by END,
    completed_time = CASE WHEN @completed_time != '' THEN @completed_time ELSE completed_time END,
    close_reason = CASE WHEN @close_reason != '' THEN @close_reason ELSE close_reason END,
    close_time = CASE WHEN @close_time != '' THEN @close_time ELSE close_time END,
    closed_by = CASE WHEN @closed_by != '' THEN @closed_by ELSE closed_by END,
    estimated_cost = CASE WHEN @estimated_cost > 0 THEN @estimated_cost ELSE estimated_cost END,
    actual_cost = CASE WHEN @actual_cost > 0 THEN @actual_cost ELSE actual_cost END,
    remark = CASE WHEN @remark != '' THEN @remark ELSE remark END,
    updated_at = @updated_at
  WHERE id = @id
`)

function createOrder(data) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  const id = `WO-${Date.now().toString(36).toUpperCase()}`
  const ticket_no = nextTicketNo()
  const params = {
    id, ticket_no,
    well_id: data.well_id, well_name: data.well_name,
    oil_field: data.oil_field || '', block_name: data.block_name || '',
    condition_code: data.condition_code || '', diagnosis_type: data.diagnosis_type || '',
    problem_type: data.problem_type || 'parameter_abnormal',
    problem_desc: data.problem_desc || '',
    severity: data.severity || 'high', priority: data.priority || 'high',
    discovered_by: data.discovered_by || '智能诊断系统',
    discovered_time: data.discovered_time || now,
    created_at: now, updated_at: now,
  }
  _insertOrder.run(params)
  _insertLog.run({ order_id: id, phase: 'discovered', action: '系统自动发现异常', operator: params.discovered_by, detail: `检测到 ${params.diagnosis_type}（${params.condition_code}），严重程度：${params.severity}`, created_at: now })
  return { id, ticket_no }
}

function advanceOrder(id, data) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  const updateParams = {
    id,
    status: data.status || '',
    analyzer: data.analyzer || '', analyze_time: data.analyze_time || '',
    solution: data.solution || '', solution_steps: data.solution_steps || '',
    solution_time: data.solution_time || '', solution_by: data.solution_by || '',
    assigned_team: data.assigned_team || '', priority: data.priority || '',
    executor: data.executor || '', execute_time: data.execute_time || '',
    verify_result: data.verify_result || '', verify_time: data.verify_time || '', verify_by: data.verify_by || '',
    completed_time: data.completed_time || '',
    close_reason: data.close_reason || '', close_time: data.close_time || '', closed_by: data.closed_by || '',
    estimated_cost: data.estimated_cost || 0, actual_cost: data.actual_cost || 0,
    remark: data.remark || '',
    updated_at: now,
  }
  _updateOrder.run(updateParams)

  if (data.log_action) {
    _insertLog.run({
      order_id: id, phase: data.status || 'unknown',
      action: data.log_action, operator: data.log_operator || '系统管理员',
      detail: data.log_detail || '', created_at: now,
    })
  }
  return getOrder.get(id)
}

function addOperationLog(orderId, phase, action, operator, detail) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  _insertLog.run({ order_id: orderId, phase, action, operator: operator || '系统管理员', detail: detail || '', created_at: now })
}

module.exports = {
  listOrders: () => listOrders.all(),
  getOrder: (id) => getOrder.get(id),
  getOrderByWell: (wellId) => getOrderByWell.get(wellId),
  getLogs: (orderId) => getLogs.all(orderId),
  getStats: () => getStats.all(),
  createOrder,
  advanceOrder,
  addOperationLog,
  searchOrders: (params) => {
    let sql = 'SELECT * FROM work_orders WHERE 1=1'
    const args = []
    if (params.status && params.status !== 'all') { sql += ' AND status = ?'; args.push(params.status) }
    if (params.severity && params.severity !== 'all') { sql += ' AND severity = ?'; args.push(params.severity) }
    if (params.well_name) { sql += ' AND well_name LIKE ?'; args.push(`%${params.well_name}%`) }
    if (params.keyword) { sql += ' AND (well_name LIKE ? OR ticket_no LIKE ? OR problem_desc LIKE ? OR diagnosis_type LIKE ?)'; args.push(`%${params.keyword}%`, `%${params.keyword}%`, `%${params.keyword}%`, `%${params.keyword}%`) }
    if (params.start_date) { sql += ' AND discovered_time >= ?'; args.push(params.start_date) }
    if (params.end_date) { sql += ' AND discovered_time <= ?'; args.push(params.end_date) }
    sql += ' ORDER BY discovered_time DESC'
    if (params.limit) { sql += ' LIMIT ?'; args.push(params.limit) }
    if (params.offset) { sql += ' OFFSET ?'; args.push(params.offset) }
    return db.prepare(sql).all(...args)
  },
}
