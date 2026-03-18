import React, { useState, useMemo } from 'react'
import { Row, Col, Card, Table, Tag, Statistic, Select, Button, Progress, Space, Divider, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  TrophyOutlined,
  SafetyCertificateOutlined,
  DollarOutlined,
  ExperimentOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { wellList, industryStandards } from '../../mock/wellData'

interface WellEvaluation {
  id: string
  name: string
  oilField: string
  efficiencyScore: number
  safetyScore: number
  economyScore: number
  envScore: number
  totalScore: number
  grade: 'A' | 'B' | 'C' | 'D'
  issues: string[]
}

const calcScore = (value: number, min: number, max: number, optimal: number): number => {
  if (value === 0) return 0
  const dist = Math.abs(value - optimal)
  const range = Math.max(Math.abs(max - optimal), Math.abs(min - optimal))
  return Math.max(0, Math.min(100, Math.round(100 - (dist / range) * 60)))
}

const getGrade = (score: number): 'A' | 'B' | 'C' | 'D' => {
  if (score >= 85) return 'A'
  if (score >= 70) return 'B'
  if (score >= 55) return 'C'
  return 'D'
}

const gradeColors: Record<string, string> = { A: '#52c41a', B: '#1677ff', C: '#faad14', D: '#ff4d4f' }

const EvaluationResult: React.FC = () => {
  const [selectedWellId, setSelectedWellId] = useState<string>(wellList[0].id)

  const evaluations = useMemo<WellEvaluation[]>(() => {
    const effStd = industryStandards.find(s => s.name === '系统效率')!
    const tempStd = industryStandards.find(s => s.name === '电机温度')!
    const vibStd = industryStandards.find(s => s.name === '振动值')!
    const subStd = industryStandards.find(s => s.name === '沉没度')!
    const prodStd = industryStandards.find(s => s.name === '日产液量')!

    return wellList.filter(w => w.status !== 'offline').map(w => {
      const efficiencyScore = calcScore(w.efficiency, effStd.min, effStd.max, effStd.optimal)
      const safetyTemp = calcScore(w.temperature, tempStd.min, tempStd.max, tempStd.optimal)
      const safetyVib = calcScore(w.vibration, vibStd.min, vibStd.max, vibStd.optimal)
      const safetyScore = Math.round((safetyTemp + safetyVib) / 2)
      const economyProd = calcScore(w.dailyLiquid, prodStd.min, prodStd.max, prodStd.optimal)
      const powerPerTon = w.dailyLiquid > 0 ? w.power / w.dailyLiquid : 999
      const economyPower = Math.max(0, Math.min(100, Math.round(100 - powerPerTon * 80)))
      const economyScore = Math.round((economyProd + economyPower) / 2)
      const envSub = calcScore(w.submergence, subStd.min, subStd.max, subStd.optimal)
      const envScore = Math.round(envSub * 0.6 + Math.min(100, w.runDays / 10) * 0.4)
      const totalScore = Math.round(efficiencyScore * 0.35 + safetyScore * 0.25 + economyScore * 0.25 + envScore * 0.15)

      const issues: string[] = []
      if (efficiencyScore < 50) issues.push('系统效率偏低')
      if (safetyScore < 50) issues.push('安全指标异常')
      if (economyScore < 50) issues.push('经济效益不佳')
      if (envScore < 50) issues.push('环保指标待改善')

      return { id: w.id, name: w.name, oilField: w.oilField, efficiencyScore, safetyScore, economyScore, envScore, totalScore, grade: getGrade(totalScore), issues }
    })
  }, [])

  const avgScore = useMemo(() => Math.round(evaluations.reduce((s, e) => s + e.totalScore, 0) / evaluations.length), [evaluations])
  const avgDimensions = useMemo(() => ({
    efficiency: Math.round(evaluations.reduce((s, e) => s + e.efficiencyScore, 0) / evaluations.length),
    safety: Math.round(evaluations.reduce((s, e) => s + e.safetyScore, 0) / evaluations.length),
    economy: Math.round(evaluations.reduce((s, e) => s + e.economyScore, 0) / evaluations.length),
    env: Math.round(evaluations.reduce((s, e) => s + e.envScore, 0) / evaluations.length),
  }), [evaluations])

  const selectedEval = evaluations.find(e => e.id === selectedWellId) || evaluations[0]
  const problemWells = evaluations.filter(e => e.totalScore < 60)

  const columns: ColumnsType<WellEvaluation> = [
    { title: '井号', dataIndex: 'name', width: 120, fixed: 'left' },
    { title: '油田', dataIndex: 'oilField', width: 100 },
    {
      title: '综合评分', dataIndex: 'totalScore', width: 100, sorter: (a, b) => a.totalScore - b.totalScore,
      render: (v: number) => <span style={{ fontWeight: 600, color: v >= 70 ? '#52c41a' : v >= 55 ? '#faad14' : '#ff4d4f' }}>{v}</span>,
    },
    { title: '效率', dataIndex: 'efficiencyScore', width: 80, render: (v: number) => <Progress percent={v} size="small" strokeColor={v >= 60 ? '#52c41a' : '#faad14'} /> },
    { title: '安全', dataIndex: 'safetyScore', width: 80, render: (v: number) => <Progress percent={v} size="small" strokeColor={v >= 60 ? '#52c41a' : '#faad14'} /> },
    { title: '经济', dataIndex: 'economyScore', width: 80, render: (v: number) => <Progress percent={v} size="small" strokeColor={v >= 60 ? '#52c41a' : '#faad14'} /> },
    { title: '环保', dataIndex: 'envScore', width: 80, render: (v: number) => <Progress percent={v} size="small" strokeColor={v >= 60 ? '#52c41a' : '#faad14'} /> },
    {
      title: '评级', dataIndex: 'grade', width: 70, align: 'center',
      render: (g: string) => <Tag color={gradeColors[g]} style={{ fontWeight: 700, fontSize: 14, minWidth: 32, textAlign: 'center' }}>{g}</Tag>,
    },
    {
      title: '问题', dataIndex: 'issues', ellipsis: true,
      render: (issues: string[]) => issues.length ? issues.map(i => <Tag key={i} color="warning" style={{ marginBottom: 2 }}>{i}</Tag>) : <Tag color="success">无</Tag>,
    },
  ]

  const radarOption = {
    tooltip: {},
    radar: {
      indicator: [
        { name: '效率', max: 100 },
        { name: '安全', max: 100 },
        { name: '经济', max: 100 },
        { name: '环保', max: 100 },
      ],
      shape: 'circle',
      splitArea: { areaStyle: { color: ['rgba(22,119,255,0.05)', 'rgba(22,119,255,0.1)', 'rgba(22,119,255,0.05)', 'rgba(22,119,255,0.1)'] } },
    },
    series: [{
      type: 'radar',
      data: [
        {
          value: [selectedEval.efficiencyScore, selectedEval.safetyScore, selectedEval.economyScore, selectedEval.envScore],
          name: selectedEval.name,
          areaStyle: { color: 'rgba(22,119,255,0.25)' },
          lineStyle: { color: '#1677ff', width: 2 },
          itemStyle: { color: '#1677ff' },
        },
        {
          value: [avgDimensions.efficiency, avgDimensions.safety, avgDimensions.economy, avgDimensions.env],
          name: '全场平均',
          areaStyle: { color: 'rgba(82,196,26,0.15)' },
          lineStyle: { color: '#52c41a', width: 2, type: 'dashed' },
          itemStyle: { color: '#52c41a' },
        },
      ],
    }],
    legend: { data: [selectedEval.name, '全场平均'], bottom: 0 },
  }

  const trendOption = useMemo(() => {
    const days = Array.from({ length: 12 }, (_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - 11 + i)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    })
    const baseScores = evaluations.slice(0, 5)
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: baseScores.map(e => e.name), bottom: 0 },
      grid: { top: 30, right: 20, bottom: 50, left: 50 },
      xAxis: { type: 'category', data: days, axisLabel: { rotate: 30 } },
      yAxis: { type: 'value', name: '评分', min: 20, max: 100 },
      series: baseScores.map(e => ({
        name: e.name,
        type: 'line',
        smooth: true,
        data: days.map((_, i) => Math.max(20, Math.min(100, Math.round(e.totalScore + (Math.random() - 0.5) * 15 + (i - 6) * 0.8)))),
      })),
    }
  }, [evaluations])

  const dimIcons = [
    { key: 'efficiency', label: '效率得分', icon: <ThunderboltOutlined />, color: '#1677ff' },
    { key: 'safety', label: '安全得分', icon: <SafetyCertificateOutlined />, color: '#52c41a' },
    { key: 'economy', label: '经济得分', icon: <DollarOutlined />, color: '#faad14' },
    { key: 'env', label: '环保得分', icon: <ExperimentOutlined />, color: '#722ed1' },
  ]

  const problemColumns: ColumnsType<WellEvaluation> = [
    { title: '井号', dataIndex: 'name', width: 120 },
    { title: '综合评分', dataIndex: 'totalScore', width: 90, render: (v: number) => <span style={{ color: '#ff4d4f', fontWeight: 600 }}>{v}</span> },
    { title: '评级', dataIndex: 'grade', width: 60, render: (g: string) => <Tag color={gradeColors[g]}>{g}</Tag> },
    {
      title: '问题描述', dataIndex: 'issues',
      render: (issues: string[]) => issues.join('；'),
    },
    {
      title: '改进建议', key: 'suggestion',
      render: (_, r) => {
        const suggestions: string[] = []
        if (r.efficiencyScore < 50) suggestions.push('优化运行频率提升泵效')
        if (r.safetyScore < 50) suggestions.push('检查设备状态，降低温度/振动')
        if (r.economyScore < 50) suggestions.push('调整工况参数降低能耗')
        if (r.envScore < 50) suggestions.push('改善沉没度，延长维护周期')
        return suggestions.join('；')
      },
    },
  ]

  return (
    <div className="page-container">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8} md={6}>
          <Card style={{ textAlign: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, marginBottom: 8 }}>
              <TrophyOutlined style={{ marginRight: 6 }} />综合评价得分
            </div>
            <div style={{ fontSize: 56, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{avgScore}</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 }}>
              评级：<span style={{ color: '#fff', fontWeight: 600, fontSize: 18 }}>{getGrade(avgScore)}</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={16} md={18}>
          <Row gutter={[16, 16]}>
            {dimIcons.map(d => (
              <Col xs={12} sm={12} md={6} key={d.key}>
                <Card className="stat-card" hoverable>
                  <Statistic
                    title={d.label}
                    value={avgDimensions[d.key as keyof typeof avgDimensions]}
                    suffix="分"
                    prefix={d.icon}
                    valueStyle={{ color: d.color, fontWeight: 600 }}
                  />
                  <Progress
                    percent={avgDimensions[d.key as keyof typeof avgDimensions]}
                    strokeColor={d.color}
                    showInfo={false}
                    size="small"
                    style={{ marginTop: 8 }}
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </Col>
      </Row>

      <Card title="评价结果总览" className="chart-card" style={{ marginTop: 16 }}>
        <Table<WellEvaluation>
          columns={columns}
          dataSource={evaluations}
          rowKey="id"
          size="middle"
          pagination={false}
          scroll={{ x: 900 }}
          onRow={(record) => ({
            onClick: () => setSelectedWellId(record.id),
            style: { cursor: 'pointer', background: record.id === selectedWellId ? '#e6f4ff' : undefined },
          })}
        />
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={10}>
          <Card
            title="评价维度雷达图"
            className="chart-card"
            extra={
              <Select
                value={selectedWellId}
                onChange={setSelectedWellId}
                style={{ width: 160 }}
                options={evaluations.map(e => ({ label: e.name, value: e.id }))}
              />
            }
          >
            <ReactECharts option={radarOption} style={{ height: 360 }} />
          </Card>
        </Col>
        <Col xs={24} md={14}>
          <Card title="评价趋势图" className="chart-card">
            <ReactECharts option={trendOption} style={{ height: 360 }} />
          </Card>
        </Col>
      </Row>

      <Card
        title={<Space><WarningOutlined style={{ color: '#ff4d4f' }} />问题井清单（评分 &lt; 60）</Space>}
        className="chart-card"
        style={{ marginTop: 16 }}
      >
        {problemWells.length > 0 ? (
          <Table<WellEvaluation>
            columns={problemColumns}
            dataSource={problemWells}
            rowKey="id"
            size="middle"
            pagination={false}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无评分低于60的问题井</div>
        )}
      </Card>

      <Divider />
      <div style={{ textAlign: 'center' }}>
        <Button
          type="primary"
          size="large"
          icon={<FileTextOutlined />}
          onClick={() => message.success('评价报告已生成，正在下载...')}
        >
          生成评价报告
        </Button>
      </div>
    </div>
  )
}

export default EvaluationResult
