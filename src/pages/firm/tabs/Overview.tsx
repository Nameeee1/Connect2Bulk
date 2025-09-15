import React, { useMemo } from 'react';
import styled from 'styled-components';

type Series = {
  name: string;
  color: string;
  data: number[]; // aligned with labels length
};

type LineChartProps = {
  title: string;
  labels: string[];
  series: Series[];
  maxY?: number; // optional fixed max for consistency
};

const Overview: React.FC = () => {
  // Demo KPI values to match screenshot
  const kpis = [
    { label: 'Impressions', value: 1518, change: '+64%', changeColor: '#22c55e' },
    { label: 'Posted Loads', value: 355, change: '−78%', changeColor: '#ef4444' },
    { label: 'Truck Loads', value: 1094, change: '+52%', changeColor: '#0ea5e9' },
  ] as const;

  const labels = ['Jan','Feb','Mar','Apr','May','June','July','Aug','Sept','Oct','Nov','Dec'];

  // Roughly shaped data to resemble the screenshot
  const chart1: Series[] = [
    { name: 'Impressions', color: '#0d6efd', data: [1200,500,1100,900,1700,1200,1300,200,1900,1000,1950,1850] },
    { name: 'Posted Loads', color: '#ef4444', data: [800,450,520,880,1200,980,1100,250,400,500,480,1800] },
    { name: 'Truck Loads', color: '#f59e0b', data: [1000,900,850,950,600,500,700,1200,1300,600,950,400] },
  ];

  const chart2: Series[] = [
    { name: 'Posted Loads', color: '#ef4444', data: [300,260,280,400,600,700,650,300,800,350,600,1000] },
    { name: 'Truck Loads', color: '#0d6efd', data: [500,450,700,650,900,750,1000,200,950,700,1000,950] },
    { name: 'Users', color: '#f59e0b', data: [200,240,300,350,380,520,620,700,820,600,900,500] },
  ];

  return (
    <Container>
      <SectionHeader>View your impressions, trucks loads, posted loads over time.</SectionHeader>
      <KPIGrid>
        {kpis.map((k) => (
          <KpiCard key={k.label} aria-label={`${k.label} ${k.value} (${k.change})`}>
            <KpiLabel>{k.label}</KpiLabel>
            <KpiValueRow>
              <KpiValue>{k.value.toLocaleString()}</KpiValue>
              <KpiDelta style={{ color: k.changeColor }}>{k.change}</KpiDelta>
            </KpiValueRow>
          </KpiCard>
        ))}
      </KPIGrid>

      <ChartSection>
        <SectionHeader>See how your loads and trucks grew over time.</SectionHeader>
        <ChartCard>
          <ResponsiveLineChart title="" labels={labels} series={chart1} />
        </ChartCard>
      </ChartSection>

      <ChartSection>
        <SectionHeader>View your current users posted loads and truck loads over time.</SectionHeader>
        <ChartCard>
          <ResponsiveLineChart title="" labels={labels} series={chart2} />
        </ChartCard>
      </ChartSection>
    </Container>
  );
};

export default Overview;

