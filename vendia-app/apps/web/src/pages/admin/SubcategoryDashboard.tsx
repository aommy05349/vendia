import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@vendia/shared';
import { useTranslation } from 'react-i18next';

type Mode = 'overview' | 'service' | 'product';

type TrendPoint = {
  date: string;
  service_count: number;
  service_revenue: number;
  product_count: number;
  product_revenue: number;
};

type DistributionRow = {
  category_id: number | null;
  category_name: string;
  quantity: number;
  revenue: number;
  share: number;
};

type TopRow = {
  product_id: number;
  name: string;
  quantity: number;
  revenue: number;
};

type BreakdownRow = {
  product_id: number;
  name: string;
  sku: string | null;
  category_name: string;
  quantity: number;
  revenue: number;
};

type DashboardResponse = {
  start_date: string;
  end_date: string;
  prev_start_date: string;
  prev_end_date: string;
  growth: {
    service_count: number;
    service_revenue: number;
    product_count: number;
    product_revenue: number;
  };
  series: TrendPoint[];
  service: {
    count: number;
    revenue: number;
    top_name: string | null;
    top_share: number;
    repeat_rate: number;
    type_distribution: DistributionRow[];
    top5: TopRow[];
    breakdown: BreakdownRow[];
  };
  product: {
    count: number;
    revenue: number;
    type_distribution: DistributionRow[];
    top5: TopRow[];
    breakdown: BreakdownRow[];
  };
};

