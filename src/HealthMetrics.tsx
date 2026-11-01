import { useId, useState, type PointerEvent } from "react";
import { addDays, dateObj, hm } from "./model";
import { Icon } from "./components";

interface Sample {
  label: string;
  short: string;
  values: number[];
}
interface Metric {
  id: string;
  title: string;
  icon: string;
  unit: string;
  min: number;
  max: number;
  colors: string[];
  series: string[];
  samples: Sample[];
  bars?: boolean;
}
const systolic = [128, 132, 126, 130, 124, 129, 127, 131, 125, 128];
const diastolic = [81, 84, 79, 82, 78, 80, 81, 83, 79, 82];
const pulse = [72, 75, 70, 74, 68, 71, 73, 76, 69, 72];
const mood = [4, 3, 4, 4, 5, 4, 3, 4, 5, 4];
function sampleLabels(day: string, days: number, clock: number) {
  if (days === 1) {
    const count = Math.min(4, clock + 1),
      start = Math.max(0, clock - 360);
    return Array.from({ length: count }, (_, i) => {
      const minute =
        count === 1
          ? clock
          : Math.round(start + ((clock - start) * i) / (count - 1));
      return {
        label: `Сегодня, ${hm(minute)}`,
        short: hm(minute),
        index: i + 6,
      };
    });
  }
  return Array.from({ length: days }, (_, i) => {
    const offset = i - days + 1,
      date = addDays(day, offset);
    return {
      label: dateObj(date).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
      }),
      short: dateObj(date).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
      }),
      index: (((offset + 30) % 10) + 10) % 10,
    };
  });
}
function MetricCard({ metric }: { metric: Metric }) {
  const id = useId().replace(/:/g, ""),
    [selected, setSelected] = useState(metric.samples.length - 1);
  const { samples } = metric,
    last = samples[selected],
    width = 340,
    height = 148,
    left = 30,
    right = 12,
    top = 14,
    bottom = 26,
    plotWidth = width - left - right,
    plotHeight = height - top - bottom;
  const x = (i: number) =>
    samples.length === 1
      ? left + plotWidth / 2
      : left + (i * plotWidth) / (samples.length - 1);
  const y = (value: number) =>
    top + ((metric.max - value) / (metric.max - metric.min)) * plotHeight;
  const path = (series: number) =>
    samples
      .map(
        (p, i) =>
          `${i ? "L" : "M"}${x(i).toFixed(2)},${y(p.values[series]).toFixed(2)}`,
      )
      .join(" ");
  const show = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect(),
      position = ((event.clientX - box.left) / box.width) * width;
    setSelected(
      Math.max(
        0,
        Math.min(
          samples.length - 1,
          Math.round(((position - left) / plotWidth) * (samples.length - 1)),
        ),
      ),
    );
  };
  const reading = last.values.join(metric.id === "pressure" ? " / " : "");
  const labels = [metric.max, (metric.max + metric.min) / 2, metric.min];
  const ticks = [
    ...new Set([0, Math.floor((samples.length - 1) / 2), samples.length - 1]),
  ];
  return (
    <article className={`health-metric metric-${metric.id}`}>
      <div className="health-metric-heading">
        <span className="health-metric-symbol">
          <Icon name={metric.icon} />
        </span>
        <h3>{metric.title}</h3>
        <span className="health-metric-demo">Пример</span>
      </div>
      <div className="health-metric-reading">
        <strong>{reading}</strong>
        <span>{metric.unit}</span>
      </div>
      <p className="health-metric-date">{last.label} · вымышленные данные</p>
      <div
        className="health-plot"
        role="slider"
        tabIndex={0}
        aria-label={`${metric.title}: выбрать демонстрационное измерение`}
        aria-valuemin={1}
        aria-valuemax={samples.length}
        aria-valuenow={selected + 1}
        aria-valuetext={`${last.label}: ${reading} ${metric.unit}, пример`}
        onPointerDown={show}
        onPointerMove={(event) => {
          if (event.pointerType === "mouse" || event.buttons === 1) show(event);
        }}
        onKeyDown={(event) => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
            event.preventDefault();
          if (event.key === "ArrowLeft") setSelected((i) => Math.max(0, i - 1));
          if (event.key === "ArrowRight")
            setSelected((i) => Math.min(samples.length - 1, i + 1));
          if (event.key === "Home") setSelected(0);
          if (event.key === "End") setSelected(samples.length - 1);
        }}
      >
        <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
          <defs>
            <linearGradient
              id={`metric-fill-${id}`}
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={metric.colors[0]}
                stopOpacity=".16"
              />
              <stop
                offset="100%"
                stopColor={metric.colors[0]}
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          {labels.map((value) => (
            <g key={value}>
              <line
                className="health-grid-line"
                x1={left}
                x2={width - right}
                y1={y(value)}
                y2={y(value)}
              />
              <text
                className="health-axis-label"
                x={left - 8}
                y={y(value) + 3}
                textAnchor="end"
              >
                {value}
              </text>
            </g>
          ))}
          {!metric.bars && samples.length > 1 && (
            <path
              d={`${path(0)} L${x(samples.length - 1)},${top + plotHeight} L${x(0)},${top + plotHeight} Z`}
              fill={`url(#metric-fill-${id})`}
              stroke="none"
            />
          )}
          {metric.bars
            ? samples.map((sample, i) => {
                const barWidth = Math.min(
                  26,
                  (plotWidth / samples.length) * 0.55,
                );
                return (
                  <rect
                    key={i}
                    x={x(i) - barWidth / 2}
                    y={y(sample.values[0])}
                    width={barWidth}
                    height={top + plotHeight - y(sample.values[0]) + 3}
                    rx={Math.min(5, barWidth / 2)}
                    fill={metric.colors[0]}
                    opacity={i === selected ? 1 : 0.4}
                    stroke="none"
                  />
                );
              })
            : metric.series.map((name, series) => (
                <path
                  key={name}
                  d={path(series)}
                  fill="none"
                  stroke={metric.colors[series]}
                  strokeWidth={2.3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
          <line
            x1={x(selected)}
            x2={x(selected)}
            y1={top - 2}
            y2={top + plotHeight + 4}
            stroke="#a7becd"
            strokeWidth="1"
            strokeDasharray="3 4"
          />
          {!metric.bars &&
            last.values.map((value, series) => (
              <g key={series}>
                <circle
                  cx={x(selected)}
                  cy={y(value)}
                  r="7"
                  fill={metric.colors[series]}
                  fillOpacity=".13"
                  stroke="none"
                />
                <circle
                  cx={x(selected)}
                  cy={y(value)}
                  r="3.6"
                  fill={metric.colors[series]}
                  stroke="#fff"
                  strokeWidth="1.8"
                />
              </g>
            ))}
          {ticks.map((i) => (
            <text
              key={i}
              className="health-axis-label"
              x={x(i)}
              y={height - 6}
              textAnchor={
                i === 0 ? "start" : i === samples.length - 1 ? "end" : "middle"
              }
            >
              {samples[i].short}
            </text>
          ))}
        </svg>
      </div>
      <div className="health-metric-legend">
        {metric.series.map((name, i) => (
          <span key={name}>
            <i style={{ background: metric.colors[i] }} />
            {name}
          </span>
        ))}
      </div>
    </article>
  );
}

export function HealthMetrics({
  day,
  days,
  clock,
}: {
  day: string;
  days: number;
  clock: number;
}) {
  const labels = sampleLabels(day, days, clock);
  const metrics: Metric[] = [
    {
      id: "pressure",
      title: "Артериальное давление",
      icon: "heart",
      unit: "мм рт. ст.",
      min: 60,
      max: 160,
      colors: ["#5c91ad", "#afa2c3"],
      series: ["Верхнее", "Нижнее"],
      samples: labels.map((p) => ({
        ...p,
        values: [systolic[p.index % 10], diastolic[p.index % 10]],
      })),
    },
    {
      id: "pulse",
      title: "Пульс",
      icon: "watch",
      unit: "уд/мин",
      min: 50,
      max: 100,
      colors: ["#7b9d8a"],
      series: ["Пульс"],
      samples: labels.map((p) => ({ ...p, values: [pulse[p.index % 10]] })),
    },
    {
      id: "mood",
      title: "Самочувствие",
      icon: "sun",
      unit: "из 5",
      min: 1,
      max: 5,
      colors: ["#b49a76"],
      series: ["Оценка самочувствия"],
      bars: true,
      samples: labels.map((p) => ({ ...p, values: [mood[p.index % 10]] })),
    },
  ];
  return (
    <section className="doctor-health-metrics">
      <div className="doctor-section-heading">
        <h2>Показатели здоровья</h2>
        <span className="health-demo-badge">Демо-данные</span>
      </div>
      <p className="health-demo-note">
        <Icon name="info" />
        <span>
          Графики для примера. Значения вымышлены, реальные измерения пока не
          подключены.
        </span>
      </p>
      <div className="health-metric-list">
        {metrics.map((metric) => (
          <MetricCard
            key={`${metric.id}-${days}-${day}-${clock}`}
            metric={metric}
          />
        ))}
      </div>
      <p className="health-chart-hint">
        Нажмите на график, чтобы посмотреть значение. С клавиатуры — стрелки
        влево и вправо.
      </p>
    </section>
  );
}