// A simple responsive SVG line chart (no external libs)
const ResponsiveLineChart: React.FC<LineChartProps> = ({ title, labels, series, maxY }) => {
  const padding = { top: 18, right: 18, bottom: 30, left: 36 };
  const gridLines = 4; // horizontal

  const computed = useMemo(() => {
    const allValues = series.flatMap((s) => s.data);
    const maxVal = Math.max(maxY ?? 0, ...allValues, 1);
    const niceMax = Math.ceil(maxVal / 100) * 100;
    return { niceMax };
  }, [series, maxY]);

  return (
    <ChartWrap>
      {title ? <ChartTitle>{title}</ChartTitle> : null}
      <Svg viewBox="0 0 800 320" role="img" aria-label="line chart" preserveAspectRatio="none">
        {/* Plot area bounds */}
        <g transform={`translate(${padding.left},${padding.top})`}>
          {/** background */}
          <rect x={0} y={0} width={800 - padding.left - padding.right} height={320 - padding.top - padding.bottom} fill="#ffffff" />

          {/** gridlines */}
          {Array.from({ length: gridLines + 1 }).map((_, i) => {
            const areaH = 320 - padding.top - padding.bottom;
            const y = (i / gridLines) * areaH;
            return <line key={i} x1={0} y1={y} x2={800 - padding.left - padding.right} y2={y} stroke="rgba(107,114,128,0.2)" strokeWidth={1} />;
          })}

          {/** series paths */}
          {series.map((s, si) => (
            <g key={si}>
              <path d={makePath(s.data, labels.length, padding, computed.niceMax)} fill="none" stroke={s.color} strokeWidth={2} />
              {s.data.map((v, i) => {
                const { px, py } = pointAt(i, v, labels.length, padding, computed.niceMax);
                return <circle key={i} cx={px} cy={py} r={3} fill={s.color} />;
              })}
            </g>
          ))}

          {/** axes labels (x) */}
          {labels.map((lbl, i) => {
            const areaW = 800 - padding.left - padding.right;
            const x = (i / (labels.length - 1)) * areaW;
            const y = 320 - padding.top - padding.bottom + 16;
            return (
              <text key={lbl} x={x} y={y} textAnchor="middle" fontSize={11} fill="#6b7280">
                {lbl}
              </text>
            );
          })}

          {/** y-axis max label */}
          <text x={-8} y={-6} textAnchor="end" fontSize={11} fill="#6b7280">
            {computed.niceMax.toLocaleString()}
          </text>
        </g>
      </Svg>

      <Legend>
        {series.map((s) => (
          <LegendItem key={s.name}>
            <Swatch style={{ backgroundColor: s.color }} />
            <span>{s.name}</span>
          </LegendItem>
        ))}
      </Legend>
    </ChartWrap>
  );
};

// Helpers
function makePath(data: number[], n: number, pad: { top: number; right: number; bottom: number; left: number }, max: number) {
  const coords = data.map((v, i) => pointAt(i, v, n, pad, max));
  return coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.px} ${p.py}`).join(' ');
}

function pointAt(i: number, v: number, n: number, pad: { top: number; right: number; bottom: number; left: number }, max: number) {
  const areaW = 800 - pad.left - pad.right;
  const areaH = 320 - pad.top - pad.bottom;
  const px = (i / (n - 1)) * areaW;
  const py = areaH - (Math.max(0, v) / max) * areaH;
  return { px, py };
}

// styled-components kept below the components per project rules
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SectionHeader = styled.h4`
  margin: 0;
  padding: 6px 2px;
  font-weight: 600;
  color: #374151;
  font-size: clamp(13px, 1.8vw, 14px);
`;

const KPIGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  @media (min-width: 560px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (min-width: 900px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const KpiCard = styled.div`
  background: #ffffff;
  border: 1px solid rgba(40, 44, 69, 0.10);
  border-radius: 10px;
  padding: 14px;
`;

const KpiLabel = styled.div`
  color: #6b7280;
  font-size: 12px;
  margin-bottom: 6px;
`;

const KpiValueRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

const KpiValue = styled.div`
  font-weight: 800;
  color: #111827;
  font-size: clamp(22px, 3.6vw, 28px);
`;

const KpiDelta = styled.div`
  font-weight: 700;
  font-size: 12px;
`;

const ChartSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ChartCard = styled.div`
  background: #ffffff;
  border: 1px solid rgba(40, 44, 69, 0.10);
  border-radius: 10px;
  padding: 10px;
`;

const ChartWrap = styled.div`
  width: 100%;
`;

const ChartTitle = styled.h5`
  margin: 0 0 6px 0;
  color: #1f2937;
  font-size: 14px;
`;

const Svg = styled.svg`
  width: 100%;
  height: auto;
  display: block;
  aspect-ratio: 800 / 320;
`;

const Legend = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
`;

const LegendItem = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #374151;
  font-size: 12px;
`;

const Swatch = styled.span`
  width: 12px;
  height: 12px;
  border-radius: 3px;
  display: inline-block;
`;