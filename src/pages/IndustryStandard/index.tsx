import React, { useMemo } from 'react'
import { Row, Col, Card, Table, Tag, Typography, Space, Divider, Alert } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { wellList, industryStandards } from '../../mock/wellData'

const { Title, Text, Paragraph } = Typography

interface WellCompliance {
  wellId: string
  wellName: string
  scores: Record<string, { value: number; pass: boolean }>
  totalScore: number
  passRate: number
}

const getWellValue = (well: typeof wellList[0], standardName: string): number => {
  const mapping: Record<string, number> = {
    '系统效率': well.efficiency * 0.85,
    '泵效': well.efficiency,
    '沉没度': well.submergence,
    '电机温度': well.temperature,
    '振动值': well.vibration,
    '电流偏差': ((well.current - 28) / 28) * 100,
    '功率因数': 0.75 + (well.efficiency / 100) * 0.2,
    '含水率': well.waterCut,
    '气油比': well.gasOilRatio,
    '日产液量': well.dailyLiquid,
  }
  return Math.round((mapping[standardName] ?? 0) * 100) / 100
}

const IndustryStandard: React.FC = () => {
  const activeWells = wellList.filter(w => w.status !== 'offline')

  const compliance = useMemo<WellCompliance[]>(() => {
    return activeWells.map(well => {
      const scores: Record<string, { value: number; pass: boolean }> = {}
      let passCount = 0
      industryStandards.forEach(std => {
        const value = getWellValue(well, std.name)
        const pass = value >= std.min && value <= std.max
        if (pass) passCount++
        scores[std.id] = { value, pass }
      })
      const passRate = Math.round((passCount / industryStandards.length) * 1000) / 10
      const totalScore = Math.round(passRate * 0.6 + (well.efficiency / 60) * 40)
      return { wellId: well.id, wellName: well.name, scores, totalScore: Math.min(totalScore, 100), passRate }
    })
  }, [])

  const standardColumns = [
    { title: '编号', dataIndex: 'id', key: 'id', width: 70 },
    { title: '标准名称', dataIndex: 'name', key: 'name', width: 100 },
    { title: '单位', dataIndex: 'unit', key: 'unit', width: 60 },
    { title: '最小值', dataIndex: 'min', key: 'min', width: 80 },
    { title: '最大值', dataIndex: 'max', key: 'max', width: 80 },
    { title: '最优值', dataIndex: 'optimal', key: 'optimal', width: 80, render: (v: number) => <Text strong style={{ color: '#1677ff' }}>{v}</Text> },
    { title: '类别', dataIndex: 'category', key: 'category', width: 90, render: (c: string) => {
      const colorMap: Record<string, string> = { '效率指标': 'blue', '液面指标': 'cyan', '运行指标': 'orange', '电气指标': 'purple', '产出指标': 'green' }
      return <Tag color={colorMap[c] || 'default'}>{c}</Tag>
    }},
  ]

  const complianceColumns = [
    { title: '井号', dataIndex: 'wellName', key: 'wellName', width: 110, fixed: 'left' as const },
    ...industryStandards.map(std => ({
      title: std.name,
      key: std.id,
      width: 90,
      render: (_: unknown, record: WellCompliance) => {
        const item = record.scores[std.id]
        if (!item) return '-'
        return (
          <Space size={4}>
            <Text style={{ fontSize: 12 }}>{item.value}</Text>
            {item.pass
              ? <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 12 }} />
              : <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 12 }} />
            }
          </Space>
        )
      },
    })),
    {
      title: '达标率', dataIndex: 'passRate', key: 'passRate', width: 90, fixed: 'right' as const,
      sorter: (a: WellCompliance, b: WellCompliance) => a.passRate - b.passRate,
      render: (v: number) => <Tag color={v >= 80 ? 'green' : v >= 60 ? 'orange' : 'red'}>{v}%</Tag>,
    },
    {
      title: '综合评分', dataIndex: 'totalScore', key: 'totalScore', width: 90, fixed: 'right' as const,
      sorter: (a: WellCompliance, b: WellCompliance) => a.totalScore - b.totalScore,
      render: (v: number) => <Text strong style={{ color: v >= 80 ? '#52c41a' : v >= 60 ? '#faad14' : '#ff4d4f' }}>{v}</Text>,
    },
  ]

  const complianceRates = useMemo(() => {
    return industryStandards.map(std => {
      const passCount = compliance.filter(c => c.scores[std.id]?.pass).length
      return { name: std.name, rate: Math.round((passCount / compliance.length) * 1000) / 10 }
    })
  }, [compliance])

  const complianceBarOption = {
    tooltip: { trigger: 'axis' as const, formatter: '{b}: {c}%' },
    grid: { left: 80, right: 30, bottom: 40, top: 20 },
    xAxis: { type: 'category' as const, data: complianceRates.map(d => d.name), axisLabel: { rotate: 30 } },
    yAxis: { type: 'value' as const, name: '达标率(%)', max: 100 },
    series: [{
      type: 'bar',
      data: complianceRates.map(d => ({
        value: d.rate,
        itemStyle: { color: d.rate >= 80 ? '#52c41a' : d.rate >= 60 ? '#faad14' : '#ff4d4f' },
      })),
      barMaxWidth: 40,
      label: { show: true, position: 'top' as const, formatter: '{c}%', fontSize: 11 },
    }],
  }

  const radarOption = useMemo(() => {
    const indicators = industryStandards.map(std => ({ name: std.name, max: std.max * 1.2 || 100 }))
    const topWells = [...compliance].sort((a, b) => b.totalScore - a.totalScore).slice(0, 5)
    const colors = ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1']
    return {
      tooltip: {},
      legend: { data: topWells.map(w => w.wellName), bottom: 0 },
      radar: { indicator: indicators, radius: '60%' },
      series: [{
        type: 'radar',
        data: topWells.map((w, i) => ({
          name: w.wellName,
          value: industryStandards.map(std => w.scores[std.id]?.value || 0),
          lineStyle: { color: colors[i] },
          itemStyle: { color: colors[i] },
          areaStyle: { color: colors[i], opacity: 0.1 },
        })),
      }],
    }
  }, [compliance])

  const gaugeOptions = useMemo(() => {
    const avgWell = compliance.reduce((best, c) => c.totalScore > best.totalScore ? c : best, compliance[0])
    const keyStandards = industryStandards.filter(s => ['泵效', '系统效率', '沉没度', '电机温度'].includes(s.name))
    return keyStandards.map(std => {
      const val = avgWell.scores[std.id]?.value || 0
      const percent = Math.min(((val - std.min) / (std.max - std.min)) * 100, 100)
      return {
        name: std.name,
        option: {
          series: [{
            type: 'gauge',
            min: std.min,
            max: std.max,
            progress: { show: true, width: 14 },
            axisLine: { lineStyle: { width: 14 } },
            axisTick: { show: false },
            splitLine: { length: 8, lineStyle: { width: 2, color: '#999' } },
            axisLabel: { distance: 20, fontSize: 10 },
            anchor: { show: true, size: 16, itemStyle: { borderWidth: 2 } },
            title: { fontSize: 13 },
            detail: {
              valueAnimation: true,
              fontSize: 18,
              formatter: `{value}${std.unit}`,
              offsetCenter: [0, '70%'],
            },
            data: [{
              value: val,
              name: `${std.name}(${avgWell.wellName})`,
            }],
            itemStyle: {
              color: percent >= 60 ? '#52c41a' : percent >= 30 ? '#faad14' : '#ff4d4f',
            },
          }],
        },
      }
    })
  }, [compliance])

  const avgPassRate = Math.round(compliance.reduce((s, c) => s + c.passRate, 0) / compliance.length * 10) / 10
  const avgScore = Math.round(compliance.reduce((s, c) => s + c.totalScore, 0) / compliance.length * 10) / 10
  const excellentCount = compliance.filter(c => c.totalScore >= 80).length
  const poorCount = compliance.filter(c => c.totalScore < 60).length

  return (
    <div className="page-container">
      <Title level={4} style={{ marginBottom: 20 }}>行业标准评价</Title>

      <Card title={<Space><SafetyCertificateOutlined style={{ color: '#1677ff' }} />行业标准参数表</Space>}>
        <Table
          columns={standardColumns}
          dataSource={industryStandards}
          rowKey="id"
          size="small"
          pagination={false}
        />
      </Card>

      <Card title="各井达标情况评估" style={{ marginTop: 16 }}>
        <Table
          columns={complianceColumns}
          dataSource={compliance}
          rowKey="wellId"
          size="small"
          scroll={{ x: 1200 }}
          pagination={false}
        />
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card className="chart-card" title="各项标准达标率">
            <ReactECharts option={complianceBarOption} style={{ height: 340 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card className="chart-card" title="各井综合评分雷达图 (Top 5)">
            <ReactECharts option={radarOption} style={{ height: 340 }} />
          </Card>
        </Col>
      </Row>

      <Card title="标准对比 - 仪表盘" style={{ marginTop: 16 }}>
        <Row gutter={[16, 16]}>
          {gaugeOptions.map(g => (
            <Col xs={12} md={6} key={g.name}>
              <ReactECharts option={g.option} style={{ height: 240 }} />
            </Col>
          ))}
        </Row>
      </Card>

      <Card
        title={<Space><FileTextOutlined style={{ color: '#1677ff' }} />评价报告摘要</Space>}
        style={{ marginTop: 16 }}
      >
        <Row gutter={[24, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} md={6}>
            <Card size="small" style={{ textAlign: 'center', background: '#f6ffed' }}>
              <Text type="secondary">平均达标率</Text>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#52c41a' }}>{avgPassRate}%</div>
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ textAlign: 'center', background: '#e6f7ff' }}>
              <Text type="secondary">平均综合评分</Text>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1677ff' }}>{avgScore}</div>
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ textAlign: 'center', background: '#f6ffed' }}>
              <Text type="secondary">优秀井数(≥80)</Text>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#52c41a' }}>{excellentCount}</div>
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ textAlign: 'center', background: '#fff2e8' }}>
              <Text type="secondary">待改进井数(&lt;60)</Text>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#ff4d4f' }}>{poorCount}</div>
            </Card>
          </Col>
        </Row>

        <Divider />

        <Alert
          type="info"
          showIcon
          message="评价结论"
          description={
            <Paragraph style={{ margin: 0, lineHeight: 2 }}>
              本次评价共涉及 <Text strong>{activeWells.length}</Text> 口在线井，
              依据 <Text strong>{industryStandards.length}</Text> 项行业标准进行综合评估。
              整体平均达标率为 <Text strong>{avgPassRate}%</Text>，
              平均综合评分 <Text strong>{avgScore}</Text> 分。
              其中 <Text strong style={{ color: '#52c41a' }}>{excellentCount}</Text> 口井达到优秀水平，
              <Text strong style={{ color: '#ff4d4f' }}>{poorCount}</Text> 口井需要重点关注改进。
              {complianceRates.filter(r => r.rate < 60).length > 0 && (
                <>
                  达标率较低的指标包括：
                  <Text strong style={{ color: '#ff4d4f' }}>
                    {complianceRates.filter(r => r.rate < 60).map(r => `${r.name}(${r.rate}%)`).join('、')}
                  </Text>
                  ，建议针对性优化。
                </>
              )}
              建议对评分低于60分的井制定专项改进计划，优先处理泵效偏低和温度超标问题。
            </Paragraph>
          }
        />
      </Card>
    </div>
  )
}

export default IndustryStandard
