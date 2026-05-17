import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@vendia/shared';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

type GroupBy = 'day' | 'month';

type SummaryPoint = {
  bucket: string;
  label: string;
  completed_total: number;
  completed_count: number;
  pending_total: number;
  pending_count: number;
  pending_installment_total: number;
  pending_installment_count: number;
  pending_billing_total: number;
  pending_billing_count: number;
  pending_quotation_total: number;
  pending_quotation_count: number;
};

type PendingOrder = {
  id: number;
  created_at: string;
  total: string | number;
  customer_name: string | null;
  pending_kind: 'quotation' | 'billing_note' | 'installment';
  payment_method?: string | null;
  has_payment_plan?: boolean;
  document_id?: number | null;
  document_type?: 'quotation' | 'billing_note' | string | null;
  document_number?: string | null;
};

type PendingKindFilter = 'all' | 'quotation' | 'billing_note' | 'installment';

type PendingPagination = {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

type SummaryResponse = {
  preset: string;
  group_by: GroupBy;
  start_date: string;
  end_date: string;
  series: SummaryPoint[];
  totals: {
    completed_total: number;
    completed_count: number;
    pending_total: number;
    pending_count: number;
    pending_billing_total: number;
    pending_billing_count: number;
    pending_installment_total: number;
    pending_installment_count: number;
    pending_quotation_total: number;
    pending_quotation_count: number;
  };
  pending_orders: PendingOrder[];
  pending_pagination?: PendingPagination;
};

export const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const chartWrapRef = useRef<HTMLDivElement | null>(null);
  const lineChartWrapRef = useRef<HTMLDivElement | null>(null);
  const [fromMonth, setFromMonth] = useState(() => {
    const d = new Date();
    const yyyy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  });
  const [toMonth, setToMonth] = useState(() => {
    const d = new Date();
    const yyyy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  });
  const [appliedFromMonth, setAppliedFromMonth] = useState(() => {
    const d = new Date();
    const yyyy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  });
  const [appliedToMonth, setAppliedToMonth] = useState(() => {
    const d = new Date();
    const yyyy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [pendingPerPage, setPendingPerPage] = useState<5 | 10 | 25 | 50>(10);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingKind, setPendingKind] = useState<PendingKindFilter>('all');
  const [hovered, setHovered] = useState<{
    left: number;
    top: number;
    label: string;
    completed: number;
    pendingInstallment: number;
    pendingBilling: number;
    pendingQuotation: number;
    total: number;
  } | null>(null);
  const [hoveredLine, setHoveredLine] = useState<{
    left: number;
    top: number;
    label: string;
    completed: number;
    pendingInstallment: number;
    pendingBilling: number;
    pendingQuotation: number;
  } | null>(null);

  const formatMoney = (v: number | string) => {
    const n = typeof v === 'number' ? v : Number(v || 0);
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDateShort = (iso: string) =>
    new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));

  const formatDateLong = (iso: string) =>
    new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));

  const openDocument = (o: PendingOrder) => {
    const type = (o.document_type || o.pending_kind || 'quotation') as string;
    const params = new URLSearchParams();
    params.set('type', type);
    if (o.document_id) params.set('doc_id', String(o.document_id));
    window.open(`/print/order/${o.id}?${params.toString()}`, '_blank');
  };

  const formatMonthLabel = (bucket: string) => {
    const d = new Date(`${bucket}T00:00:00`);
    return new Intl.DateTimeFormat('th-TH', { month: 'short', year: '2-digit' }).format(d);
  };

  const formatDayOfMonth = (bucket: string) => String(new Date(`${bucket}T00:00:00`).getDate());

  const formatMonthYear = (isoDate: string) =>
    new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(new Date(`${isoDate}T00:00:00`));

  const locale = (i18n.language || 'th').toLowerCase().startsWith('th') ? 'th' : 'en';
  const months = useMemo(() => {
    const th = [
      'มกราคม',
      'กุมภาพันธ์',
      'มีนาคม',
      'เมษายน',
      'พฤษภาคม',
      'มิถุนายน',
      'กรกฎาคม',
      'สิงหาคม',
      'กันยายน',
      'ตุลาคม',
      'พฤศจิกายน',
      'ธันวาคม',
    ];
    const en = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const names = locale === 'th' ? th : en;
    return names.map((name, idx) => ({
      value: String(idx + 1).padStart(2, '0'),
      label: name,
    }));
  }, [locale]);

  const years = useMemo(() => {
    const now = new Date();
    const current = now.getFullYear();
    const start = current - 6;
    const end = current + 1;
    const out: { value: string; label: string }[] = [];
    for (let y = end; y >= start; y -= 1) {
      out.push({
        value: String(y),
        label: locale === 'th' ? String(y + 543) : String(y),
      });
    }
    return out;
  }, [locale]);

  const parseYM = (ym: string) => {
    const m = /^(\d{4})-(\d{2})$/.exec((ym || '').trim());
    if (!m) return null;
    return { year: m[1], month: m[2] };
  };

  const setYM = (currentYm: string, next: Partial<{ year: string; month: string }>) => {
    const parsed = parseYM(currentYm) || { year: String(new Date().getFullYear()), month: '01' };
    const year = next.year ?? parsed.year;
    const month = next.month ?? parsed.month;
    return `${year}-${month}`;
  };

  const formatRangeLabel = (startDate: string, endDate: string) => {
    const startKey = (startDate || '').slice(0, 7);
    const endKey = (endDate || '').slice(0, 7);
    if (!startKey || !endKey) return null;
    if (startKey === endKey) return formatMonthYear(startDate);
    return `${formatMonthYear(startDate)} – ${formatMonthYear(endDate)}`;
  };

  const buildMonthRange = (from: string, to: string) => {
    const fromMatch = /^(\d{4})-(\d{2})$/.exec((from || '').trim());
    const toMatch = /^(\d{4})-(\d{2})$/.exec((to || '').trim());
    if (!fromMatch || !toMatch) return null;

    const fromKey = `${fromMatch[1]}-${fromMatch[2]}`;
    const toKey = `${toMatch[1]}-${toMatch[2]}`;
    const [startKey, endKey] = fromKey <= toKey ? [fromKey, toKey] : [toKey, fromKey];

    const startDate = `${startKey}-01`;
    const yyyy = Number(endKey.slice(0, 4));
    const mm = Number(endKey.slice(5, 7));
    const lastDay = new Date(yyyy, mm, 0).getDate();
    const endDate = `${endKey}-${String(lastDay).padStart(2, '0')}`;
    return { startDate, endDate, startKey, endKey };
  };

  const series = data?.series || [];

  const lineIndicator = useMemo(() => {
    const completedSum = series.reduce((acc, p) => acc + (Number(p.completed_total) || 0), 0);
    const installmentSum = series.reduce((acc, p) => acc + (Number(p.pending_installment_total) || 0), 0);
    const billingSum = series.reduce((acc, p) => acc + (Number(p.pending_billing_total) || 0), 0);
    const quotationSum = series.reduce((acc, p) => acc + (Number(p.pending_quotation_total) || 0), 0);
    return { completedSum, installmentSum, billingSum, quotationSum };
  }, [series]);

  const appliedMonthDiff = useMemo(() => {
    const range = buildMonthRange(appliedFromMonth, appliedToMonth);
    if (!range) return 0;
    return (
      (Number(range.endKey.slice(0, 4)) - Number(range.startKey.slice(0, 4))) * 12 +
      (Number(range.endKey.slice(5, 7)) - Number(range.startKey.slice(5, 7)))
    );
  }, [appliedFromMonth, appliedToMonth]);

  const groupBy: GroupBy = appliedMonthDiff >= 1 ? 'month' : 'day';

  const isOneMonthRange = useMemo(() => {
    if (!data) return false;
    const m = /^(\d{4})-(\d{2})-01$/.exec(data.start_date);
    if (!m) return false;
    const yyyy = Number(m[1]);
    const mm = Number(m[2]);
    const lastDay = new Date(yyyy, mm, 0).getDate();
    return data.end_date === `${m[1]}-${m[2]}-${String(lastDay).padStart(2, '0')}`;
  }, [data]);

  const chart = useMemo(() => {
    const points = series;
    if (points.length === 0) return null;

    const maxY = Math.max(
      1,
      ...points.map((p) =>
        (Number(p.completed_total) || 0) +
        (Number(p.pending_installment_total) || 0) +
        (Number(p.pending_billing_total) || 0) +
        (Number(p.pending_quotation_total) || 0)
      )
    );

    const width = 920;
    const height = 320;
    const padding = { top: 16, right: 10, bottom: 42, left: 10 };
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;

    const barGap = groupBy === 'month' ? 18 : 6;
    const maxBarW = groupBy === 'month' ? 140 : 60;
    const barWRaw = innerW / points.length - barGap;
    const barW = Math.max(6, Math.min(maxBarW, barWRaw));
    const barsTotalW = points.length * barW + Math.max(0, points.length - 1) * barGap;
    const startX = padding.left + Math.max(0, (innerW - barsTotalW) / 2);

    const scaleY = (v: number) => (v / maxY) * innerH;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="320" role="img" aria-label="Revenue chart">
        <rect x="0" y="0" width={width} height={height} fill="white" />
        {points.map((p, idx) => {
          const completed = Number(p.completed_total) || 0;
          const pendingInstallment = Number(p.pending_installment_total) || 0;
          const pendingBilling = Number(p.pending_billing_total) || 0;
          const pendingQuotation = Number(p.pending_quotation_total) || 0;
          const total = completed + pendingInstallment + pendingBilling + pendingQuotation;
          const x = startX + idx * (barW + barGap);
          const hTotal = scaleY(total);
          const hCompleted = scaleY(completed);
          const hPendingInstallment = scaleY(pendingInstallment);
          const hPendingBilling = scaleY(pendingBilling);
          const hPendingQuotation = scaleY(pendingQuotation);
          const yBase = padding.top + innerH;
          const yTotal = yBase - hTotal;
          const yCompleted = yBase - hCompleted;
          const yPendingQuotation = yCompleted - hPendingQuotation;
          const yPendingBilling = yPendingQuotation - hPendingBilling;
          const yPendingInstallment = yPendingBilling - hPendingInstallment;
          const axisLabel =
            groupBy === 'month'
              ? formatMonthLabel(p.bucket)
              : (isOneMonthRange ? formatDayOfMonth(p.bucket) : formatDateShort(p.bucket));
          const hoverLabel =
            groupBy === 'month'
              ? axisLabel
              : (isOneMonthRange ? `${t('dashboard.tooltip.day_prefix', 'วันที่')} ${formatDayOfMonth(p.bucket)}` : axisLabel);

          return (
            <g
              key={p.bucket}
              onMouseEnter={(e) => {
                const rect = chartWrapRef.current?.getBoundingClientRect();
                if (!rect) return;
                const left = Math.max(8, Math.min(rect.width - 8, e.clientX - rect.left));
                const top = Math.max(8, Math.min(rect.height - 8, e.clientY - rect.top));
                setHovered({ left, top, label: hoverLabel, completed, pendingInstallment, pendingBilling, pendingQuotation, total });
              }}
              onMouseMove={(e) => {
                const rect = chartWrapRef.current?.getBoundingClientRect();
                if (!rect) return;
                const left = Math.max(8, Math.min(rect.width - 8, e.clientX - rect.left));
                const top = Math.max(8, Math.min(rect.height - 8, e.clientY - rect.top));
                setHovered({ left, top, label: hoverLabel, completed, pendingInstallment, pendingBilling, pendingQuotation, total });
              }}
              onMouseLeave={() => setHovered(null)}
              onTouchStart={() => setHovered({ left: x + barW / 2, top: yTotal, label: hoverLabel, completed, pendingInstallment, pendingBilling, pendingQuotation, total })}
            >
              <rect x={x} y={yTotal} width={barW} height={hTotal} fill="#e9ecef" rx="4" />
              <rect x={x} y={yCompleted} width={barW} height={hCompleted} fill="#198754" rx="4" />
              <rect x={x} y={yPendingQuotation} width={barW} height={hPendingQuotation} fill="#fd7e14" rx="4" />
              <rect x={x} y={yPendingBilling} width={barW} height={hPendingBilling} fill="#ffc107" rx="4" />
              <rect x={x} y={yPendingInstallment} width={barW} height={hPendingInstallment} fill="#dc3545" rx="4" />
              {(isOneMonthRange && groupBy === 'day'
                ? new Date(`${p.bucket}T00:00:00`).getDate() % 2 === 1
                : idx % Math.ceil(points.length / 10) === 0) && (
                <text
                  x={x + barW / 2}
                  y={height - 18}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#6c757d"
                >
                  {axisLabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  }, [series, groupBy, formatMoney, formatDateShort, formatMonthLabel, formatDayOfMonth, isOneMonthRange, t]);

  const lineChart = useMemo(() => {
    const points = series;
    if (points.length === 0) return null;

    const maxY = Math.max(
      1,
      ...points.flatMap((p) => [
        Number(p.completed_total) || 0,
        Number(p.pending_installment_total) || 0,
        Number(p.pending_billing_total) || 0,
        Number(p.pending_quotation_total) || 0,
      ])
    );

    const width = 920;
    const height = 340;
    const padding = { top: 18, right: 12, bottom: 44, left: 96 };
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;

    const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;
    const xAt = (idx: number) => padding.left + idx * stepX;
    const yAt = (v: number) => padding.top + (1 - v / maxY) * innerH;

    const axisLabelForPoint = (p: SummaryPoint, idx: number) =>
      groupBy === 'month'
        ? formatMonthLabel(p.bucket)
        : (isOneMonthRange ? formatDayOfMonth(p.bucket) : formatDateShort(p.bucket));
    const hoverLabelForPoint = (p: SummaryPoint, idx: number) => {
      const axisLabel = axisLabelForPoint(p, idx);
      return groupBy === 'month'
        ? axisLabel
        : (isOneMonthRange ? `${t('dashboard.tooltip.day_prefix', 'วันที่')} ${formatDayOfMonth(p.bucket)}` : axisLabel);
    };

    const buildPath = (values: number[]) =>
      values
        .map((v, idx) => {
          const x = xAt(idx);
          const y = yAt(v);
          return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
        })
        .join(' ');

    const completedVals = points.map((p) => Number(p.completed_total) || 0);
    const billingVals = points.map((p) => Number(p.pending_billing_total) || 0);
    const quotationVals = points.map((p) => Number(p.pending_quotation_total) || 0);

    const ticks = [0, 0.25, 0.5, 0.75, 1].map((r) => Math.round(maxY * r));

    return (
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="340" role="img" aria-label="Revenue line chart">
        <rect x="0" y="0" width={width} height={height} fill="white" />

        {ticks.map((v) => {
          const y = yAt(v);
          return (
            <g key={v}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#f1f3f5" strokeWidth="1" />
              <text x={padding.left - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#6c757d">
                ฿{formatMoney(v)}
              </text>
            </g>
          );
        })}

        <path d={buildPath(completedVals)} fill="none" stroke="#198754" strokeWidth="2.5" />
        <path d={buildPath(billingVals)} fill="none" stroke="#ffc107" strokeWidth="2.5" />
        <path d={buildPath(quotationVals)} fill="none" stroke="#fd7e14" strokeWidth="2.5" />

        {points.map((p, idx) => {
          const completed = Number(p.completed_total) || 0;
          const pendingInstallment = Number(p.pending_installment_total) || 0;
          const pendingBilling = Number(p.pending_billing_total) || 0;
          const pendingQuotation = Number(p.pending_quotation_total) || 0;
          const x = xAt(idx);
          const axisLabel = axisLabelForPoint(p, idx);
          const hoverLabel = hoverLabelForPoint(p, idx);

          const showAxisLabel =
            (isOneMonthRange && groupBy === 'day'
              ? new Date(`${p.bucket}T00:00:00`).getDate() % 2 === 1
              : idx % Math.ceil(points.length / 10) === 0);

          return (
            <g
              key={p.bucket}
              onMouseEnter={(e) => {
                const rect = lineChartWrapRef.current?.getBoundingClientRect();
                if (!rect) return;
                const left = Math.max(8, Math.min(rect.width - 8, e.clientX - rect.left));
                const top = Math.max(8, Math.min(rect.height - 8, e.clientY - rect.top));
                setHoveredLine({ left, top, label: hoverLabel, completed, pendingInstallment, pendingBilling, pendingQuotation });
              }}
              onMouseMove={(e) => {
                const rect = lineChartWrapRef.current?.getBoundingClientRect();
                if (!rect) return;
                const left = Math.max(8, Math.min(rect.width - 8, e.clientX - rect.left));
                const top = Math.max(8, Math.min(rect.height - 8, e.clientY - rect.top));
                setHoveredLine({ left, top, label: hoverLabel, completed, pendingInstallment, pendingBilling, pendingQuotation });
              }}
              onMouseLeave={() => setHoveredLine(null)}
              onTouchStart={() =>
                setHoveredLine({
                  left: x,
                  top: Math.min(yAt(Math.max(completed, pendingInstallment, pendingBilling, pendingQuotation)), padding.top + innerH),
                  label: hoverLabel,
                  completed,
                  pendingInstallment,
                  pendingBilling,
                  pendingQuotation,
                })
              }
            >
              <circle cx={x} cy={yAt(completed)} r="3.5" fill="#198754" />
              <circle cx={x} cy={yAt(pendingInstallment)} r="3.5" fill="#dc3545" />
              <circle cx={x} cy={yAt(pendingBilling)} r="3.5" fill="#ffc107" />
              <circle cx={x} cy={yAt(pendingQuotation)} r="3.5" fill="#fd7e14" />
              {showAxisLabel && (
                <text x={x} y={height - 18} textAnchor="middle" fontSize="12" fill="#6c757d">
                  {axisLabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  }, [series, groupBy, formatMoney, formatDateShort, formatMonthLabel, formatDayOfMonth, isOneMonthRange, t]);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const range = buildMonthRange(appliedFromMonth, appliedToMonth);
        const res = await api.get<SummaryResponse>('/orders/summary', {
          params: {
            preset: 'custom',
            group_by: groupBy,
            start_date: range?.startDate,
            end_date: range?.endDate,
            pending_kind: pendingKind,
            pending_page: pendingPage,
            pending_per_page: pendingPerPage,
          },
        });
        setData(res.data);
        const serverPage = res.data?.pending_pagination?.page;
        if (typeof serverPage === 'number' && Number.isFinite(serverPage) && serverPage > 0 && serverPage !== pendingPage) {
          setPendingPage(serverPage);
        }
      } catch (e: any) {
        setError(e?.response?.data?.message || t('common.no_data', 'ไม่พบข้อมูล'));
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [appliedFromMonth, appliedToMonth, groupBy, pendingKind, pendingPage, pendingPerPage, t]);

  const totalOrdersCount = (data?.totals.completed_count || 0) + (data?.totals.pending_count || 0);
  const totalOrdersAmount = (data?.totals.completed_total || 0) + (data?.totals.pending_total || 0);
  const avgOrderValue = totalOrdersCount > 0 ? totalOrdersAmount / totalOrdersCount : 0;
  const pendingMeta = data?.pending_pagination;
  const pendingTotalPages = pendingMeta?.total_pages || 1;
  const pendingTotal = pendingMeta?.total ?? (data?.pending_orders?.length || 0);

  const pendingPages = useMemo(() => {
    const total = pendingTotalPages;
    const current = pendingMeta?.page || pendingPage;
    if (total <= 1) return [1];
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const start = Math.max(2, current - 2);
    const end = Math.min(total - 1, current + 2);
    const pages: number[] = [1];
    for (let p = start; p <= end; p += 1) pages.push(p);
    if (!pages.includes(total)) pages.push(total);
    return pages;
  }, [pendingTotalPages, pendingMeta?.page, pendingPage]);

  return (
    <div className="container py-4" style={{ maxWidth: 1400 }}>
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3">
        <div>
          <h2 className="mb-1">{t('dashboard.title', 'แดชบอร์ด')}</h2>
          {data && (
            <div className="text-muted small">
              {t('dashboard.range', 'ช่วงเวลา')}: {formatRangeLabel(data.start_date, data.end_date)}
            </div>
          )}
        </div>
        <div className="d-flex flex-wrap align-items-end gap-2">
          <div>
            <div className="text-muted small mb-1">{t('dashboard.month_from', 'เดือนเริ่มต้น')}</div>
            <div className="d-flex gap-2">
              <select
                className="form-select"
                style={{ width: 150 }}
                value={parseYM(fromMonth)?.month || '01'}
                onChange={(e) => setFromMonth((v) => setYM(v, { month: e.target.value }))}
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <select
                className="form-select"
                style={{ width: 110 }}
                value={parseYM(fromMonth)?.year || String(new Date().getFullYear())}
                onChange={(e) => setFromMonth((v) => setYM(v, { year: e.target.value }))}
              >
                {years.map((y) => (
                  <option key={y.value} value={y.value}>
                    {y.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <div className="text-muted small mb-1">{t('dashboard.month_to', 'เดือนสิ้นสุด')}</div>
            <div className="d-flex gap-2">
              <select
                className="form-select"
                style={{ width: 150 }}
                value={parseYM(toMonth)?.month || '01'}
                onChange={(e) => setToMonth((v) => setYM(v, { month: e.target.value }))}
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <select
                className="form-select"
                style={{ width: 110 }}
                value={parseYM(toMonth)?.year || String(new Date().getFullYear())}
                onChange={(e) => setToMonth((v) => setYM(v, { year: e.target.value }))}
              >
                {years.map((y) => (
                  <option key={y.value} value={y.value}>
                    {y.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              const range = buildMonthRange(fromMonth, toMonth);
              if (!range) return;
              setAppliedFromMonth(range.startKey);
              setAppliedToMonth(range.endKey);
              setPendingPage(1);
            }}
          >
            {t('dashboard.apply_range', 'แสดงผล')}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3 mb-3">
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small">{t('dashboard.completed_total', 'ยอดชำระแล้ว')}</div>
              <div className="fs-4 fw-bold text-success">฿{formatMoney(data?.totals.completed_total || 0)}</div>
              <div className="small text-muted">{t('dashboard.completed_count', 'จำนวนรายการ')}: {data?.totals.completed_count || 0}</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small">{t('dashboard.pending_total', 'ยอดรอชำระ')}</div>
              <div className="fs-4 fw-bold text-warning">฿{formatMoney(data?.totals.pending_total || 0)}</div>
              <div className="small text-muted">{t('dashboard.pending_count', 'จำนวนรายการ')}: {data?.totals.pending_count || 0}</div>
              {data && (
                <div className="small mt-2">
                  <div className="text-muted d-flex align-items-center gap-2">
                    <span className="d-inline-block rounded" style={{ width: 10, height: 10, background: '#ffc107' }} />
                    <span>{t('dashboard.pending_billing_note', 'รอชำระ')}:</span>
                    <span className="fw-semibold">฿{formatMoney(data.totals.pending_billing_total || 0)}</span>
                  </div>
                  <div className="text-muted d-flex align-items-center gap-2">
                    <span className="d-inline-block rounded" style={{ width: 10, height: 10, background: '#dc3545' }} />
                    <span>{t('orders.installment', 'ผ่อนชำระ')}:</span>
                    <span className="fw-semibold">฿{formatMoney(data.totals.pending_installment_total || 0)}</span>
                  </div>
                  <div className="text-muted d-flex align-items-center gap-2">
                    <span className="d-inline-block rounded" style={{ width: 10, height: 10, background: '#fd7e14' }} />
                    <span>{t('dashboard.pending_quotation', 'ใบเสนอราคา')}:</span>
                    <span className="fw-semibold">฿{formatMoney(data.totals.pending_quotation_total || 0)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small">{t('dashboard.total_orders', 'จำนวนออเดอร์ทั้งหมด')}</div>
              <div className="fs-4 fw-bold">{totalOrdersCount.toLocaleString('en-US')}</div>
              <div className="small text-muted">{t('dashboard.avg_order_value', 'ค่าเฉลี่ย/ออเดอร์')}: ฿{formatMoney(avgOrderValue)}</div>
              <div className="small text-muted mt-2 d-flex flex-wrap gap-2">
                <span className="d-inline-flex align-items-center gap-2">
                  <span className="d-inline-block rounded" style={{ width: 10, height: 10, background: '#198754' }} />
                  <span>{t('dashboard.legend_completed', 'ชำระแล้ว')}: {data?.totals.completed_count || 0}</span>
                </span>
                <span className="d-inline-flex align-items-center gap-2">
                  <span className="d-inline-block rounded" style={{ width: 10, height: 10, background: '#ffc107' }} />
                  <span>{t('dashboard.legend_billing_note', 'รอชำระ')}: {data?.totals.pending_billing_count || 0}</span>
                </span>
                <span className="d-inline-flex align-items-center gap-2">
                  <span className="d-inline-block rounded" style={{ width: 10, height: 10, background: '#dc3545' }} />
                  <span>{t('orders.installment', 'ผ่อนชำระ')}: {data?.totals.pending_installment_count || 0}</span>
                </span>
                <span className="d-inline-flex align-items-center gap-2">
                  <span className="d-inline-block rounded" style={{ width: 10, height: 10, background: '#fd7e14' }} />
                  <span>{t('dashboard.legend_quotation', 'ใบเสนอราคา')}: {data?.totals.pending_quotation_count || 0}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-2">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h5 className="mb-0">
                  {t('dashboard.chart_title', 'กราฟรายรับ (ชำระแล้ว/รอชำระ)')}
                </h5>
                <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => navigate('/orders')}>
                  {t('dashboard.go_orders', 'ไปหน้ารายการสั่งซื้อ')}
                </button>
              </div>
              <div className="d-flex align-items-center gap-3 mb-2 flex-wrap">
                <div className="d-flex align-items-center gap-2">
                  <span className="d-inline-block rounded" style={{ width: 12, height: 12, background: '#198754' }} />
                  <span className="small text-muted">{t('dashboard.legend_completed', 'ชำระแล้ว')}</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="d-inline-block rounded" style={{ width: 12, height: 12, background: '#ffc107' }} />
                  <span className="small text-muted">{t('dashboard.legend_billing_note', 'รอชำระ')}</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="d-inline-block rounded" style={{ width: 12, height: 12, background: '#dc3545' }} />
                  <span className="small text-muted">{t('orders.installment', 'ผ่อนชำระ')}</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="d-inline-block rounded" style={{ width: 12, height: 12, background: '#fd7e14' }} />
                  <span className="small text-muted">{t('dashboard.legend_quotation', 'ใบเสนอราคา')}</span>
                </div>
              </div>
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status" />
                </div>
              ) : series.length === 0 ? (
                <div className="text-muted py-4 text-center">{t('common.no_data', 'ไม่พบข้อมูล')}</div>
              ) : (
                <div
                  ref={chartWrapRef}
                  style={{ overflowX: 'auto', position: 'relative' }}
                  onMouseLeave={() => setHovered(null)}
                  onTouchEnd={() => setHovered(null)}
                >
                  {chart}
                  {hovered && (
                    <div
                      className="shadow-sm bg-dark text-white rounded px-2 py-1"
                      style={{
                        position: 'absolute',
                        left: hovered.left,
                        top: hovered.top,
                        transform: hovered.top < 90 ? 'translate(-50%, 12px)' : 'translate(-50%, -120%)',
                        pointerEvents: 'none',
                        maxWidth: 260,
                        fontSize: 12,
                        lineHeight: 1.35,
                        zIndex: 10,
                        whiteSpace: 'pre-line',
                      }}
                    >
                      <div className="fw-semibold">{hovered.label}</div>
                      <div>{t('dashboard.tooltip.completed', 'ชำระแล้ว')}: ฿{formatMoney(hovered.completed)}</div>
                      <div>{t('dashboard.tooltip.billing_note', 'รอชำระ')}: ฿{formatMoney(hovered.pendingBilling)}</div>
                      <div>{t('orders.installment', 'ผ่อนชำระ')}: ฿{formatMoney(hovered.pendingInstallment)}</div>
                      <div>{t('dashboard.tooltip.quotation', 'ใบเสนอราคา')}: ฿{formatMoney(hovered.pendingQuotation)}</div>
                      <div className="opacity-75">{t('dashboard.tooltip.total', 'รวม')}: ฿{formatMoney(hovered.total)}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-2">
              <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-2">
                <h5 className="mb-0 flex-grow-1" style={{ minWidth: 260 }}>
                  {t('dashboard.line_chart_title', 'กราฟเส้น (ชำระแล้ว/รอชำระ/ผ่อนชำระ/ใบเสนอราคา)')}
                </h5>
                <div
                  className="d-flex flex-column align-items-end flex-shrink-0 ms-auto"
                  style={{ fontSize: 14, lineHeight: 1.25, minWidth: 190, whiteSpace: 'nowrap' }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <span className="d-inline-block rounded-circle" style={{ width: 10, height: 10, background: '#198754' }} />
                    <span className="fw-semibold text-success">฿{formatMoney(lineIndicator.completedSum)}</span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="d-inline-block rounded-circle" style={{ width: 10, height: 10, background: '#ffc107' }} />
                    <span className="fw-semibold" style={{ color: '#8a6d00' }}>฿{formatMoney(lineIndicator.billingSum)}</span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="d-inline-block rounded-circle" style={{ width: 10, height: 10, background: '#dc3545' }} />
                    <span className="fw-semibold text-danger">฿{formatMoney(lineIndicator.installmentSum)}</span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="d-inline-block rounded-circle" style={{ width: 10, height: 10, background: '#fd7e14' }} />
                    <span className="fw-semibold" style={{ color: '#b24a00' }}>฿{formatMoney(lineIndicator.quotationSum)}</span>
                  </div>
                </div>
              </div>
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status" />
                </div>
              ) : series.length === 0 ? (
                <div className="text-muted py-4 text-center">{t('common.no_data', 'ไม่พบข้อมูล')}</div>
              ) : (
                <div
                  ref={lineChartWrapRef}
                  style={{ overflowX: 'auto', position: 'relative' }}
                  onMouseLeave={() => setHoveredLine(null)}
                  onTouchEnd={() => setHoveredLine(null)}
                >
                  {lineChart}
                  {hoveredLine && (
                    <div
                      className="shadow-sm bg-dark text-white rounded px-2 py-1"
                      style={{
                        position: 'absolute',
                        left: hoveredLine.left,
                        top: hoveredLine.top,
                        transform: hoveredLine.top < 90 ? 'translate(-50%, 12px)' : 'translate(-50%, -120%)',
                        pointerEvents: 'none',
                        maxWidth: 260,
                        fontSize: 12,
                        lineHeight: 1.35,
                        zIndex: 10,
                        whiteSpace: 'pre-line',
                      }}
                    >
                      <div className="fw-semibold">{hoveredLine.label}</div>
                      <div>{t('dashboard.tooltip.completed', 'ชำระแล้ว')}: ฿{formatMoney(hoveredLine.completed)}</div>
                      <div>{t('dashboard.tooltip.billing_note', 'รอชำระ')}: ฿{formatMoney(hoveredLine.pendingBilling)}</div>
                      <div>{t('orders.installment', 'ผ่อนชำระ')}: ฿{formatMoney(hoveredLine.pendingInstallment)}</div>
                      <div>{t('dashboard.tooltip.quotation', 'ใบเสนอราคา')}: ฿{formatMoney(hoveredLine.pendingQuotation)}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
            <div className="d-flex flex-wrap align-items-end gap-3">
              <h5 className="mb-0">{t('dashboard.pending_list', 'รายการรอชำระล่าสุด')}</h5>
              <ul className="nav nav-tabs" style={{ borderBottom: 0 }}>
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${pendingKind === 'all' ? 'active' : ''}`}
                    onClick={() => {
                      setPendingKind('all');
                      setPendingPage(1);
                    }}
                  >
                    {t('common.all', 'ทั้งหมด')}
                    <span className="badge bg-secondary ms-2">{data?.totals.pending_count || 0}</span>
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${pendingKind === 'billing_note' ? 'active' : ''}`}
                    onClick={() => {
                      setPendingKind('billing_note');
                      setPendingPage(1);
                    }}
                  >
                    {t('dashboard.kind.billing_note', 'รอชำระ')}
                    <span className="badge ms-2 text-dark" style={{ background: '#ffc107' }}>
                      {data?.totals.pending_billing_count || 0}
                    </span>
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${pendingKind === 'installment' ? 'active' : ''}`}
                    onClick={() => {
                      setPendingKind('installment');
                      setPendingPage(1);
                    }}
                  >
                    {t('orders.installment', 'ผ่อนชำระ')}
                    <span className="badge ms-2 text-white" style={{ background: '#dc3545' }}>
                      {data?.totals.pending_installment_count || 0}
                    </span>
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${pendingKind === 'quotation' ? 'active' : ''}`}
                    onClick={() => {
                      setPendingKind('quotation');
                      setPendingPage(1);
                    }}
                  >
                    {t('dashboard.kind.quotation', 'ใบเสนอราคา')}
                    <span className="badge ms-2 text-white" style={{ background: '#fd7e14' }}>
                      {data?.totals.pending_quotation_count || 0}
                    </span>
                  </button>
                </li>
              </ul>
            </div>
            <div className="d-flex align-items-center gap-2">
              <div className="text-muted small">{t('dashboard.per_page', 'ต่อหน้า')}</div>
              <select
                className="form-select form-select-sm"
                style={{ width: 90 }}
                value={pendingPerPage}
                onChange={(e) => {
                  const next = Number(e.target.value) as 5 | 10 | 25 | 50;
                  setPendingPerPage(next);
                  setPendingPage(1);
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
          {!data || data.pending_orders.length === 0 ? (
            <div className="text-muted py-4 text-center">{t('dashboard.no_pending', 'ไม่มีรายการรอชำระในช่วงนี้')}</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 90 }}>#</th>
                    <th style={{ width: 120 }}>{t('dashboard.pending_kind', 'ประเภท')}</th>
                    <th>{t('orders.customer', 'ลูกค้า')}</th>
                    <th style={{ width: 170 }}>{t('orders.date', 'วันที่')}</th>
                    <th style={{ width: 140 }} className="text-end">{t('orders.total', 'ยอดรวม')}</th>
                    <th style={{ width: 140 }} className="text-end">{t('dashboard.document', 'เอกสาร')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pending_orders.map((o) => (
                    <tr
                      key={o.id}
                      role="button"
                      tabIndex={0}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/orders/${o.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') navigate(`/orders/${o.id}`);
                      }}
                    >
                      <td className="fw-semibold">#{o.id}</td>
                      <td>
                        <span
                          className={`badge ${o.pending_kind === 'billing_note' ? 'text-dark' : ''}`}
                          style={{
                            background: (() => {
                              if (o.pending_kind === 'installment') return '#dc3545';
                              return o.pending_kind === 'billing_note' ? '#ffc107' : '#fd7e14';
                            })(),
                          }}
                        >
                          {(() => {
                            if (o.pending_kind === 'installment') return t('orders.installment', 'ผ่อนชำระ');
                            return o.pending_kind === 'billing_note'
                              ? t('dashboard.kind.billing_note', 'รอชำระ')
                              : t('dashboard.kind.quotation', 'ใบเสนอราคา');
                          })()}
                        </span>
                      </td>
                      <td>{o.customer_name || t('pos.walk_in', 'ลูกค้าหน้าร้าน')}</td>
                      <td className="text-muted">
                        {formatDateLong(o.created_at)}
                      </td>
                      <td className="text-end fw-semibold">฿{formatMoney(o.total)}</td>
                      <td className="text-end">
                        {o.pending_kind === 'installment' || !o.document_type ? (
                          <span className="text-muted small">-</span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDocument(o);
                            }}
                            title={o.document_number ? String(o.document_number) : undefined}
                            aria-label={t('dashboard.view_document', 'ดูเอกสาร')}
                          >
                            <i className="bi bi-printer" style={{ fontSize: '1.25rem', lineHeight: 1 }} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-2">
                <div className="text-muted small">
                  {pendingTotal > 0 ? (
                    <>
                      {t('dashboard.showing', 'แสดง')}
                      {' '}
                      {((pendingMeta?.page || pendingPage) - 1) * (pendingMeta?.per_page || pendingPerPage) + 1}
                      {' '}
                      {t('dashboard.to', 'ถึง')}
                      {' '}
                      {((pendingMeta?.page || pendingPage) - 1) * (pendingMeta?.per_page || pendingPerPage) + (data.pending_orders.length || 0)}
                      {' '}
                      {t('dashboard.of', 'จาก')}
                      {' '}
                      {pendingTotal}
                    </>
                  ) : (
                    t('common.no_data', 'ไม่พบข้อมูล')
                  )}
                </div>
                {pendingTotalPages > 1 && (
                  <nav aria-label="Pending pagination">
                    <ul className="pagination pagination-sm mb-0">
                      <li className={`page-item ${(pendingMeta?.page || pendingPage) <= 1 ? 'disabled' : ''}`}>
                        <button
                          type="button"
                          className="page-link"
                          onClick={() => setPendingPage((p) => Math.max(1, p - 1))}
                          disabled={(pendingMeta?.page || pendingPage) <= 1}
                        >
                          {t('common.previous', 'ก่อนหน้า')}
                        </button>
                      </li>
                      {pendingPages.map((p, idx) => {
                        const prev = pendingPages[idx - 1];
                        const needEllipsis = typeof prev === 'number' && p - prev > 1;
                        return (
                          <React.Fragment key={p}>
                            {needEllipsis && (
                              <li className="page-item disabled">
                                <span className="page-link">…</span>
                              </li>
                            )}
                            <li className={`page-item ${(pendingMeta?.page || pendingPage) === p ? 'active' : ''}`}>
                              <button type="button" className="page-link" onClick={() => setPendingPage(p)}>
                                {p}
                              </button>
                            </li>
                          </React.Fragment>
                        );
                      })}
                      <li className={`page-item ${(pendingMeta?.page || pendingPage) >= pendingTotalPages ? 'disabled' : ''}`}>
                        <button
                          type="button"
                          className="page-link"
                          onClick={() => setPendingPage((p) => Math.min(pendingTotalPages, p + 1))}
                          disabled={(pendingMeta?.page || pendingPage) >= pendingTotalPages}
                        >
                          {t('common.next', 'ถัดไป')}
                        </button>
                      </li>
                    </ul>
                  </nav>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
