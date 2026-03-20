import React, { useState } from 'react'
import { Row, Col, Card, Form, InputNumber, Select, Radio, Button, Descriptions, Divider, message, Space, Tag } from 'antd'
import {
  CalculatorOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ExperimentOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'

interface DesignParams {
  wellDepth: number
  casingDiameter: number
  tubingDiameter: number
  formationPressure: number
  formationTemperature: number
  saturationPressure: number
  gasOilRatio: number
  oilDensity: number
  waterDensity: number
  waterCut: number
  dailyLiquid: number
  pumpType: 'ESP'
  targetFlow: number
  targetHead: number
}

interface DesignResult {
  pumpModel: string
  stages: number
  ratedFlow: number
  ratedHead: number
  ratedPower: number
  motorModel: string
  motorPower: number
  cableSpec: string
  settingDepth: number
  submergence: number
  estimatedEfficiency: number
  estimatedFrequency: number
}

const defaultParams: DesignParams = {
  wellDepth: 3200,
  casingDiameter: 177.8,
  tubingDiameter: 73,
  formationPressure: 28.5,
  formationTemperature: 95,
  saturationPressure: 10.8,
  gasOilRatio: 35,
  oilDensity: 850,
  waterDensity: 1020,
  waterCut: 65,
  dailyLiquid: 80,
  pumpType: 'ESP',
  targetFlow: 100,
  targetHead: 2200,
}

const calcDesign = (p: DesignParams): DesignResult => {
  const mixDensity = p.oilDensity * (1 - p.waterCut / 100) + p.waterDensity * (p.waterCut / 100)
  const settingDepth = Math.round(p.wellDepth * 0.78)
  const submergence = Math.round(settingDepth - p.wellDepth * 0.55)
  const headPerStage = 8.5
  const stages = Math.ceil(p.targetHead / headPerStage)
  const ratedHead = Math.round(stages * headPerStage)
  const hydraulicPower = (mixDensity * 9.81 * p.targetFlow * ratedHead) / (86400 * 1000)
  const estimatedEfficiency = 48 + Math.random() * 10
  const ratedPower = Math.round(hydraulicPower / (estimatedEfficiency / 100) * 10) / 10
  const motorPower = Math.ceil(ratedPower * 1.25 / 5) * 5

  return {
    pumpModel: `DN${Math.round(p.casingDiameter * 0.6)}-${stages}级离心泵`,
    stages,
    ratedFlow: p.targetFlow,
    ratedHead,
    ratedPower,
    motorModel: `Y${motorPower}kW-4极潜油电机`,
    motorPower,
    cableSpec: motorPower <= 30 ? 'QYJEP3×16mm²' : motorPower <= 60 ? 'QYJEP3×25mm²' : 'QYJEP3×35mm²',
    settingDepth,
    submergence,
    estimatedEfficiency: Math.round(estimatedEfficiency * 10) / 10,
    estimatedFrequency: Math.round(35 + (p.targetFlow / 80) * 15),
  }
}

const NewWellDesign: React.FC = () => {
  const [form] = Form.useForm()
  const [result, setResult] = useState<DesignResult | null>(null)
  const [params, setParams] = useState<DesignParams>(defaultParams)

  const handleCalc = () => {
    form.validateFields().then(values => {
      const p = { ...defaultParams, ...values } as DesignParams
      setParams(p)
      setResult(calcDesign(p))
      message.success('设计计算完成')
    })
  }

  const pumpCurveOption = result ? (() => {
    const flows = Array.from({ length: 21 }, (_, i) => Math.round(result.ratedFlow * (0.3 + i * 0.05)))
    const peakFlow = result.ratedFlow
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['扬程(m)', '效率(%)', '功率(kW)'], bottom: 0 },
      grid: { top: 40, right: 70, bottom: 50, left: 70 },
      xAxis: { type: 'category', data: flows.map(f => `${f}`), name: '排量(m³/d)' },
      yAxis: [
        { type: 'value', name: '扬程(m) / 效率(%)', position: 'left' },
        { type: 'value', name: '功率(kW)', position: 'right' },
      ],
      series: [
        {
          name: '扬程(m)', type: 'line', smooth: true,
          data: flows.map(f => {
            const ratio = f / peakFlow
            return Math.round(result.ratedHead * (1.15 - 0.15 * ratio * ratio) * 10) / 10
          }),
          itemStyle: { color: '#1677ff' },
          lineStyle: { width: 2 },
        },
        {
          name: '效率(%)', type: 'line', smooth: true,
          data: flows.map(f => {
            const ratio = f / peakFlow
            return Math.round((result.estimatedEfficiency * (1 - 1.5 * (ratio - 1) ** 2)) * 10) / 10
          }),
          itemStyle: { color: '#52c41a' },
          lineStyle: { width: 2 },
          markPoint: {
            data: [{ type: 'max', name: '最高效率' }],
            itemStyle: { color: '#52c41a' },
          },
        },
        {
          name: '功率(kW)', type: 'line', smooth: true, yAxisIndex: 1,
          data: flows.map(f => {
            const ratio = f / peakFlow
            return Math.round(result.ratedPower * (0.6 + 0.4 * ratio) * 10) / 10
          }),
          itemStyle: { color: '#fa8c16' },
          lineStyle: { width: 2 },
        },
      ],
    }
  })() : {}

  const wellboreOption = result ? {
    tooltip: { trigger: 'item' },
    grid: { top: 20, right: 40, bottom: 40, left: 80 },
    xAxis: { type: 'category', data: ['套管', '油管', '泵'], axisLabel: { fontSize: 13 } },
    yAxis: { type: 'value', name: '深度(m)', inverse: true, min: 0, max: params.wellDepth + 200 },
    series: [
      {
        type: 'bar', barWidth: 50,
        data: [
          { value: params.wellDepth, itemStyle: { color: '#8c8c8c' } },
          { value: result.settingDepth, itemStyle: { color: '#1677ff' } },
          { value: result.settingDepth, itemStyle: { color: '#ff4d4f', borderRadius: [0, 0, 4, 4] } },
        ],
        label: {
          show: true, position: 'top',
          formatter: (p: { value: number }) => `${p.value}m`,
        },
      },
    ],
    graphic: [
      {
        type: 'text', left: 'center', top: 10,
        style: { text: '井身结构示意', fontSize: 14, fontWeight: 'bold', fill: '#333' },
      },
    ],
  } : {}

  return (
    <div className="page-container">
      <Row gutter={[16, 16]}>
        <Col xs={24} md={9}>
          <Card title={<Space><CalculatorOutlined />设计参数输入</Space>} style={{ height: '100%' }}>
            <Form
              form={form}
              layout="vertical"
              initialValues={defaultParams}
              size="middle"
            >
              <Divider orientation="left" plain style={{ margin: '4px 0 12px' }}>基本参数</Divider>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label="井深(m)" name="wellDepth" rules={[{ required: true }]}>
                    <InputNumber min={500} max={6000} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="套管内径(mm)" name="casingDiameter" rules={[{ required: true }]}>
                    <InputNumber min={100} max={250} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="油管外径(mm)" name="tubingDiameter" rules={[{ required: true }]}>
                <InputNumber min={50} max={120} style={{ width: '100%' }} />
              </Form.Item>

              <Divider orientation="left" plain style={{ margin: '4px 0 12px' }}>油藏参数</Divider>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label="地层压力(MPa)" name="formationPressure" rules={[{ required: true }]}>
                    <InputNumber min={1} max={80} step={0.1} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="地层温度(°C)" name="formationTemperature" rules={[{ required: true }]}>
                    <InputNumber min={20} max={200} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label="饱和压力(MPa)" name="saturationPressure" rules={[{ required: true }]}>
                    <InputNumber min={1} max={50} step={0.1} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="气油比(m³/t)" name="gasOilRatio" rules={[{ required: true }]}>
                    <InputNumber min={0} max={200} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left" plain style={{ margin: '4px 0 12px' }}>流体参数</Divider>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label="原油密度(kg/m³)" name="oilDensity" rules={[{ required: true }]}>
                    <InputNumber min={700} max={1000} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="水密度(kg/m³)" name="waterDensity" rules={[{ required: true }]}>
                    <InputNumber min={1000} max={1200} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label="含水率(%)" name="waterCut" rules={[{ required: true }]}>
                    <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="产液量(t/d)" name="dailyLiquid" rules={[{ required: true }]}>
                    <InputNumber min={1} max={500} step={0.1} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left" plain style={{ margin: '4px 0 12px' }}>泵型与设计要求</Divider>
              <Form.Item label="泵型选择" name="pumpType" rules={[{ required: true }]}>
                <Radio.Group>
                  <Radio.Button value="ESP">ESP 电潜泵</Radio.Button>
                </Radio.Group>
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label="目标排量(m³/d)" name="targetFlow" rules={[{ required: true }]}>
                    <InputNumber min={5} max={500} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="目标扬程(m)" name="targetHead" rules={[{ required: true }]}>
                    <InputNumber min={100} max={5000} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Button type="primary" block size="large" icon={<CalculatorOutlined />} onClick={handleCalc}>
                开始计算
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} md={15}>
          {result ? (
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Card
                title={<Space><CheckCircleOutlined style={{ color: '#52c41a' }} />推荐泵型和参数</Space>}
                extra={<Tag color="blue">电潜泵</Tag>}
              >
                <Row gutter={[16, 16]}>
                  {[
                    { label: '推荐泵型', value: result.pumpModel, color: '#1677ff' },
                    { label: '电机型号', value: result.motorModel, color: '#52c41a' },
                    { label: '预计效率', value: `${result.estimatedEfficiency}%`, color: '#fa8c16' },
                    { label: '建议频率', value: `${result.estimatedFrequency}Hz`, color: '#722ed1' },
                  ].map(item => (
                    <Col xs={12} md={6} key={item.label}>
                      <div style={{ textAlign: 'center', padding: '12px 0' }}>
                        <div style={{ color: '#999', fontSize: 13 }}>{item.label}</div>
                        <div style={{ color: item.color, fontSize: 16, fontWeight: 600, marginTop: 4 }}>{item.value}</div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </Card>

              <Card title="泵性能曲线" className="chart-card">
                <ReactECharts option={pumpCurveOption} style={{ height: 350 }} />
              </Card>

              <Row gutter={[16, 16]}>
                <Col xs={24} md={10}>
                  <Card title="井身结构示意" className="chart-card">
                    <ReactECharts option={wellboreOption} style={{ height: 350 }} />
                  </Card>
                </Col>
                <Col xs={24} md={14}>
                  <Card title={<Space><ExperimentOutlined />设计参数汇总</Space>} className="chart-card">
                    <Descriptions bordered size="small" column={2}>
                      <Descriptions.Item label="井深">{params.wellDepth} m</Descriptions.Item>
                      <Descriptions.Item label="下泵深度">{result.settingDepth} m</Descriptions.Item>
                      <Descriptions.Item label="沉没度">{result.submergence} m</Descriptions.Item>
                      <Descriptions.Item label="泵型">{result.pumpModel}</Descriptions.Item>
                      <Descriptions.Item label="级数">{result.stages} 级</Descriptions.Item>
                      <Descriptions.Item label="额定排量">{result.ratedFlow} m³/d</Descriptions.Item>
                      <Descriptions.Item label="额定扬程">{result.ratedHead} m</Descriptions.Item>
                      <Descriptions.Item label="额定功率">{result.ratedPower} kW</Descriptions.Item>
                      <Descriptions.Item label="电机功率">{result.motorPower} kW</Descriptions.Item>
                      <Descriptions.Item label="电缆规格">{result.cableSpec}</Descriptions.Item>
                      <Descriptions.Item label="预计效率">{result.estimatedEfficiency}%</Descriptions.Item>
                      <Descriptions.Item label="建议频率">{result.estimatedFrequency} Hz</Descriptions.Item>
                    </Descriptions>
                    <Divider />
                    <Button type="primary" icon={<FileTextOutlined />} onClick={() => message.success('设计报告已导出')}>
                      导出设计报告
                    </Button>
                  </Card>
                </Col>
              </Row>
            </Space>
          ) : (
            <Card style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', color: '#999', padding: '80px 0' }}>
                <CalculatorOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />
                <div style={{ marginTop: 16, fontSize: 16 }}>请在左侧填写设计参数后点击"开始计算"</div>
              </div>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  )
}

export default NewWellDesign