export const SubcategoryDashboard = () => {
  const { t } = useTranslation();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYearBE = now.getFullYear() + 543;

  const toISODate = (d: Date) => d.toISOString().slice(0, 10);
  const monthRangeToISO = (month: number, yearBE: number) => {
    const yearAD = yearBE >= 2400 ? yearBE - 543 : yearBE;
    const start = new Date(Date.UTC(yearAD, month - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(yearAD, month, 0, 0, 0, 0));
    return { startISO: toISODate(start), endISO: toISODate(end) };
  };

  const [mode, setMode] = useState<Mode>('overview');
  const [customStartMonth, setCustomStartMonth] = useState<number>(currentMonth);
  const [customStartYearBE, setCustomStartYearBE] = useState<number>(currentYearBE);
  const [customEndMonth, setCustomEndMonth] = useState<number>(currentMonth);
  const [customEndYearBE, setCustomEndYearBE] = useState<number>(currentYearBE);
  const [appliedStartDate, setAppliedStartDate] = useState(() => monthRangeToISO(currentMonth, currentYearBE).startISO);
  const [appliedEndDate, setAppliedEndDate] = useState(() => monthRangeToISO(currentMonth, currentYearBE).endISO);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<DashboardResponse | null>(null);

  const thaiMonths = [
    { value: 1, label: 'มกราคม' },
    { value: 2, label: 'กุมภาพันธ์' },
    { value: 3, label: 'มีนาคม' },
    { value: 4, label: 'เมษายน' },
    { value: 5, label: 'พฤษภาคม' },
    { value: 6, label: 'มิถุนายน' },
    { value: 7, label: 'กรกฎาคม' },
    { value: 8, label: 'สิงหาคม' },
    { value: 9, label: 'กันยายน' },
    { value: 10, label: 'ตุลาคม' },
    { value: 11, label: 'พฤศจิกายน' },
    { value: 12, label: 'ธันวาคม' },
  ];

  const yearOptionsBE = useMemo(() => {
    const y = now.getFullYear();
    const out: number[] = [];
    for (let ad = y - 5; ad <= y + 1; ad += 1) out.push(ad + 543);
    return out;
  }, [now]);

  const formatMoney = (v: number | string) => {
    const n = typeof v === 'number' ? v : Number(v || 0);
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatThaiShort = (iso: string) =>
    new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: '2-digit' }).format(new Date(`${iso}T00:00:00`));

  const formatThaiMonthYear = (iso: string) =>
    new Intl.DateTimeFormat('th-TH', { month: 'short', year: 'numeric' }).format(new Date(`${iso}T00:00:00`));

  const applyRange = () => {
    const startIndex = customStartYearBE * 12 + customStartMonth;
    const endIndex = customEndYearBE * 12 + customEndMonth;
    if (endIndex < startIndex) return;
    const start = monthRangeToISO(customStartMonth, customStartYearBE).startISO;
    const end = monthRangeToISO(customEndMonth, customEndYearBE).endISO;
    setAppliedStartDate(start);
    setAppliedEndDate(end);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (appliedStartDate) params.set('start_date', appliedStartDate);
        if (appliedEndDate) params.set('end_date', appliedEndDate);
        const res = await api.get<DashboardResponse>(`/analytics/subcategory-dashboard?${params.toString()}`);
        setData(res.data);
      } catch {
        setData(null);
        setError(t('common.fetch_failed', 'โหลดข้อมูลไม่สำเร็จ'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [appliedStartDate, appliedEndDate, t]);

  type CurrentView = {
    count: number;
    revenue: number;
    type_distribution: DistributionRow[];
    top5: TopRow[];
    breakdown: BreakdownRow[];
    top_name?: string | null;
    top_share?: number;
    repeat_rate?: number;
  };

  const overview = useMemo<CurrentView | null>(() => {
    if (!data) return null;
    const distMap = new Map<string, DistributionRow>();
    const addDist = (rows: DistributionRow[]) => {
      rows.forEach((r) => {
        const key = `${r.category_id ?? 'null'}:${r.category_name || ''}`;
        const prev = distMap.get(key);
        const next: DistributionRow = prev
          ? {
              category_id: prev.category_id,
              category_name: prev.category_name,
              quantity: Number(prev.quantity || 0) + Number(r.quantity || 0),
              revenue: Number(prev.revenue || 0) + Number(r.revenue || 0),
              share: 0,
            }
          : {
              category_id: r.category_id,
              category_name: r.category_name,
              quantity: Number(r.quantity || 0),
              revenue: Number(r.revenue || 0),
              share: 0,
            };
        distMap.set(key, next);
      });
    };

    addDist(data.service.type_distribution || []);
    addDist(data.product.type_distribution || []);
    const type_distribution = Array.from(distMap.values()).sort(
      (a, b) => (Number(b.quantity || 0) - Number(a.quantity || 0)) || (Number(b.revenue || 0) - Number(a.revenue || 0))
    );

    const topMap = new Map<number, TopRow>();
    const addTop = (rows: TopRow[]) => {
      rows.forEach((r) => {
        const id = Number(r.product_id);
        const prev = topMap.get(id);
        topMap.set(id, {
          product_id: id,
          name: r.name,
          quantity: Number(prev?.quantity || 0) + Number(r.quantity || 0),
          revenue: Number(prev?.revenue || 0) + Number(r.revenue || 0),
        });
      });
    };
    addTop(data.service.top5 || []);
    addTop(data.product.top5 || []);
    const top5 = Array.from(topMap.values())
      .sort((a, b) => (Number(b.quantity || 0) - Number(a.quantity || 0)) || (Number(b.revenue || 0) - Number(a.revenue || 0)))
      .slice(0, 5);

    const breakdownMap = new Map<number, BreakdownRow>();
    const addBreakdown = (rows: BreakdownRow[]) => {
      rows.forEach((r) => {
        const id = Number(r.product_id);
        const prev = breakdownMap.get(id);
        breakdownMap.set(id, {
          product_id: id,
          name: r.name,
          sku: r.sku ?? prev?.sku ?? null,
          category_name: r.category_name ?? prev?.category_name ?? '',
          quantity: Number(prev?.quantity || 0) + Number(r.quantity || 0),
          revenue: Number(prev?.revenue || 0) + Number(r.revenue || 0),
        });
      });
    };
    addBreakdown(data.service.breakdown || []);
    addBreakdown(data.product.breakdown || []);
    const breakdown = Array.from(breakdownMap.values()).sort(
      (a, b) => (Number(b.quantity || 0) - Number(a.quantity || 0)) || (Number(b.revenue || 0) - Number(a.revenue || 0))
    );

    return {
      count: Number(data.service.count || 0) + Number(data.product.count || 0),
      revenue: Number(data.service.revenue || 0) + Number(data.product.revenue || 0),
      type_distribution,
      top5,
      breakdown,
      repeat_rate: Number(data.service.repeat_rate || 0),
    };
  }, [data]);

  const current: CurrentView | null = data
    ? mode === 'service'
      ? data.service
      : mode === 'product'
        ? data.product
        : overview
    : null;

  const cards = useMemo(() => {
    if (!data || !current) return [];
    const count = Number(current.count || 0);
    const revenue = Number(current.revenue || 0);
    const gCount =
      mode === 'service'
        ? data.growth.service_count
        : mode === 'product'
          ? data.growth.product_count
          : 0;
    const gRevenue =
      mode === 'service'
        ? data.growth.service_revenue
        : mode === 'product'
          ? data.growth.product_revenue
          : 0;
    const topName =
      mode === 'service'
        ? data.service.top_name
        : mode === 'product'
          ? (data.product.top5[0]?.name ?? null)
          : (overview?.top5?.[0]?.name ?? null);
    const topShare =
      mode === 'service'
        ? Number(data.service.top_share || 0)
        : mode === 'overview' && overview
          ? (() => {
              const topQty = Number(overview.top5?.[0]?.quantity || 0);
              const total = Number(overview.count || 0);
              return total > 0 ? (topQty / total) * 100 : 0;
            })()
          : 0;
    const repeatRate = mode === 'service' ? Number(data.service.repeat_rate || 0) : mode === 'overview' ? Number(data.service.repeat_rate || 0) : 0;
    return [
      {
        title:
          mode === 'service'
            ? t('analytics.total_services', 'จำนวนบริการทั้งหมด')
            : mode === 'product'
              ? t('analytics.total_products', 'จำนวนสินค้าทั้งหมด')
              : t('analytics.total_overview', 'จำนวนสินค้าและบริการทั้งหมด'),
        value: `${count.toLocaleString('en-US')} ${t('analytics.times', 'ครั้ง')}`,
        sub:
          mode === 'overview'
            ? `${t('analytics.services', 'บริการ')} ${data.growth.service_count >= 0 ? '+' : ''}${data.growth.service_count.toLocaleString('en-US')}% / ${t('analytics.products', 'สินค้า')} ${data.growth.product_count >= 0 ? '+' : ''}${data.growth.product_count.toLocaleString('en-US')}%`
            : `${gCount >= 0 ? '+' : ''}${gCount.toLocaleString('en-US')}% ${t('analytics.vs_prev', 'vs รอบก่อน')}`,
        icon: 'bi-people',
      },
      {
        title:
          mode === 'service'
            ? t('analytics.service_revenue', 'รายได้จากการบริการ')
            : mode === 'product'
              ? t('analytics.product_revenue', 'รายได้จากสินค้า')
              : t('analytics.total_revenue', 'รายได้รวม'),
        value: `฿${formatMoney(revenue)}`,
        sub:
          mode === 'overview'
            ? `${t('analytics.services', 'บริการ')} ${data.growth.service_revenue >= 0 ? '+' : ''}${data.growth.service_revenue.toLocaleString('en-US')}% / ${t('analytics.products', 'สินค้า')} ${data.growth.product_revenue >= 0 ? '+' : ''}${data.growth.product_revenue.toLocaleString('en-US')}%`
            : `${gRevenue >= 0 ? '+' : ''}${gRevenue.toLocaleString('en-US')}% ${t('analytics.vs_prev', 'vs รอบก่อน')}`,
        icon: 'bi-cash',
      },
      {
        title:
          mode === 'service'
            ? t('analytics.top_service', 'บริการยอดนิยม')
            : mode === 'product'
              ? t('analytics.top_product', 'สินค้าขายดี')
              : t('analytics.top_overall', 'ยอดนิยมรวม'),
        value: topName || '-',
        sub:
          mode === 'service' || mode === 'overview'
            ? `${topShare.toLocaleString('en-US', { maximumFractionDigits: 1 })}% ${t('analytics.of_total', 'ของยอดรวม')}`
            : '',
        icon: 'bi-star',
      },
      {
        title: t('analytics.repeat_rate', 'การเติบโตโดยลูกค้า'),
        value: mode === 'product' ? '-' : `${repeatRate.toLocaleString('en-US')}%`,
        sub: mode === 'product' ? '' : t('analytics.repeat_sub', 'ลูกค้ากลับมาใช้ซ้ำ'),
        icon: 'bi-graph-up',
      },
    ];
  }, [current, data, formatMoney, mode, overview, t]);

  const series = data?.series || [];

  const useMonthlyTrends = useMemo(() => {
    if (!appliedStartDate || !appliedEndDate) return false;
    return appliedStartDate.slice(0, 7) !== appliedEndDate.slice(0, 7);
  }, [appliedEndDate, appliedStartDate]);

  const trendsWrapRef = useRef<HTMLDivElement>(null);
  const [trendHoverIdx, setTrendHoverIdx] = useState<number | null>(null);
  const [trendHoverPos, setTrendHoverPos] = useState<{ left: number; top: number } | null>(null);

  const donutWrapRef = useRef<HTMLDivElement>(null);
  const [donutHoverIdx, setDonutHoverIdx] = useState<number | null>(null);
  const [donutHoverPos, setDonutHoverPos] = useState<{ left: number; top: number } | null>(null);

  const updateDonutHover = (idx: number, clientX: number, clientY: number) => {
    setDonutHoverIdx(idx);
    const el = donutWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setDonutHoverPos({
      left: clientX - rect.left,
      top: clientY - rect.top,
    });
  };

  const trendPoints = useMemo(() => {
    const daily = series.map((p) => ({
      date: p.date,
      count:
        mode === 'service'
          ? Number(p.service_count || 0)
          : mode === 'product'
            ? Number(p.product_count || 0)
            : Number(p.service_count || 0) + Number(p.product_count || 0),
      revenue:
        mode === 'service'
          ? Number(p.service_revenue || 0)
          : mode === 'product'
            ? Number(p.product_revenue || 0)
            : Number(p.service_revenue || 0) + Number(p.product_revenue || 0),
    }));

    if (!useMonthlyTrends) return daily;

    const map = new Map<string, { date: string; count: number; revenue: number }>();
    daily.forEach((p) => {
      const key = String(p.date || '').slice(0, 7);
      if (key.length !== 7) return;
      const existing = map.get(key) || { date: `${key}-01`, count: 0, revenue: 0 };
      existing.count += Number(p.count || 0);
      existing.revenue += Number(p.revenue || 0);
      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [mode, series, useMonthlyTrends]);

  const lineSeries = useMemo(() => {
    const points = trendPoints;
    const maxCount = Math.max(1, ...points.map((p) => p.count));
    const maxRevenue = Math.max(1, ...points.map((p) => p.revenue));
    return { points, maxCount, maxRevenue };
  }, [trendPoints]);

  const chartMeta = useMemo(() => {
    const width = 520;
    const height = 220;
    const padding = { left: 78, right: 56, top: 10, bottom: 30 };
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;
    return { width, height, padding, innerW, innerH };
  }, []);

  const getTrendXAtIdx = (idx: number) => {
    const n = lineSeries.points.length;
    const step = n <= 1 ? 0 : chartMeta.innerW / (n - 1);
    return chartMeta.padding.left + idx * step;
  };

  const getTrendIdxFromClientX = (clientX: number) => {
    const el = trendsWrapRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const relX = clientX - rect.left;
    const n = lineSeries.points.length;
    if (n <= 0) return null;
    const xInViewBox = (relX / Math.max(1, rect.width)) * chartMeta.width;
    const step = n <= 1 ? 0 : chartMeta.innerW / (n - 1);
    const raw = step <= 0 ? 0 : Math.round((xInViewBox - chartMeta.padding.left) / step);
    return Math.max(0, Math.min(n - 1, raw));
  };

  const updateTrendHover = (clientX: number, clientY: number) => {
    const idx = getTrendIdxFromClientX(clientX);
    if (idx === null) return;
    setTrendHoverIdx(idx);
    const el = trendsWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setTrendHoverPos({
      left: clientX - rect.left,
      top: clientY - rect.top,
    });
  };

  const buildLinePath = (vals: number[], width: number, height: number, padding: { left: number; right: number; top: number; bottom: number }) => {
    const innerW = Math.max(1, width - padding.left - padding.right);
    const innerH = Math.max(1, height - padding.top - padding.bottom);
    const maxV = Math.max(1, ...vals);
    const step = vals.length <= 1 ? 0 : innerW / (vals.length - 1);
    const yAt = (v: number) => padding.top + innerH - (Math.max(0, v) / maxV) * innerH;
    let d = '';
    vals.forEach((v, idx) => {
      const x = padding.left + idx * step;
      const y = yAt(v);
      d += `${idx === 0 ? 'M' : 'L'} ${x} ${y} `;
    });
    return d.trim();
  };

  type DonutRow = DistributionRow & { shareRaw: number; shareDisplay: number };

  const donut = useMemo(() => {

    const dist = (current?.type_distribution || []).slice();
    dist.sort((a, b) => (Number(b.quantity || 0) - Number(a.quantity || 0)) || (Number(b.revenue || 0) - Number(a.revenue || 0)));

    const totalQty = dist.reduce((acc, r) => acc + Number(r.quantity || 0), 0);
    const totalRev = dist.reduce((acc, r) => acc + Number(r.revenue || 0), 0);

    const topN = 4;
    const top = dist.slice(0, topN);
    const rest = dist.slice(topN);

    const rows: DonutRow[] = top.map((r) => {
      const shareRaw = totalQty > 0 ? (Number(r.quantity || 0) / totalQty) * 100 : 0;
      const shareDisplay = Math.round(shareRaw * 10) / 10;
      return { ...r, share: shareDisplay, shareRaw, shareDisplay };
    });

    if (rest.length > 0) {
      const restQty = rest.reduce((acc, r) => acc + Number(r.quantity || 0), 0);
      const restRev = rest.reduce((acc, r) => acc + Number(r.revenue || 0), 0);
      const shareRaw = totalQty > 0 ? (restQty / totalQty) * 100 : 0;
      const shareDisplay = Math.round(shareRaw * 10) / 10;
      rows.push({
        category_id: null,
        category_name: t('analytics.others', 'อื่นๆ'),
        quantity: restQty,
        revenue: restRev,
        share: shareDisplay,
        shareRaw,
        shareDisplay,
      });
    }

    return { totalQty, totalRev, rows };
  }, [current, t]);

  const categoryColors = [
    'var(--vendia-palette-1)',
    'var(--vendia-palette-2)',
    'var(--vendia-palette-3)',
    'var(--vendia-palette-4)',
    'var(--vendia-palette-5)',
    'var(--vendia-palette-6)',
    'var(--vendia-palette-7)',
    'var(--vendia-palette-8)',
  ];
  const categoryColor = (idx: number) => categoryColors[idx % categoryColors.length];

  const exportCsv = () => {
    if (!current) return;
    const rows = current.breakdown || [];
    const header = ['name', 'sku', 'category', 'quantity', 'revenue'];
    const lines = [header.join(',')].concat(
      rows.map((r) => {
        const vals = [r.name, r.sku || '', r.category_name, String(r.quantity), String(r.revenue)];
        return vals
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',');
      })
    );
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mode}-breakdown-${(data?.start_date || '').slice(0, 10)}-${(data?.end_date || '').slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container-fluid p-2 p-md-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-3">
        <div>
          <h1 className="h4 mb-1">{t('analytics.title', 'ข้อมูลสินค้าและบริการ')}</h1>
          {data && (
            <div className="text-muted small">
              {data.start_date} – {data.end_date}
            </div>
          )}
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="d-flex flex-wrap align-items-end gap-2">
            <div>
              <div className="small text-muted fw-semibold mb-1">{t('analytics.start_month', 'เดือนเริ่มต้น')}</div>
              <div className="d-flex gap-2">
                <select
                  className="form-select"
                  style={{ width: 140 }}
                  value={customStartMonth}
                  onChange={(e) => setCustomStartMonth(Number(e.target.value))}
                >
                  {thaiMonths.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <select
                  className="form-select"
                  style={{ width: 110 }}
                  value={customStartYearBE}
                  onChange={(e) => setCustomStartYearBE(Number(e.target.value))}
                >
                  {yearOptionsBE.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="small text-muted fw-semibold mb-1">{t('analytics.end_month', 'เดือนสิ้นสุด')}</div>
              <div className="d-flex gap-2">
                <select
                  className="form-select"
                  style={{ width: 140 }}
                  value={customEndMonth}
                  onChange={(e) => setCustomEndMonth(Number(e.target.value))}
                >
                  {thaiMonths.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <select
                  className="form-select"
                  style={{ width: 110 }}
                  value={customEndYearBE}
                  onChange={(e) => setCustomEndYearBE(Number(e.target.value))}
                >
                  {yearOptionsBE.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={applyRange}
              disabled={(customEndYearBE * 12 + customEndMonth) < (customStartYearBE * 12 + customStartMonth)}
            >
              {t('common.apply', 'แสดงผล')}
            </button>
          </div>
          <button type="button" className="btn btn-outline-secondary" onClick={exportCsv} disabled={!current}>
            <i className="bi bi-download me-2" />
            {t('analytics.export', 'Export')}
          </button>
        </div>
      </div>

      <div className="d-flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          className={`btn ${mode === 'overview' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setMode('overview')}
        >
          {t('analytics.overview', 'ภาพรวม')}
        </button>
        <button
          type="button"
          className={`btn ${mode === 'service' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setMode('service')}
        >
          {t('analytics.services', 'บริการ')}
        </button>
        <button
          type="button"
          className={`btn ${mode === 'product' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setMode('product')}
        >
          {t('analytics.products', 'สินค้า')}
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : !data || !current ? (
        <div className="text-muted text-center py-5">{t('common.no_data', 'ไม่พบข้อมูล')}</div>
      ) : (
        <>
          <div className="row g-3 mb-3">
            {cards.map((c) => (
              <div key={c.title} className="col-12 col-md-6 col-xl-3">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div style={{ minWidth: 0 }}>
                        <div className="text-muted small fw-semibold">{c.title}</div>
                        <div className="fw-bold fs-4 mt-1 text-truncate">{c.value}</div>
                        {c.sub && <div className="small text-success mt-1">{c.sub}</div>}
                      </div>
                      <div
                        className="d-flex align-items-center justify-content-center"
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: 'var(--vendia-brand-soft)',
                          color: 'var(--vendia-brand)',
                          flex: '0 0 auto',
                        }}
                      >
                        <i className={`bi ${c.icon}`} style={{ fontSize: 18 }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="row g-3 mb-3">
            <div className="col-12 col-xl-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white fw-bold">
                  {mode === 'service'
                    ? t('analytics.service_trends', 'แนวโน้มการให้บริการ (Service Trends)')
                    : mode === 'product'
                      ? t('analytics.product_trends', 'แนวโน้มการขายสินค้า (Product Trends)')
                      : t('analytics.overview_trends', 'แนวโน้มสินค้าและบริการ (Overview Trends)')}
                </div>
                <div className="card-body">
                  <div className="d-flex gap-3 align-items-center mb-2 small">
                    <div className="d-flex align-items-center gap-2">
                      <span className="d-inline-block rounded" style={{ width: 10, height: 10, background: 'var(--vendia-metric-count)' }} />
                      <span>{t('analytics.count', 'ครั้ง')}</span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className="d-inline-block rounded" style={{ width: 10, height: 10, background: 'var(--vendia-metric-revenue)' }} />
                      <span>{t('analytics.revenue', 'รายได้')}</span>
                    </div>
                  </div>
                  <div
                    ref={trendsWrapRef}
                    style={{ position: 'relative' }}
                    onMouseLeave={() => {
                      setTrendHoverIdx(null);
                      setTrendHoverPos(null);
                    }}
                    onMouseMove={(e) => updateTrendHover(e.clientX, e.clientY)}
                    onTouchMove={(e) => {
                      const t = e.touches[0];
                      if (!t) return;
                      updateTrendHover(t.clientX, t.clientY);
                    }}
                    onTouchEnd={() => {
                      setTrendHoverIdx(null);
                      setTrendHoverPos(null);
                    }}
                  >
                    <svg viewBox={`0 0 ${chartMeta.width} ${chartMeta.height}`} width="100%" height="220">
                      <rect x="0" y="0" width={chartMeta.width} height={chartMeta.height} fill="var(--vendia-surface)" />
                      <g>
                        {(() => {
                          const ticks = 5;
                          const maxRevenue = Math.max(1, Number(lineSeries.maxRevenue || 0));
                          const maxCount = Math.max(1, Number(lineSeries.maxCount || 0));
                          return Array.from({ length: ticks }, (_, i) => {
                            const t = ticks <= 1 ? 0 : i / (ticks - 1);
                            const revenueValue = maxRevenue * (1 - t);
                            const countValue = maxCount * (1 - t);
                            const y = chartMeta.padding.top + chartMeta.innerH * t;
                            return (
                              <g key={`y-${i}`}>
                                <line
                                  x1={chartMeta.padding.left}
                                  y1={y}
                                  x2={chartMeta.width - chartMeta.padding.right}
                                  y2={y}
                                  stroke="var(--vendia-grid)"
                                />
                                <text
                                  x={chartMeta.padding.left - 6}
                                  y={y + 4}
                                  textAnchor="end"
                                  fontSize="11"
                                  fill="var(--vendia-text-muted)"
                                >
                                  ฿{formatMoney(revenueValue)}
                                </text>
                                <text
                                  x={chartMeta.width - chartMeta.padding.right + 6}
                                  y={y + 4}
                                  textAnchor="start"
                                  fontSize="11"
                                  fill="var(--vendia-text-muted)"
                                >
                                  {Math.round(countValue).toLocaleString('en-US')}
                                </text>
                              </g>
                            );
                          });
                        })()}
                        <line
                          x1={chartMeta.padding.left}
                          y1={chartMeta.padding.top}
                          x2={chartMeta.padding.left}
                          y2={chartMeta.height - chartMeta.padding.bottom}
                          stroke="var(--vendia-border)"
                        />
                        <line
                          x1={chartMeta.width - chartMeta.padding.right}
                          y1={chartMeta.padding.top}
                          x2={chartMeta.width - chartMeta.padding.right}
                          y2={chartMeta.height - chartMeta.padding.bottom}
                          stroke="var(--vendia-border)"
                        />
                      </g>
                      <g>
                        <path
                          d={buildLinePath(lineSeries.points.map((p) => p.count), chartMeta.width, chartMeta.height, chartMeta.padding)}
                          fill="none"
                          stroke="var(--vendia-metric-count)"
                          strokeWidth="2.5"
                        />
                        <path
                          d={buildLinePath(lineSeries.points.map((p) => p.revenue), chartMeta.width, chartMeta.height, chartMeta.padding)}
                          fill="none"
                          stroke="var(--vendia-metric-revenue)"
                          strokeWidth="2.5"
                          opacity="0.7"
                        />
                        {trendHoverIdx !== null && lineSeries.points[trendHoverIdx] && (
                          (() => {
                            const p = lineSeries.points[trendHoverIdx];
                            const x = getTrendXAtIdx(trendHoverIdx);
                            const yCount =
                              chartMeta.padding.top +
                              chartMeta.innerH -
                              (Math.max(0, Number(p.count || 0)) / Math.max(1, lineSeries.maxCount)) * chartMeta.innerH;
                            const yRevenue =
                              chartMeta.padding.top +
                              chartMeta.innerH -
                              (Math.max(0, Number(p.revenue || 0)) / Math.max(1, lineSeries.maxRevenue)) * chartMeta.innerH;
                            return (
                              <g>
                                <line x1={x} y1={chartMeta.padding.top} x2={x} y2={chartMeta.height - chartMeta.padding.bottom} stroke="var(--vendia-text)" strokeOpacity="0.25" />
                                <circle cx={x} cy={yCount} r="4" fill="var(--vendia-metric-count)" stroke="var(--vendia-surface)" strokeWidth="2" />
                                <circle cx={x} cy={yRevenue} r="4" fill="var(--vendia-metric-revenue)" stroke="var(--vendia-surface)" strokeWidth="2" />
                              </g>
                            );
                          })()
                        )}
                      </g>
                      <g>
                        {lineSeries.points.map((p, idx) => {
                          const tooMany = lineSeries.points.length > 12;
                          if (tooMany) {
                            if (!useMonthlyTrends && idx % 3 !== 0 && idx !== lineSeries.points.length - 1) return null;
                            if (useMonthlyTrends && idx % 2 !== 0 && idx !== lineSeries.points.length - 1) return null;
                          }
                          const x = getTrendXAtIdx(idx);
                          return (
                            <text key={p.date} x={x} y={chartMeta.height - 10} textAnchor="middle" fontSize="11" fill="var(--vendia-text-muted)">
                              {useMonthlyTrends ? formatThaiMonthYear(p.date) : formatThaiShort(p.date)}
                            </text>
                          );
                        })}
                      </g>
                    </svg>

                    {trendHoverIdx !== null && trendHoverPos && lineSeries.points[trendHoverIdx] && (
                      <div
                        className="shadow-sm bg-dark text-white rounded px-2 py-1"
                        style={{
                          position: 'absolute',
                          left: trendHoverPos.left,
                          top: Math.max(0, trendHoverPos.top),
                          transform: trendHoverPos.top < 90 ? 'translate(-50%, 12px)' : 'translate(-50%, -115%)',
                          pointerEvents: 'none',
                          maxWidth: 260,
                          fontSize: 12,
                          lineHeight: 1.35,
                          zIndex: 10,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <div className="fw-semibold">
                          {useMonthlyTrends ? formatThaiMonthYear(lineSeries.points[trendHoverIdx].date) : lineSeries.points[trendHoverIdx].date}
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <span className="d-inline-block rounded" style={{ width: 10, height: 10, background: 'var(--vendia-metric-count)' }} />
                          <span>{t('analytics.count', 'ครั้ง')}:</span>
                          <span className="fw-semibold">{Number(lineSeries.points[trendHoverIdx].count || 0).toLocaleString('en-US')}</span>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <span className="d-inline-block rounded" style={{ width: 10, height: 10, background: 'var(--vendia-metric-revenue)' }} />
                          <span>{t('analytics.revenue', 'รายได้')}:</span>
                          <span className="fw-semibold">฿{formatMoney(Number(lineSeries.points[trendHoverIdx].revenue || 0))}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-xl-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white fw-bold">
                  {t('analytics.distribution', 'สัดส่วนประเภท (Distribution)')}
                </div>
                <div className="card-body">
                  <div
                    className="d-flex justify-content-center"
                    ref={donutWrapRef}
                    style={{ position: 'relative' }}
                    onMouseLeave={() => {
                      setDonutHoverIdx(null);
                      setDonutHoverPos(null);
                    }}
                    onTouchEnd={() => {
                      setDonutHoverIdx(null);
                      setDonutHoverPos(null);
                    }}
                  >
                    <svg width="220" height="220" viewBox="0 0 220 220">
                      {(() => {
                        const r = 78;
                        const c = 2 * Math.PI * r;
                        let acc = 0;
                        return donut.rows.map((row, idx) => {
                          const raw = Math.max(0, Number((row as DonutRow).shareRaw ?? 0));
                          const pct =
                            idx === donut.rows.length - 1
                              ? Math.max(0, 100 - acc)
                              : raw;
                          const dash = (pct / 100) * c;
                          const gap = c - dash;
                          const strokeDasharray = `${dash} ${gap}`;
                          const strokeDashoffset = (-acc / 100) * c;
                          acc += pct;
                          const active = donutHoverIdx === idx;
                          const dimmed = donutHoverIdx !== null && !active;
                          return (
                            <circle
                              key={`${row.category_id ?? 'other'}-${row.category_name}`}
                              cx="110"
                              cy="110"
                              r={r}
                              fill="transparent"
                              stroke={categoryColor(idx)}
                              strokeWidth={active ? 24 : 18}
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                              transform="rotate(-90 110 110)"
                              opacity={dimmed ? 0.55 : 1}
                              style={{ cursor: 'pointer', transition: 'stroke-width 120ms ease, opacity 120ms ease' }}
                              onMouseEnter={(e) => updateDonutHover(idx, e.clientX, e.clientY)}
                              onMouseMove={(e) => updateDonutHover(idx, e.clientX, e.clientY)}
                              onTouchMove={(e) => {
                                const t = e.touches[0];
                                if (!t) return;
                                updateDonutHover(idx, t.clientX, t.clientY);
                              }}
                            />
                          );
                        });
                      })()}
                      <circle cx="110" cy="110" r="64" fill="var(--vendia-surface)" />
                      <text x="110" y="110" textAnchor="middle" dominantBaseline="middle" fontSize="22" fontWeight={700} fill="var(--vendia-text)">
                        100%
                      </text>
                    </svg>

                    {donutHoverIdx !== null && donutHoverPos && donut.rows[donutHoverIdx] && (
                      <div
                        className="shadow-sm bg-dark text-white rounded px-2 py-1"
                        style={{
                          position: 'absolute',
                          left: donutHoverPos.left,
                          top: donutHoverPos.top,
                          transform: donutHoverPos.top < 90 ? 'translate(-50%, 12px)' : 'translate(-50%, -115%)',
                          pointerEvents: 'none',
                          maxWidth: 260,
                          fontSize: 12,
                          lineHeight: 1.35,
                          zIndex: 10,
                        }}
                      >
                        <div className="fw-semibold">{donut.rows[donutHoverIdx].category_name}</div>
                        <div className="d-flex align-items-center gap-2">
                          <span className="d-inline-block rounded" style={{ width: 10, height: 10, background: categoryColor(donutHoverIdx) }} />
                          <span>{t('analytics.share', 'สัดส่วน')}:</span>
                          <span className="fw-semibold">{Number(donut.rows[donutHoverIdx].shareDisplay || 0).toLocaleString('en-US')}%</span>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <span>{t('analytics.qty', 'จำนวนหน่วย')}:</span>
                          <span className="fw-semibold">{Number(donut.rows[donutHoverIdx].quantity || 0).toLocaleString('en-US')}</span>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <span>{t('analytics.revenue', 'รายได้')}:</span>
                          <span className="fw-semibold">฿{formatMoney(Number(donut.rows[donutHoverIdx].revenue || 0))}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="d-flex flex-wrap gap-3 justify-content-center mt-2">
                    {donut.rows.map((r, idx) => (
                      <div
                        key={`${r.category_id ?? 'other'}-${r.category_name}`}
                        className="d-flex align-items-center gap-2 small"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={(e) => updateDonutHover(idx, e.clientX, e.clientY)}
                        onMouseMove={(e) => updateDonutHover(idx, e.clientX, e.clientY)}
                        onMouseLeave={() => {
                          setDonutHoverIdx(null);
                          setDonutHoverPos(null);
                        }}
                      >
                        <span className="d-inline-block rounded" style={{ width: 10, height: 10, background: categoryColor(idx) }} />
                        <span className="text-muted">{r.category_name}</span>
                        <span className="fw-semibold">{Number((r as DonutRow).shareDisplay ?? r.share ?? 0).toLocaleString('en-US')}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-xl-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white fw-bold">
                  {t('analytics.top5', 'Top 5')}
                </div>
                <div className="card-body">
                  {(current.top5 || []).length === 0 ? (
                    <div className="text-muted">{t('common.no_data', 'ไม่พบข้อมูล')}</div>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      {current.top5.map((r, idx) => {
                        const max = Math.max(1, ...current.top5.map((x) => Number(x.quantity || 0)));
                        const pct = (Number(r.quantity || 0) / max) * 100;
                        return (
                          <div key={r.product_id}>
                            <div className="d-flex justify-content-between align-items-center gap-2">
                              <div className="fw-semibold text-truncate" style={{ minWidth: 0 }}>
                                {r.name}
                              </div>
                              <div className="small text-muted">{Number(r.quantity || 0).toLocaleString('en-US')}</div>
                            </div>
                            <div className="progress mt-2" style={{ height: 8 }}>
                              <div className="progress-bar" style={{ width: `${pct}%`, background: categoryColor(idx) }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <div className="fw-bold">{t('analytics.breakdown', 'แจกแจงรายละเอียด (Breakdown)')}</div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table align-top mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="p-3">{t('analytics.item', 'ชื่อ')}</th>
                      <th className="p-3" style={{ width: 140 }}>SKU</th>
                      <th className="p-3" style={{ width: 160 }}>{t('analytics.category', 'หมวดหมู่')}</th>
                      <th className="p-3 text-end" style={{ width: 140 }}>{t('analytics.qty', 'จำนวนหน่วย')}</th>
                      <th className="p-3 text-end" style={{ width: 160 }}>{t('analytics.revenue', 'รายได้')}</th>
                      <th className="p-3 text-end" style={{ width: 120 }}>{t('analytics.profit', 'กำไร (%)')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(current.breakdown || []).slice(0, 50).map((r) => (
                      <tr key={r.product_id}>
                        <td className="p-3">
                          <div className="fw-semibold">{r.name}</div>
                        </td>
                        <td className="p-3 text-muted">{r.sku || '-'}</td>
                        <td className="p-3">
                          <span className="badge bg-light text-dark border">{r.category_name || '-'}</span>
                        </td>
                        <td className="p-3 text-end">{Number(r.quantity || 0).toLocaleString('en-US')}</td>
                        <td className="p-3 text-end fw-semibold">฿{formatMoney(r.revenue || 0)}</td>
                        <td className="p-3 text-end text-muted">-</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(current.breakdown || []).length > 50 && (
                <div className="p-3 text-muted small">
                  {t('analytics.showing_first', 'แสดง 50 รายการแรกจากทั้งหมด')} {(current.breakdown || []).length.toLocaleString('en-US')}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
