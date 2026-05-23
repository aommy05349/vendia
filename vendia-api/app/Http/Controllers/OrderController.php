<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderPayment;
use App\Models\Product;
use App\Models\Document;
use App\Models\DocumentCounter;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    private function installmentDueDate(Carbon $startDate, int $dueDay, int $monthOffset): Carbon
    {
        $anchor = Carbon::create($startDate->year, $startDate->month, 1)->addMonths($monthOffset);
        $lastDay = (int) $anchor->copy()->endOfMonth()->day;
        $day = min(max(1, $dueDay), $lastDay);
        return Carbon::create($anchor->year, $anchor->month, $day)->startOfDay();
    }

    private function installmentExpectedAmount(
        float $orderTotal,
        float $downPayment,
        int $installmentCount,
        float $installmentAmount,
        int $no
    ): float {
        if ($no === 0) return round($downPayment, 2);
        if ($installmentCount <= 0) return 0.0;
        $installmentTotal = round(max(0.0, $orderTotal - $downPayment), 2);
        $base = round(max(0.0, $installmentAmount), 2);
        $lastAmount = round(max(0.0, $installmentTotal - $base * max(0, $installmentCount - 1)), 2);
        if ($no === $installmentCount) return $lastAmount;
        return $base;
    }

    private function installmentDueAmountInRange(Order $order, Carbon $start, Carbon $end): float
    {
        $plan = $order->paymentPlan;
        if (!$plan) return 0.0;
        $planStatus = (string) ($plan->status ?? 'active');
        if ($planStatus === 'cancelled' || $planStatus === 'completed') return 0.0;

        $orderTotal = (float) ($plan->total ?? $order->total ?? 0);
        $down = (float) ($plan->down_payment ?? 0);
        $count = (int) ($plan->installment_count ?? 0);
        $amount = (float) ($plan->installment_amount ?? 0);

        $startDate = $plan->start_date
            ? Carbon::parse($plan->start_date)->startOfDay()
            : Carbon::parse($order->created_at)->startOfDay();
        $dueDay = $plan->due_day !== null ? (int) $plan->due_day : (int) $startDate->day;

        $paidNos = [];
        foreach (($order->payments ?? []) as $p) {
            if ($p->installment_no === null) continue;
            $paidNos[(int) $p->installment_no] = true;
        }

        $sum = 0.0;
        if ($down > 0) {
            if (!isset($paidNos[0]) && $startDate->betweenIncluded($start, $end)) {
                $sum += $this->installmentExpectedAmount($orderTotal, $down, $count, $amount, 0);
            }
        }

        for ($i = 1; $i <= $count; $i += 1) {
            if (isset($paidNos[$i])) continue;
            $due = $this->installmentDueDate($startDate, $dueDay, $i - 1);
            if (!$due->betweenIncluded($start, $end)) continue;
            $sum += $this->installmentExpectedAmount($orderTotal, $down, $count, $amount, $i);
        }

        return round($sum, 2);
    }

    private function installmentShouldShowInRange(Order $order, Carbon $end): bool
    {
        $plan = $order->paymentPlan;
        if (!$plan) return true;

        $planStatus = (string) ($plan->status ?? 'active');
        if ($planStatus === 'cancelled' || $planStatus === 'completed') return false;

        $total = (float) ($plan->total ?? $order->total ?? 0);
        $paid = (float) ($order->payments?->sum('amount') ?? 0);
        if (round($total - $paid, 2) <= 0) return false;

        $paidNos = [];
        foreach (($order->payments ?? []) as $p) {
            if ($p->installment_no === null) continue;
            $paidNos[(int) $p->installment_no] = true;
        }

        $startDate = $plan->start_date
            ? Carbon::parse($plan->start_date)->startOfDay()
            : Carbon::parse($order->created_at)->startOfDay();
        $dueDay = $plan->due_day !== null ? (int) $plan->due_day : (int) $startDate->day;

        $down = (float) ($plan->down_payment ?? 0);
        if ($down > 0) {
            if (!isset($paidNos[0]) && $startDate->lessThanOrEqualTo($end)) return true;
        }

        $count = (int) ($plan->installment_count ?? 0);
        for ($i = 1; $i <= $count; $i += 1) {
            $due = $this->installmentDueDate($startDate, $dueDay, $i - 1);
            if ($due->greaterThan($end)) break;
            if (!isset($paidNos[$i])) return true;
        }

        return false;
    }

    public function dailySales(Request $request)
    {
        $date = $request->input('date', date('Y-m-d'));
        
        $orders = Order::whereDate('created_at', $date)
            ->where('status', 'completed')
            ->get();
            
        $total = $orders->sum('total');
        $count = $orders->count();
        $cash = $orders->where('payment_method', 'cash')->sum('total');
        $transfer = $orders->where('payment_method', 'transfer')->sum('total');
        
        return response()->json([
            'date' => $date,
            'total' => $total,
            'count' => $count,
            'breakdown' => [
                'cash' => $cash,
                'transfer' => $transfer
            ]
        ]);
    }

    public function reminders(Request $request)
    {
        $validated = $request->validate([
            'scope' => 'sometimes|in:all,range',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date',
            'include_orders' => 'sometimes|boolean',
        ]);

        $scope = (string) ($validated['scope'] ?? 'all');
        $includeOrders = (bool) ($validated['include_orders'] ?? false);

        $start = null;
        $end = null;
        if ($scope === 'range') {
            $now = Carbon::now();
            $start = isset($validated['start_date'])
                ? Carbon::parse($validated['start_date'])->startOfDay()
                : $now->copy()->startOfMonth()->startOfDay();
            $end = isset($validated['end_date'])
                ? Carbon::parse($validated['end_date'])->endOfDay()
                : $now->copy()->endOfDay();

            if ($start->greaterThan($end)) {
                [$start, $end] = [$end->copy()->startOfDay(), $start->copy()->endOfDay()];
            }
        }

        $billingUnpaidBase = Order::query()
            ->whereIn('status', ['pending', 'quotation'])
            ->whereNotNull('billing_note_number')
            ->where('billing_note_status', 'active');
        if ($scope === 'range' && $start && $end) {
            $billingUnpaidBase->whereBetween('created_at', [$start, $end]);
        }
        $billingUnpaidCount = (int) (clone $billingUnpaidBase)->count();
        $billingUnpaidTotal = (float) (clone $billingUnpaidBase)->sum('total');
        $billingUnpaidTopCustomers = DB::table('orders as o')
            ->leftJoin('customers as c', 'o.customer_id', '=', 'c.id')
            ->whereIn('o.status', ['pending', 'quotation'])
            ->whereNotNull('o.billing_note_number')
            ->where('o.billing_note_status', 'active')
            ->when($scope === 'range' && $start && $end, function ($q) use ($start, $end) {
                $q->whereBetween('o.created_at', [$start, $end]);
            })
            ->selectRaw('o.customer_id as customer_id')
            ->selectRaw('c.is_company as is_company')
            ->selectRaw('c.company_name as company_name')
            ->selectRaw('c.name as name')
            ->selectRaw('COUNT(*) as count')
            ->selectRaw('SUM(o.total) as total')
            ->groupBy('o.customer_id', 'c.is_company', 'c.company_name', 'c.name')
            ->orderByDesc('total')
            ->limit(10)
            ->get()
            ->map(function ($r) {
                $customerName = $r->company_name ?: ($r->name ?: null);
                return [
                    'customer_id' => $r->customer_id !== null ? (int) $r->customer_id : null,
                    'customer_name' => $customerName ? (string) $customerName : null,
                    'customer_is_company' => $r->is_company !== null ? (bool) $r->is_company : null,
                    'count' => (int) ($r->count ?? 0),
                    'total' => (float) ($r->total ?? 0),
                ];
            })
            ->values();

        $billingOrders = collect();
        if ($includeOrders) {
            $customerIds = $billingUnpaidTopCustomers
                ->pluck('customer_id')
                ->filter(fn ($v) => $v !== null)
                ->map(fn ($v) => (int) $v)
                ->values()
                ->all();

            $billingOrdersQuery = Order::query()
                ->select(['id', 'customer_id', 'created_at', 'total', 'billing_note_number'])
                ->whereIn('status', ['pending', 'quotation'])
                ->whereNotNull('billing_note_number')
                ->where('billing_note_status', 'active')
                ->orderByDesc('created_at')
                ->orderByDesc('id');

            $billingOrdersQuery->where(function ($q) use ($customerIds) {
                if (count($customerIds) > 0) {
                    $q->whereIn('customer_id', $customerIds);
                }
                $q->orWhereNull('customer_id');
            });

            if ($scope === 'range' && $start && $end) {
                $billingOrdersQuery->whereBetween('created_at', [$start, $end]);
            }

            $billingOrders = $billingOrdersQuery
                ->limit(200)
                ->get()
                ->map(function ($o) {
                    return [
                        'id' => (int) $o->id,
                        'customer_id' => $o->customer_id !== null ? (int) $o->customer_id : null,
                        'created_at' => $o->created_at,
                        'total' => (float) ($o->total ?? 0),
                        'billing_note_number' => $o->billing_note_number ? (string) $o->billing_note_number : null,
                    ];
                })
                ->values();
        }

        $missingReceiptBase = Order::query()
            ->where('status', 'completed')
            ->where(function ($q) {
                $q->whereNull('receipt_number')
                    ->orWhereNull('receipt_status')
                    ->orWhere('receipt_status', '!=', 'active');
            });
        if ($scope === 'range' && $start && $end) {
            $missingReceiptBase->whereBetween('created_at', [$start, $end]);
        }
        $missingReceiptCount = (int) (clone $missingReceiptBase)->count();
        $missingReceiptTotal = (float) (clone $missingReceiptBase)->sum('total');
        $missingReceiptTopCustomers = DB::table('orders as o')
            ->leftJoin('customers as c', 'o.customer_id', '=', 'c.id')
            ->where('o.status', 'completed')
            ->where(function ($q) {
                $q->whereNull('o.receipt_number')
                    ->orWhereNull('o.receipt_status')
                    ->orWhere('o.receipt_status', '!=', 'active');
            })
            ->when($scope === 'range' && $start && $end, function ($q) use ($start, $end) {
                $q->whereBetween('o.created_at', [$start, $end]);
            })
            ->selectRaw('o.customer_id as customer_id')
            ->selectRaw('c.is_company as is_company')
            ->selectRaw('c.company_name as company_name')
            ->selectRaw('c.name as name')
            ->selectRaw('COUNT(*) as count')
            ->selectRaw('SUM(o.total) as total')
            ->groupBy('o.customer_id', 'c.is_company', 'c.company_name', 'c.name')
            ->orderByDesc('total')
            ->limit(10)
            ->get()
            ->map(function ($r) {
                $customerName = $r->company_name ?: ($r->name ?: null);
                return [
                    'customer_id' => $r->customer_id !== null ? (int) $r->customer_id : null,
                    'customer_name' => $customerName ? (string) $customerName : null,
                    'customer_is_company' => $r->is_company !== null ? (bool) $r->is_company : null,
                    'count' => (int) ($r->count ?? 0),
                    'total' => (float) ($r->total ?? 0),
                ];
            })
            ->values();

        $missingReceiptOrders = collect();
        if ($includeOrders) {
            $customerIds = $missingReceiptTopCustomers
                ->pluck('customer_id')
                ->filter(fn ($v) => $v !== null)
                ->map(fn ($v) => (int) $v)
                ->values()
                ->all();

            $missingReceiptOrdersQuery = Order::query()
                ->select(['id', 'customer_id', 'created_at', 'total', 'receipt_number', 'receipt_status'])
                ->where('status', 'completed')
                ->where(function ($q) {
                    $q->whereNull('receipt_number')
                        ->orWhereNull('receipt_status')
                        ->orWhere('receipt_status', '!=', 'active');
                })
                ->orderByDesc('created_at')
                ->orderByDesc('id');

            $missingReceiptOrdersQuery->where(function ($q) use ($customerIds) {
                if (count($customerIds) > 0) {
                    $q->whereIn('customer_id', $customerIds);
                }
                $q->orWhereNull('customer_id');
            });

            if ($scope === 'range' && $start && $end) {
                $missingReceiptOrdersQuery->whereBetween('created_at', [$start, $end]);
            }

            $missingReceiptOrders = $missingReceiptOrdersQuery
                ->limit(200)
                ->get()
                ->map(function ($o) {
                    return [
                        'id' => (int) $o->id,
                        'customer_id' => $o->customer_id !== null ? (int) $o->customer_id : null,
                        'created_at' => $o->created_at,
                        'total' => (float) ($o->total ?? 0),
                        'receipt_number' => $o->receipt_number ? (string) $o->receipt_number : null,
                        'receipt_status' => $o->receipt_status ? (string) $o->receipt_status : null,
                    ];
                })
                ->values();
        }

        return response()->json([
            'scope' => $scope,
            'start_date' => $scope === 'range' && $start ? $start->toDateString() : null,
            'end_date' => $scope === 'range' && $end ? $end->toDateString() : null,
            'billing_unpaid' => [
                'total' => $billingUnpaidTotal,
                'count' => $billingUnpaidCount,
                'top_customers' => $billingUnpaidTopCustomers,
                'orders' => $billingOrders,
            ],
            'missing_receipt' => [
                'total' => $missingReceiptTotal,
                'count' => $missingReceiptCount,
                'top_customers' => $missingReceiptTopCustomers,
                'orders' => $missingReceiptOrders,
            ],
        ]);
    }

    public function summary(Request $request)
    {
        $validated = $request->validate([
            'preset' => 'sometimes|in:today,this_month,last_3_months,last_6_months,last_12_months,custom',
            'group_by' => 'sometimes|in:day,month',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date',
            'pending_kind' => 'sometimes|in:all,billing_note,installment,quotation',
            'reminders_scope' => 'sometimes|in:all,range',
            'pending_limit' => 'sometimes|integer|min:0|max:200',
            'pending_page' => 'sometimes|integer|min:1|max:10000',
            'pending_per_page' => 'sometimes|integer|in:5,10,25,50',
        ]);

        $preset = $validated['preset'] ?? 'this_month';
        $groupBy = $validated['group_by'] ?? ($preset === 'today' ? 'day' : 'day');

        $now = Carbon::now();
        if ($preset === 'today') {
            $start = $now->copy()->startOfDay();
            $end = $now->copy()->endOfDay();
        } elseif ($preset === 'this_month') {
            $start = $now->copy()->startOfMonth()->startOfDay();
            $end = $now->copy()->endOfMonth()->endOfDay();
        } elseif ($preset === 'last_3_months') {
            $start = $now->copy()->subMonthsNoOverflow(2)->startOfMonth()->startOfDay();
            $end = $now->copy()->endOfDay();
        } elseif ($preset === 'last_6_months') {
            $start = $now->copy()->subMonthsNoOverflow(5)->startOfMonth()->startOfDay();
            $end = $now->copy()->endOfDay();
        } elseif ($preset === 'last_12_months') {
            $start = $now->copy()->subMonthsNoOverflow(11)->startOfMonth()->startOfDay();
            $end = $now->copy()->endOfDay();
        } else {
            $start = isset($validated['start_date'])
                ? Carbon::parse($validated['start_date'])->startOfDay()
                : $now->copy()->startOfMonth()->startOfDay();
            $end = isset($validated['end_date'])
                ? Carbon::parse($validated['end_date'])->endOfDay()
                : $now->copy()->endOfDay();
        }

        if ($start->greaterThan($end)) {
            [$start, $end] = [$end->copy()->startOfDay(), $start->copy()->endOfDay()];
        }

        $buckets = [];
        if ($groupBy === 'month') {
            $cursor = $start->copy()->startOfMonth();
            $endCursor = $end->copy()->startOfMonth();
            while ($cursor->lessThanOrEqualTo($endCursor)) {
                $key = $cursor->format('Y-m-01');
                $buckets[] = [
                    'bucket' => $key,
                    'label' => $cursor->format('Y-m'),
                ];
                $cursor->addMonthNoOverflow();
            }
        } else {
            $cursor = $start->copy()->startOfDay();
            $endCursor = $end->copy()->startOfDay();
            while ($cursor->lessThanOrEqualTo($endCursor)) {
                $key = $cursor->format('Y-m-d');
                $buckets[] = [
                    'bucket' => $key,
                    'label' => $cursor->format('Y-m-d'),
                ];
                $cursor->addDay();
            }
        }

        $bucketMap = [];
        foreach ($buckets as $b) {
            $bucketMap[$b['bucket']] = [
                'completed_total' => 0.0,
                'completed_count' => 0,
                'pending_installment_total' => 0.0,
                'pending_installment_count' => 0,
                'pending_billing_total' => 0.0,
                'pending_billing_count' => 0,
                'pending_quotation_total' => 0.0,
                'pending_quotation_count' => 0,
            ];
        }

        $bucketFormat = $groupBy === 'month' ? 'Y-m-01' : 'Y-m-d';
        Order::query()
            ->select(['id', 'created_at', 'total', 'status', 'payment_method', 'billing_note_number', 'billing_note_status'])
            ->with([
                'paymentPlan:id,order_id,total,down_payment,installment_count,installment_amount,start_date,due_day,status',
                'payments:id,order_id,installment_no,amount,paid_at',
            ])
            ->whereBetween('created_at', [$start, $end])
            ->whereIn('status', ['completed', 'pending', 'quotation'])
            ->orderBy('created_at')
            ->orderBy('id')
            ->chunk(250, function ($orders) use (&$bucketMap, $bucketFormat, $start, $end) {
                foreach ($orders as $o) {
                    $bucketKey = Carbon::parse($o->created_at)->format($bucketFormat);
                    if (!isset($bucketMap[$bucketKey])) continue;

                    if ((string) $o->status === 'completed') {
                        $isInstallment = (string) ($o->payment_method ?? '') === 'installment' || $o->paymentPlan;
                        if (!$isInstallment) {
                            $bucketMap[$bucketKey]['completed_total'] += (float) ($o->total ?? 0);
                            $bucketMap[$bucketKey]['completed_count'] += 1;
                        }
                        continue;
                    }

                    $isInstallment = (string) ($o->payment_method ?? '') === 'installment' || $o->paymentPlan;
                    if ($isInstallment) {
                        $plan = $o->paymentPlan;
                        if ($plan) {
                            $planStatus = (string) ($plan->status ?? 'active');
                            if ($planStatus !== 'cancelled' && $planStatus !== 'completed') {
                                $startDate = $plan->start_date
                                    ? Carbon::parse($plan->start_date)->startOfDay()
                                    : Carbon::parse($o->created_at)->startOfDay();
                                $dueDay = $plan->due_day !== null ? (int) $plan->due_day : (int) $startDate->day;
                                $down = (float) ($plan->down_payment ?? 0);
                                $count = (int) ($plan->installment_count ?? 0);
                                $amount = (float) ($plan->installment_amount ?? 0);
                                $orderTotal = (float) ($plan->total ?? $o->total ?? 0);

                                $paidNos = [];
                                foreach (($o->payments ?? []) as $p) {
                                    if ($p->installment_no === null) continue;
                                    $paidNos[(int) $p->installment_no] = true;
                                }

                                $countedKeys = [];
                                if ($down > 0 && !isset($paidNos[0])) {
                                    $due = $startDate;
                                    if ($due->betweenIncluded($start, $end)) {
                                        $k = $due->format($bucketFormat);
                                        if (isset($bucketMap[$k])) {
                                            $v = $this->installmentExpectedAmount($orderTotal, $down, $count, $amount, 0);
                                            if ($v > 0) {
                                                $bucketMap[$k]['pending_installment_total'] += $v;
                                                $countedKeys[$k] = true;
                                            }
                                        }
                                    }
                                }

                                for ($i = 1; $i <= $count; $i += 1) {
                                    if (isset($paidNos[$i])) continue;
                                    $due = $this->installmentDueDate($startDate, $dueDay, $i - 1);
                                    if (!$due->betweenIncluded($start, $end)) continue;
                                    $k = $due->format($bucketFormat);
                                    if (!isset($bucketMap[$k])) continue;
                                    $v = $this->installmentExpectedAmount($orderTotal, $down, $count, $amount, $i);
                                    if ($v <= 0) continue;
                                    $bucketMap[$k]['pending_installment_total'] += $v;
                                    $countedKeys[$k] = true;
                                }

                                foreach (array_keys($countedKeys) as $k) {
                                    $bucketMap[$k]['pending_installment_count'] += 1;
                                }
                            }
                        }
                        continue;
                    }

                    $hasActiveBilling = (bool) ($o->billing_note_number && (string) $o->billing_note_status === 'active');
                    if ($hasActiveBilling) {
                        $bucketMap[$bucketKey]['pending_billing_total'] += (float) ($o->total ?? 0);
                        $bucketMap[$bucketKey]['pending_billing_count'] += 1;
                    } else {
                        $bucketMap[$bucketKey]['pending_quotation_total'] += (float) ($o->total ?? 0);
                        $bucketMap[$bucketKey]['pending_quotation_count'] += 1;
                    }
                }
            });

        OrderPayment::query()
            ->select(['id', 'order_id', 'amount', 'paid_at'])
            ->whereBetween('paid_at', [$start, $end])
            ->orderBy('paid_at')
            ->orderBy('id')
            ->chunk(500, function ($payments) use (&$bucketMap, $bucketFormat) {
                foreach ($payments as $p) {
                    if (!$p->paid_at) continue;
                    $bucketKey = Carbon::parse($p->paid_at)->format($bucketFormat);
                    if (!isset($bucketMap[$bucketKey])) continue;
                    $bucketMap[$bucketKey]['completed_total'] += (float) ($p->amount ?? 0);
                }
            });

        $series = [];
        $totals = [
            'completed_total' => 0.0,
            'completed_count' => 0,
            'pending_total' => 0.0,
            'pending_count' => 0,
            'pending_installment_total' => 0.0,
            'pending_installment_count' => 0,
            'pending_billing_total' => 0.0,
            'pending_billing_count' => 0,
            'pending_quotation_total' => 0.0,
            'pending_quotation_count' => 0,
        ];
        foreach ($buckets as $b) {
            $v = $bucketMap[$b['bucket']] ?? [
                'completed_total' => 0.0,
                'completed_count' => 0,
                'pending_installment_total' => 0.0,
                'pending_installment_count' => 0,
                'pending_billing_total' => 0.0,
                'pending_billing_count' => 0,
                'pending_quotation_total' => 0.0,
                'pending_quotation_count' => 0,
            ];

            $pendingTotal = (float) ($v['pending_billing_total'] + $v['pending_installment_total'] + $v['pending_quotation_total']);
            $pendingCount = (int) ($v['pending_billing_count'] + $v['pending_installment_count'] + $v['pending_quotation_count']);

            $series[] = [
                'bucket' => $b['bucket'],
                'label' => $b['label'],
                'completed_total' => (float) $v['completed_total'],
                'completed_count' => (int) $v['completed_count'],
                'pending_total' => $pendingTotal,
                'pending_count' => $pendingCount,
                'pending_installment_total' => (float) $v['pending_installment_total'],
                'pending_installment_count' => (int) $v['pending_installment_count'],
                'pending_billing_total' => (float) $v['pending_billing_total'],
                'pending_billing_count' => (int) $v['pending_billing_count'],
                'pending_quotation_total' => (float) $v['pending_quotation_total'],
                'pending_quotation_count' => (int) $v['pending_quotation_count'],
            ];

            $totals['completed_total'] += (float) $v['completed_total'];
            $totals['completed_count'] += (int) $v['completed_count'];
            $totals['pending_total'] += $pendingTotal;
            $totals['pending_count'] += $pendingCount;
            $totals['pending_installment_total'] += (float) $v['pending_installment_total'];
            $totals['pending_installment_count'] += (int) $v['pending_installment_count'];
            $totals['pending_billing_total'] += (float) $v['pending_billing_total'];
            $totals['pending_billing_count'] += (int) $v['pending_billing_count'];
            $totals['pending_quotation_total'] += (float) $v['pending_quotation_total'];
            $totals['pending_quotation_count'] += (int) $v['pending_quotation_count'];
        }

        $pendingPage = (int) ($validated['pending_page'] ?? 1);
        $pendingPerPage = isset($validated['pending_per_page'])
            ? (int) $validated['pending_per_page']
            : (int) ($validated['pending_limit'] ?? 10);
        $pendingKind = (string) ($validated['pending_kind'] ?? 'all');

        $pendingTotals = [
            'pending_billing_total' => 0.0,
            'pending_billing_count' => 0,
            'pending_installment_total' => 0.0,
            'pending_installment_count' => 0,
            'pending_quotation_total' => 0.0,
            'pending_quotation_count' => 0,
        ];
        Order::query()
            ->select(['id', 'created_at', 'total', 'status', 'payment_method', 'billing_note_number', 'billing_note_status'])
            ->with([
                'paymentPlan:id,order_id,total,down_payment,installment_count,installment_amount,start_date,due_day,status',
                'payments:id,order_id,installment_no,amount,paid_at',
            ])
            ->whereBetween('created_at', [$start, $end])
            ->whereIn('status', ['pending', 'quotation'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->chunk(250, function ($orders) use (&$pendingTotals, $start, $end) {
                foreach ($orders as $o) {
                    $isInstallment = (string) ($o->payment_method ?? '') === 'installment' || $o->paymentPlan;
                    if ($isInstallment) {
                        $due = $this->installmentDueAmountInRange($o, $start, $end);
                        if ($due <= 0) continue;
                        $pendingTotals['pending_installment_total'] += $due;
                        $pendingTotals['pending_installment_count'] += 1;
                        continue;
                    }

                    $hasActiveBilling = (bool) ($o->billing_note_number && (string) $o->billing_note_status === 'active');
                    if ($hasActiveBilling) {
                        $pendingTotals['pending_billing_total'] += (float) ($o->total ?? 0);
                        $pendingTotals['pending_billing_count'] += 1;
                    } else {
                        $pendingTotals['pending_quotation_total'] += (float) ($o->total ?? 0);
                        $pendingTotals['pending_quotation_count'] += 1;
                    }
                }
            });

        $totals['pending_billing_total'] = (float) $pendingTotals['pending_billing_total'];
        $totals['pending_billing_count'] = (int) $pendingTotals['pending_billing_count'];
        $totals['pending_installment_total'] = (float) $pendingTotals['pending_installment_total'];
        $totals['pending_installment_count'] = (int) $pendingTotals['pending_installment_count'];
        $totals['pending_quotation_total'] = (float) $pendingTotals['pending_quotation_total'];
        $totals['pending_quotation_count'] = (int) $pendingTotals['pending_quotation_count'];

        $totals['pending_total'] = (float) ($totals['pending_billing_total'] + $totals['pending_installment_total'] + $totals['pending_quotation_total']);
        $totals['pending_count'] = (int) ($totals['pending_billing_count'] + $totals['pending_installment_count'] + $totals['pending_quotation_count']);

        if ($pendingPerPage <= 0) {
            $pendingOrders = collect();
            $pendingPagination = [
                'page' => $pendingPage,
                'per_page' => $pendingPerPage,
                'total' => 0,
                'total_pages' => 0,
            ];
        } else {
            $baseForScan = Order::query()
                ->select(['id', 'created_at', 'total', 'status', 'customer_id', 'payment_method', 'billing_note_number', 'billing_note_status'])
                ->with([
                    'paymentPlan:id,order_id,total,down_payment,installment_count,installment_amount,start_date,due_day,status',
                    'payments:id,order_id,installment_no,amount,paid_at',
                ])
                ->whereIn('status', ['pending', 'quotation'])
                ->whereBetween('created_at', [$start, $end]);

            if ($pendingKind === 'billing_note') {
                $baseForScan
                    ->where(function ($q) {
                        $q->where('payment_method', '!=', 'installment')
                            ->whereDoesntHave('paymentPlan');
                    })
                    ->whereNotNull('billing_note_number')
                    ->where('billing_note_status', 'active');
            } elseif ($pendingKind === 'installment') {
                $baseForScan
                    ->where(function ($q) {
                        $q->where('payment_method', 'installment')
                            ->orWhereHas('paymentPlan');
                    });
            } elseif ($pendingKind === 'quotation') {
                $baseForScan
                    ->where(function ($q) {
                        $q->where('payment_method', '!=', 'installment')
                            ->whereDoesntHave('paymentPlan');
                    })
                    ->where(function ($q) {
                        $q->whereNull('billing_note_number')
                            ->orWhere('billing_note_status', '!=', 'active');
                    });
            }

            $scanPage = $pendingPage;
            $pendingTotal = 0;
            $pendingIds = [];

            $pendingAmounts = [];
            $scan = function (int $page) use ($baseForScan, $pendingPerPage, &$pendingTotal, &$pendingIds, &$pendingAmounts, $start, $end) {
                $pendingTotal = 0;
                $pendingIds = [];
                $pendingAmounts = [];
                $startIndex = max(0, ($page - 1) * $pendingPerPage);
                $endIndex = $startIndex + $pendingPerPage - 1;

                (clone $baseForScan)
                    ->orderByDesc('created_at')
                    ->orderByDesc('id')
                    ->chunk(250, function ($orders) use (&$pendingTotal, &$pendingIds, &$pendingAmounts, $startIndex, $endIndex, $start, $end) {
                        foreach ($orders as $o) {
                            $isInstallment = (string) ($o->payment_method ?? '') === 'installment' || $o->paymentPlan;
                            $amount = (float) ($o->total ?? 0);
                            if ($isInstallment) {
                                $due = $this->installmentDueAmountInRange($o, $start, $end);
                                if ($due <= 0) continue;
                                $amount = $due;
                            }

                            if ($pendingTotal >= $startIndex && $pendingTotal <= $endIndex) {
                                $pendingIds[] = (int) $o->id;
                                $pendingAmounts[(int) $o->id] = $amount;
                            }
                            $pendingTotal += 1;
                        }
                    });
            };

            $scan($scanPage);

            $pendingTotalPages = (int) ceil(max(0, $pendingTotal) / $pendingPerPage);
            $pendingPageClamped = max(1, min($pendingPage, max(1, $pendingTotalPages)));
            if ($pendingTotalPages > 0 && $pendingPageClamped !== $scanPage) {
                $scan($pendingPageClamped);
            }

            $loaded = Order::query()
                ->with(['customer', 'documents', 'paymentPlan'])
                ->whereIn('id', $pendingIds)
                ->get()
                ->keyBy('id');

            $pendingOrders = collect($pendingIds)
                ->map(fn ($id) => $loaded->get($id))
                ->filter()
                ->map(function ($o) use ($pendingAmounts) {
                    $orderId = (int) $o->id;
                    $amount = array_key_exists($orderId, $pendingAmounts) ? (float) $pendingAmounts[$orderId] : (float) ($o->total ?? 0);

                    $isInstallment = ((string) ($o->payment_method ?? '') === 'installment' || $o->paymentPlan) && array_key_exists($orderId, $pendingAmounts);
                    $hasActiveBilling = !$isInstallment && (bool) ($o->billing_note_number && (string) $o->billing_note_status === 'active');
                    $effectiveKind = $isInstallment ? 'installment' : ($hasActiveBilling ? 'billing_note' : 'quotation');
                    $docType = $effectiveKind === 'billing_note' ? 'billing_note' : 'quotation';
                    $doc = $o->documents
                        ->where('type', $docType)
                        ->where('status', 'active')
                        ->sortByDesc('issued_date')
                        ->first();
                    return [
                        'id' => (int) $o->id,
                        'created_at' => $o->created_at,
                        'total' => $amount,
                        'customer_name' => $o->customer?->company_name ?: ($o->customer?->name ?: null),
                        'pending_kind' => $effectiveKind,
                        'payment_method' => $o->payment_method ? (string) $o->payment_method : null,
                        'has_payment_plan' => $o->paymentPlan ? true : false,
                        'document_id' => $effectiveKind === 'installment' ? null : $doc?->id,
                        'document_type' => $effectiveKind === 'installment' ? null : $docType,
                        'document_number' => $effectiveKind === 'installment' ? null : $doc?->number,
                    ];
                })
                ->values();

            $pendingPagination = [
                'page' => $pendingPageClamped,
                'per_page' => $pendingPerPage,
                'total' => (int) $pendingTotal,
                'total_pages' => (int) $pendingTotalPages,
            ];
        }

        $remindersScope = (string) ($validated['reminders_scope'] ?? 'all');

        $billingUnpaidBase = Order::query()
            ->whereIn('status', ['pending', 'quotation'])
            ->whereNotNull('billing_note_number')
            ->where('billing_note_status', 'active');
        if ($remindersScope === 'range') {
            $billingUnpaidBase->whereBetween('created_at', [$start, $end]);
        }
        $billingUnpaidCount = (int) (clone $billingUnpaidBase)->count();
        $billingUnpaidTotal = (float) (clone $billingUnpaidBase)->sum('total');
        $billingUnpaidTopCustomers = DB::table('orders as o')
            ->leftJoin('customers as c', 'o.customer_id', '=', 'c.id')
            ->whereIn('o.status', ['pending', 'quotation'])
            ->whereNotNull('o.billing_note_number')
            ->where('o.billing_note_status', 'active')
            ->when($remindersScope === 'range', function ($q) use ($start, $end) {
                $q->whereBetween('o.created_at', [$start, $end]);
            })
            ->selectRaw('o.customer_id as customer_id')
            ->selectRaw('c.company_name as company_name')
            ->selectRaw('c.name as name')
            ->selectRaw('COUNT(*) as count')
            ->selectRaw('SUM(o.total) as total')
            ->groupBy('o.customer_id', 'c.company_name', 'c.name')
            ->orderByDesc('total')
            ->limit(10)
            ->get()
            ->map(function ($r) {
                $customerName = $r->company_name ?: ($r->name ?: null);
                return [
                    'customer_id' => $r->customer_id !== null ? (int) $r->customer_id : null,
                    'customer_name' => $customerName ? (string) $customerName : null,
                    'count' => (int) ($r->count ?? 0),
                    'total' => (float) ($r->total ?? 0),
                ];
            })
            ->values();

        $missingReceiptBase = Order::query()
            ->where('status', 'completed')
            ->where(function ($q) {
                $q->whereNull('receipt_number')
                    ->orWhereNull('receipt_status')
                    ->orWhere('receipt_status', '!=', 'active');
            });
        if ($remindersScope === 'range') {
            $missingReceiptBase->whereBetween('created_at', [$start, $end]);
        }
        $missingReceiptCount = (int) (clone $missingReceiptBase)->count();
        $missingReceiptTotal = (float) (clone $missingReceiptBase)->sum('total');
        $missingReceiptTopCustomers = DB::table('orders as o')
            ->leftJoin('customers as c', 'o.customer_id', '=', 'c.id')
            ->where('o.status', 'completed')
            ->where(function ($q) {
                $q->whereNull('o.receipt_number')
                    ->orWhereNull('o.receipt_status')
                    ->orWhere('o.receipt_status', '!=', 'active');
            })
            ->when($remindersScope === 'range', function ($q) use ($start, $end) {
                $q->whereBetween('o.created_at', [$start, $end]);
            })
            ->selectRaw('o.customer_id as customer_id')
            ->selectRaw('c.company_name as company_name')
            ->selectRaw('c.name as name')
            ->selectRaw('COUNT(*) as count')
            ->selectRaw('SUM(o.total) as total')
            ->groupBy('o.customer_id', 'c.company_name', 'c.name')
            ->orderByDesc('total')
            ->limit(10)
            ->get()
            ->map(function ($r) {
                $customerName = $r->company_name ?: ($r->name ?: null);
                return [
                    'customer_id' => $r->customer_id !== null ? (int) $r->customer_id : null,
                    'customer_name' => $customerName ? (string) $customerName : null,
                    'count' => (int) ($r->count ?? 0),
                    'total' => (float) ($r->total ?? 0),
                ];
            })
            ->values();

        return response()->json([
            'preset' => $preset,
            'group_by' => $groupBy,
            'start_date' => $start->toDateString(),
            'end_date' => $end->toDateString(),
            'series' => $series,
            'totals' => $totals,
            'pending_orders' => $pendingOrders,
            'pending_pagination' => $pendingPagination,
            'reminders' => [
                'scope' => $remindersScope,
                'billing_unpaid' => [
                    'total' => $billingUnpaidTotal,
                    'count' => $billingUnpaidCount,
                    'top_customers' => $billingUnpaidTopCustomers,
                ],
                'missing_receipt' => [
                    'total' => $missingReceiptTotal,
                    'count' => $missingReceiptCount,
                    'top_customers' => $missingReceiptTopCustomers,
                ],
            ],
        ]);
    }

    public function subcategoryDashboard(Request $request)
    {
        $validated = $request->validate([
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date',
        ]);

        $now = Carbon::now();
        $start = isset($validated['start_date'])
            ? Carbon::parse($validated['start_date'])->startOfDay()
            : $now->copy()->subDays(29)->startOfDay();
        $end = isset($validated['end_date'])
            ? Carbon::parse($validated['end_date'])->endOfDay()
            : $now->copy()->endOfDay();

        if ($start->greaterThan($end)) {
            [$start, $end] = [$end->copy()->startOfDay(), $start->copy()->endOfDay()];
        }

        $rangeDays = max(1, $start->diffInDays($end) + 1);
        $prevEnd = $start->copy()->subDay()->endOfDay();
        $prevStart = $prevEnd->copy()->subDays($rangeDays - 1)->startOfDay();

        $makeEmptyBuckets = function (Carbon $s, Carbon $e) {
            $out = [];
            $d = $s->copy()->startOfDay();
            while ($d->lessThanOrEqualTo($e)) {
                $key = $d->toDateString();
                $out[$key] = [
                    'date' => $key,
                    'service_count' => 0,
                    'service_revenue' => 0.0,
                    'product_count' => 0,
                    'product_revenue' => 0.0,
                ];
                $d->addDay();
            }
            return $out;
        };

        $compute = function (Carbon $s, Carbon $e) use ($makeEmptyBuckets) {
            $buckets = $makeEmptyBuckets($s, $e);

            $serviceByProduct = [];
            $productByProduct = [];
            $serviceByCategory = [];
            $productByCategory = [];

            $serviceCustomerCounts = [];
            $serviceCustomerTotal = 0;
            $serviceCustomerRepeat = 0;

            $startForOrders = $s->copy()->startOfDay();
            $endForOrders = $e->copy()->endOfDay();

            $installmentOrderIds = OrderPayment::query()
                ->whereBetween('paid_at', [$startForOrders, $endForOrders])
                ->select('order_id')
                ->distinct()
                ->pluck('order_id')
                ->map(fn ($v) => (int) $v)
                ->values()
                ->all();

            $nonInstallmentOrders = Order::query()
                ->where('status', 'completed')
                ->whereBetween('created_at', [$startForOrders, $endForOrders])
                ->where(function ($q) {
                    $q->whereNull('payment_method')
                        ->orWhere('payment_method', '!=', 'installment');
                })
                ->whereDoesntHave('paymentPlan')
                ->select(['id', 'customer_id', 'created_at', 'total', 'subtotal', 'payment_method'])
                ->with(['items.product.category'])
                ->get();

            $installmentOrders = count($installmentOrderIds) > 0
                ? Order::query()
                    ->whereIn('id', $installmentOrderIds)
                    ->select(['id', 'customer_id', 'created_at', 'total', 'subtotal', 'payment_method'])
                    ->with([
                        'items.product.category',
                        'paymentPlan:id,order_id,total',
                        'payments:id,order_id,amount,paid_at',
                    ])
                    ->get()
                : collect();

            $ordersCreatedInRange = Order::query()
                ->whereBetween('created_at', [$startForOrders, $endForOrders])
                ->select(['id', 'customer_id', 'created_at', 'total', 'subtotal', 'payment_method'])
                ->with(['items.product.category', 'paymentPlan:id,order_id,total'])
                ->get()
                ->keyBy('id');

            foreach ($ordersCreatedInRange as $o) {
                $hasService = false;
                foreach (($o->items ?? []) as $it) {
                    $p = $it->product;
                    if ($p && (string) ($p->product_type ?? '') === 'service') {
                        $hasService = true;
                        break;
                    }
                }
                if (!$hasService) continue;
                if ($o->customer_id === null) continue;
                $cid = (int) $o->customer_id;
                $serviceCustomerCounts[$cid] = ($serviceCustomerCounts[$cid] ?? 0) + 1;
            }
            foreach ($serviceCustomerCounts as $count) {
                $serviceCustomerTotal += 1;
                if ($count >= 2) $serviceCustomerRepeat += 1;
            }

            $accumulateItem = function (
                array &$byProduct,
                array &$byCategory,
                int $productId,
                string $name,
                ?string $sku,
                ?int $categoryId,
                string $categoryName,
                float $qty,
                float $revenue
            ) {
                if (!array_key_exists($productId, $byProduct)) {
                    $byProduct[$productId] = [
                        'product_id' => $productId,
                        'name' => $name,
                        'sku' => $sku,
                        'category_id' => $categoryId,
                        'category_name' => $categoryName,
                        'quantity' => 0.0,
                        'revenue' => 0.0,
                    ];
                }
                $byProduct[$productId]['quantity'] += $qty;
                $byProduct[$productId]['revenue'] += $revenue;

                $catKey = $categoryId !== null ? (string) $categoryId : 'null';
                if (!array_key_exists($catKey, $byCategory)) {
                    $byCategory[$catKey] = [
                        'category_id' => $categoryId,
                        'category_name' => $categoryName,
                        'quantity' => 0.0,
                        'revenue' => 0.0,
                    ];
                }
                $byCategory[$catKey]['quantity'] += $qty;
                $byCategory[$catKey]['revenue'] += $revenue;
            };

            $allocateByOrder = function (Order $o, float $orderRevenue, ?string $revenueDate = null) use (
                &$buckets,
                &$serviceByProduct,
                &$productByProduct,
                &$serviceByCategory,
                &$productByCategory,
                $accumulateItem,
                $startForOrders,
                $endForOrders
            ) {
                $items = $o->items ?? [];
                if (count($items) === 0) return;

                $base = 0.0;
                foreach ($items as $it) {
                    $qty = (float) ($it->quantity ?? 0);
                    $price = (float) ($it->price ?? 0);
                    $itemTotal = $qty * $price;
                    if ($itemTotal <= 0) continue;
                    $base += $itemTotal;
                }
                if ($base <= 0) {
                    $base = (float) ($o->subtotal ?? $o->total ?? 0);
                }
                if ($base <= 0) $base = 1.0;

                $createdKey = Carbon::parse($o->created_at)->toDateString();
                $isCreatedInRange = Carbon::parse($o->created_at)->betweenIncluded($startForOrders, $endForOrders);

                $revKey = $revenueDate ? Carbon::parse($revenueDate)->toDateString() : $createdKey;
                if (isset($buckets[$revKey])) {
                    foreach ($items as $it) {
                        $p = $it->product;
                        if (!$p) continue;
                        $qty = (float) ($it->quantity ?? 0);
                        $price = (float) ($it->price ?? 0);
                        if ($qty <= 0 || $price < 0) continue;
                        $itemTotal = $qty * $price;
                        $ratio = $itemTotal > 0 ? ($itemTotal / $base) : 0.0;
                        $allocated = $orderRevenue * $ratio;
                        $isService = (string) ($p->product_type ?? '') === 'service';

                        if ($isService) {
                            $buckets[$revKey]['service_revenue'] += $allocated;
                        } else {
                            $buckets[$revKey]['product_revenue'] += $allocated;
                        }
                    }
                }

                if ($isCreatedInRange && isset($buckets[$createdKey])) {
                    foreach ($items as $it) {
                        $p = $it->product;
                        if (!$p) continue;
                        $qty = (float) ($it->quantity ?? 0);
                        $price = (float) ($it->price ?? 0);
                        if ($qty <= 0 || $price < 0) continue;
                        $isService = (string) ($p->product_type ?? '') === 'service';
                        if ($isService) {
                            $buckets[$createdKey]['service_count'] += $qty;
                        } else {
                            $buckets[$createdKey]['product_count'] += $qty;
                        }
                    }
                }

                foreach ($items as $it) {
                    $p = $it->product;
                    if (!$p) continue;
                    $qty = (float) ($it->quantity ?? 0);
                    $price = (float) ($it->price ?? 0);
                    if ($qty <= 0 || $price < 0) continue;
                    $itemTotal = $qty * $price;
                    $ratio = $itemTotal > 0 ? ($itemTotal / $base) : 0.0;
                    $allocatedRevenue = $orderRevenue * $ratio;

                    $cat = $p->category;
                    $categoryId = $cat ? (int) $cat->id : null;
                    $categoryName = $cat ? (string) $cat->name : 'Uncategorized';
                    $productId = (int) $p->id;
                    $name = (string) ($p->name ?? '');
                    $sku = $p->sku ? (string) $p->sku : null;

                    $isService = (string) ($p->product_type ?? '') === 'service';
                    if ($isService) {
                        $accumulateItem($serviceByProduct, $serviceByCategory, $productId, $name, $sku, $categoryId, $categoryName, $qty, $allocatedRevenue);
                    } else {
                        $accumulateItem($productByProduct, $productByCategory, $productId, $name, $sku, $categoryId, $categoryName, $qty, $allocatedRevenue);
                    }
                }
            };

            foreach ($nonInstallmentOrders as $o) {
                $allocateByOrder($o, (float) ($o->total ?? 0));
            }

            foreach ($installmentOrders as $o) {
                $payments = $o->payments ?? [];
                foreach ($payments as $p) {
                    $paidAt = Carbon::parse($p->paid_at);
                    if (!$paidAt->betweenIncluded($startForOrders, $endForOrders)) continue;
                    $allocateByOrder($o, (float) ($p->amount ?? 0), $paidAt->toDateString());
                }
            }

            $serviceCount = array_reduce($buckets, fn ($acc, $b) => $acc + (float) ($b['service_count'] ?? 0), 0.0);
            $serviceRevenue = array_reduce($buckets, fn ($acc, $b) => $acc + (float) ($b['service_revenue'] ?? 0), 0.0);
            $productCount = array_reduce($buckets, fn ($acc, $b) => $acc + (float) ($b['product_count'] ?? 0), 0.0);
            $productRevenue = array_reduce($buckets, fn ($acc, $b) => $acc + (float) ($b['product_revenue'] ?? 0), 0.0);

            $serviceProducts = array_values($serviceByProduct);
            usort($serviceProducts, fn ($a, $b) => ($b['quantity'] <=> $a['quantity']) ?: ($b['revenue'] <=> $a['revenue']));
            $topService = $serviceProducts[0] ?? null;
            $topServiceShare = $serviceCount > 0 && $topService ? round(((float) $topService['quantity'] / $serviceCount) * 100, 1) : 0.0;

            $serviceCategories = array_values($serviceByCategory);
            usort($serviceCategories, fn ($a, $b) => ($b['quantity'] <=> $a['quantity']) ?: ($b['revenue'] <=> $a['revenue']));
            $serviceCategoryTotalQty = array_reduce($serviceCategories, fn ($acc, $c) => $acc + (float) ($c['quantity'] ?? 0), 0.0);
            $serviceCategoryDist = array_map(function ($c) use ($serviceCategoryTotalQty) {
                $share = $serviceCategoryTotalQty > 0 ? round(((float) ($c['quantity'] ?? 0) / $serviceCategoryTotalQty) * 100, 1) : 0.0;
                return [
                    'category_id' => $c['category_id'],
                    'category_name' => $c['category_name'],
                    'quantity' => round((float) ($c['quantity'] ?? 0), 2),
                    'revenue' => round((float) ($c['revenue'] ?? 0), 2),
                    'share' => $share,
                ];
            }, $serviceCategories);

            $productCategories = array_values($productByCategory);
            usort($productCategories, fn ($a, $b) => ($b['quantity'] <=> $a['quantity']) ?: ($b['revenue'] <=> $a['revenue']));
            $productCategoryTotalQty = array_reduce($productCategories, fn ($acc, $c) => $acc + (float) ($c['quantity'] ?? 0), 0.0);
            $productCategoryDist = array_map(function ($c) use ($productCategoryTotalQty) {
                $share = $productCategoryTotalQty > 0 ? round(((float) ($c['quantity'] ?? 0) / $productCategoryTotalQty) * 100, 1) : 0.0;
                return [
                    'category_id' => $c['category_id'],
                    'category_name' => $c['category_name'],
                    'quantity' => round((float) ($c['quantity'] ?? 0), 2),
                    'revenue' => round((float) ($c['revenue'] ?? 0), 2),
                    'share' => $share,
                ];
            }, $productCategories);

            $topServiceList = array_slice($serviceProducts, 0, 5);
            $topProductList = array_values($productByProduct);
            usort($topProductList, fn ($a, $b) => ($b['quantity'] <=> $a['quantity']) ?: ($b['revenue'] <=> $a['revenue']));
            $topProductList = array_slice($topProductList, 0, 5);

            $serviceBreakdown = array_values($serviceByProduct);
            usort($serviceBreakdown, fn ($a, $b) => ($b['quantity'] <=> $a['quantity']) ?: ($b['revenue'] <=> $a['revenue']));
            $productBreakdown = array_values($productByProduct);
            usort($productBreakdown, fn ($a, $b) => ($b['quantity'] <=> $a['quantity']) ?: ($b['revenue'] <=> $a['revenue']));

            return [
                'buckets' => array_values($buckets),
                'service' => [
                    'count' => round($serviceCount, 2),
                    'revenue' => round($serviceRevenue, 2),
                    'top_name' => $topService ? (string) $topService['name'] : null,
                    'top_share' => $topServiceShare,
                    'repeat_rate' => $serviceCustomerTotal > 0 ? round(($serviceCustomerRepeat / $serviceCustomerTotal) * 100, 1) : 0.0,
                    'type_distribution' => $serviceCategoryDist,
                    'top5' => array_map(fn ($r) => [
                        'product_id' => $r['product_id'],
                        'name' => $r['name'],
                        'quantity' => round((float) $r['quantity'], 2),
                        'revenue' => round((float) $r['revenue'], 2),
                    ], $topServiceList),
                    'breakdown' => array_map(fn ($r) => [
                        'product_id' => $r['product_id'],
                        'name' => $r['name'],
                        'sku' => $r['sku'],
                        'category_name' => $r['category_name'],
                        'quantity' => round((float) $r['quantity'], 2),
                        'revenue' => round((float) $r['revenue'], 2),
                    ], $serviceBreakdown),
                ],
                'product' => [
                    'count' => round($productCount, 2),
                    'revenue' => round($productRevenue, 2),
                    'type_distribution' => $productCategoryDist,
                    'top5' => array_map(fn ($r) => [
                        'product_id' => $r['product_id'],
                        'name' => $r['name'],
                        'quantity' => round((float) $r['quantity'], 2),
                        'revenue' => round((float) $r['revenue'], 2),
                    ], $topProductList),
                    'breakdown' => array_map(fn ($r) => [
                        'product_id' => $r['product_id'],
                        'name' => $r['name'],
                        'sku' => $r['sku'],
                        'category_name' => $r['category_name'],
                        'quantity' => round((float) $r['quantity'], 2),
                        'revenue' => round((float) $r['revenue'], 2),
                    ], $productBreakdown),
                ],
            ];
        };

        $current = $compute($start, $end);
        $previous = $compute($prevStart, $prevEnd);

        $serviceGrowth = ($previous['service']['count'] ?? 0) > 0
            ? round(((float) ($current['service']['count'] ?? 0) - (float) ($previous['service']['count'] ?? 0)) / (float) ($previous['service']['count'] ?? 1) * 100, 1)
            : 0.0;
        $serviceRevenueGrowth = ($previous['service']['revenue'] ?? 0) > 0
            ? round(((float) ($current['service']['revenue'] ?? 0) - (float) ($previous['service']['revenue'] ?? 0)) / (float) ($previous['service']['revenue'] ?? 1) * 100, 1)
            : 0.0;
        $productGrowth = ($previous['product']['count'] ?? 0) > 0
            ? round(((float) ($current['product']['count'] ?? 0) - (float) ($previous['product']['count'] ?? 0)) / (float) ($previous['product']['count'] ?? 1) * 100, 1)
            : 0.0;
        $productRevenueGrowth = ($previous['product']['revenue'] ?? 0) > 0
            ? round(((float) ($current['product']['revenue'] ?? 0) - (float) ($previous['product']['revenue'] ?? 0)) / (float) ($previous['product']['revenue'] ?? 1) * 100, 1)
            : 0.0;

        return response()->json([
            'start_date' => $start->toDateString(),
            'end_date' => $end->toDateString(),
            'prev_start_date' => $prevStart->toDateString(),
            'prev_end_date' => $prevEnd->toDateString(),
            'growth' => [
                'service_count' => $serviceGrowth,
                'service_revenue' => $serviceRevenueGrowth,
                'product_count' => $productGrowth,
                'product_revenue' => $productRevenueGrowth,
            ],
            'series' => $current['buckets'],
            'service' => $current['service'],
            'product' => $current['product'],
        ]);
    }

    public function index(Request $request)
    {
        $query = Order::with([
                'items.product',
                'user',
                'customer',
                'parent',
                'documents',
                'paymentPlan:id,order_id,total,down_payment,installment_count,installment_amount,start_date,due_day,status',
                'payments:id,order_id,installment_no,amount,method,paid_at',
            ])
            ->withCount('appointments')
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        if ($request->has('payment_method') && $request->input('payment_method') !== 'all') {
            $method = $request->input('payment_method');
            if ($method === 'installment') {
                $query->where(function ($q) {
                    $q->where('payment_method', 'installment')
                        ->orWhereHas('paymentPlan');
                });
            } else {
                $query->where('payment_method', $method);
            }
        }

        if ($request->has('status') && $request->input('status') !== 'all') {
            $status = $request->input('status');
            if (str_contains($status, ',')) {
                $query->whereIn('status', explode(',', $status));
            } else {
                if ($status === 'quotation') {
                    $query->where(function ($q) {
                        $q->where('status', 'quotation')
                          ->orWhereNotNull('quotation_number')
                          ->orWhereHas('documents', function ($dq) {
                              $dq->where('type', 'quotation');
                          });
                    });
                } else {
                    $query->where('status', $status);
                }
            }
        }

        if ($request->has('customer_id')) {
            $query->where('customer_id', $request->input('customer_id'));
        }

        if ($request->has('exclude_has_appointment') && $request->boolean('exclude_has_appointment')) {
            $query->where(function($q) use ($request) {
                $q->doesntHave('appointments');
                if ($request->has('include_order_id')) {
                    $q->orWhere('id', $request->input('include_order_id'));
                }
            });
        }

        $search = trim((string) $request->input('search', ''));
        if ($search !== '') {
            $rawId = ltrim($search, '#');
            if ($rawId !== '' && ctype_digit($rawId)) {
                $query->where('id', (int) $rawId);
            } else {
                $like = "%{$search}%";
                $query->where(function ($q) use ($like) {
                    $q->whereHas('customer', function ($cq) use ($like) {
                        $cq->where('name', 'like', $like)
                            ->orWhere('company_name', 'like', $like)
                            ->orWhere('phone', 'like', $like)
                            ->orWhere('email', 'like', $like)
                            ->orWhere('tax_id', 'like', $like);
                    })
                    ->orWhere('quotation_number', 'like', $like)
                    ->orWhere('billing_note_number', 'like', $like)
                    ->orWhere('receipt_number', 'like', $like)
                    ->orWhereHas('documents', function ($dq) use ($like) {
                        $dq->where('number', 'like', $like);
                    });
                });
            }
        }

        $perPage = (int) $request->input('per_page', 10);
        if ($perPage <= 0) $perPage = 10;
        if ($perPage > 200) $perPage = 200;
        $orders = $query->paginate($perPage);

        $orders->getCollection()->each(function($order) {
            $sortedItems = $order->items->sortBy(function($item) {
                $product = $item->product;
                if (!$product) return 999;
                if ($product->product_type !== 'service') return 1;
                return ($item->price < 0) ? 3 : 2;
            })->values();
            $order->setRelation('items', $sortedItems);
        });

        return $orders;
    }

    public function store(Request $request)
    {
        $request->validate([
            'items' => 'required|array',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'nullable|numeric',
            'payment_method' => 'required|string',
            'status' => 'nullable|in:completed,cancelled,pending,quotation',
            'customer_id' => 'nullable|exists:customers,id',
            'parent_id' => 'nullable|exists:orders,id',
            'apply_vat' => 'sometimes|boolean',
            'vat_rate' => 'sometimes|numeric|min:0|max:100',
            'withholding_rate' => 'sometimes|numeric|min:0|max:100',
        ]);

        return DB::transaction(function () use ($request) {
            $subtotal = 0;
            $items = [];
            $status = $request->input('status', 'completed');
            $isRealOrder = function($s) {
                return !in_array($s, ['quotation', 'cancelled']);
            };
            $willBeReal = $isRealOrder($status);

            foreach ($request->items as $item) {
                $product = Product::with('bundleItems')->find($item['product_id']);
                $metadata = null;
                $price = $product->price;
                
                if ($product->product_type === 'service') {
                    // Handle Service Product
                    if (isset($item['price'])) {
                        $price = $item['price'];
                    }
                    // Service items don't track stock
                } elseif ($product->product_type === 'bundle') {
                    // Handle Bundle Product
                    $bundleSnapshot = [];
                    foreach ($product->bundleItems as $child) {
                        $requiredQty = $child->pivot->quantity * $item['quantity'];
                        
                        if ($willBeReal) {
                            if ($child->stock < $requiredQty) {
                                throw new \Exception("Insufficient stock for bundle component: {$child->name} (Required: {$requiredQty}, Available: {$child->stock})");
                            }
                            
                            // Deduct stock from child
                            $child->decrement('stock', $requiredQty);
                        }
                        
                        // Snapshot child details
                        $bundleSnapshot[] = [
                            'id' => $child->id,
                            'name' => $child->name,
                            'sku' => $child->sku,
                            'quantity_per_bundle' => $child->pivot->quantity,
                            'total_quantity_deducted' => $requiredQty,
                            'price_at_sale' => $child->price,
                        ];
                    }
                    $metadata = ['bundle_items' => $bundleSnapshot];
                    
                    if ($willBeReal && $product->stock > 0) {
                        $product->decrement('stock', $item['quantity']);
                    }
                } else {
                    // Handle Single/Variable Product
                    if ($willBeReal) {
                        if ($product->stock < $item['quantity']) {
                            throw new \Exception("Insufficient stock for product: {$product->name}");
                        }
                        $product->decrement('stock', $item['quantity']);
                    }
                }

                $subtotal += $price * $item['quantity'];

                $sortOrder = 1;
                if ($product->product_type === 'service') {
                    $sortOrder = ($price < 0) ? 3 : 2;
                }

                $items[] = [
                    'product_id' => $product->id,
                    'quantity' => $item['quantity'],
                    'price' => $price,
                    'metadata' => $metadata, // Cast to array/json automatically
                    '_sort_order' => $sortOrder
                ];
            }

            // Sort items before saving to ensure consistent ID order
            usort($items, function($a, $b) {
                return $a['_sort_order'] <=> $b['_sort_order'];
            });

            // Remove temporary sort key
            foreach ($items as &$i) {
                unset($i['_sort_order']);
            }

            $vatRate = $request->has('vat_rate')
                ? (float) $request->input('vat_rate')
                : ($request->boolean('apply_vat') ? 7.0 : 0.0);
            $withholdingRate = $request->has('withholding_rate')
                ? (float) $request->input('withholding_rate')
                : 0.0;

            $taxTotals = $this->calculateTaxTotals($subtotal, $vatRate, $withholdingRate);

            $order = Order::create([
                'user_id' => $request->user()->id,
                'customer_id' => $request->customer_id,
                'parent_id' => $request->parent_id,
                'subtotal' => $taxTotals['subtotal'],
                'vat_rate' => $taxTotals['vat_rate'],
                'vat_amount' => $taxTotals['vat_amount'],
                'withholding_rate' => $taxTotals['withholding_rate'],
                'withholding_amount' => $taxTotals['withholding_amount'],
                'total' => $taxTotals['total'],
                'status' => $status,
                'payment_method' => $request->payment_method,
                'quotation_number' => null,
                'billing_note_number' => null,
                'receipt_number' => null,
            ]);

            // No automatic document generation anymore
            
            $order->items()->createMany($items);

            return $order->load('items.product', 'customer', 'parent');
        });
    }

    public function show(Order $order)
    {
        $order->load([
            'items.product',
            'user',
            'customer',
            'parent',
            'documents',
            'paymentPlan',
            'payments.documents',
        ]);
        
        $sortedItems = collect($order->items)->sortBy(function($item) {
            $product = $item->product;
            if (!$product) return 999;
            if ($product->product_type !== 'service') return 1;
            return ($item->price < 0) ? 3 : 2;
        })->values();
        $order->setRelation('items', $sortedItems);

        return $order;
    }

    public function update(Request $request, Order $order)
    {
        $request->validate([
            'status' => 'nullable|in:completed,cancelled,pending,quotation',
            'payment_method' => 'nullable|string',
            'customer_id' => 'nullable|exists:customers,id',
            'items' => 'nullable|array',
            'items.*.product_id' => 'required_with:items|exists:products,id',
            'items.*.quantity' => 'required_with:items|integer|min:1',
            'items.*.price' => 'nullable|numeric',
            'apply_vat' => 'sometimes|boolean',
            'vat_rate' => 'sometimes|numeric|min:0|max:100',
            'withholding_rate' => 'sometimes|numeric|min:0|max:100',
        ]);

        return DB::transaction(function () use ($request, $order) {
            $oldStatus = $order->status;
            $newStatus = $request->input('status', $oldStatus);

            if ($oldStatus === 'completed' && $newStatus === 'pending') {
                if ($order->receipt_number && ($order->receipt_status ?? 'active') !== 'cancelled') {
                    return response()->json([
                        'message' => 'ไม่สามารถเปลี่ยนเป็นรอจ่ายได้ เนื่องจากมีใบเสร็จที่ยังไม่ถูกยกเลิก',
                    ], 422);
                }
            }
            
            // Helper to check if status requires stock reservation
            $isRealOrder = function($status) {
                return !in_array($status, ['quotation', 'cancelled']);
            };

            $wasReal = $isRealOrder($oldStatus);
            $willBeReal = $isRealOrder($newStatus);

            // Update fields
            if ($request->has('status')) $order->status = $request->status;
            if ($request->has('payment_method')) $order->payment_method = $request->payment_method;
            if ($request->has('customer_id')) $order->customer_id = $request->customer_id;

            // No automatic document generation anymore
            
            // Logic 1: Items are being updated
            if ($request->has('items')) {
                // A. Revert Old Stock (if it was reserved)
                if ($wasReal) {
                    foreach ($order->items as $item) {
                        $this->revertItemStock($item);
                    }
                }

                // B. Delete Old Items
                $order->items()->delete();

                // C. Process New Items
                $subtotal = 0;
                $items = [];

                foreach ($request->items as $item) {
                    $product = Product::with('bundleItems')->find($item['product_id']);
                    $metadata = null;
                    $price = $product->price;
                    
                    if ($product->product_type === 'service') {
                        if (isset($item['price'])) {
                            $price = $item['price'];
                        }
                    } elseif ($product->product_type === 'bundle') {
                        $bundleSnapshot = [];
                        foreach ($product->bundleItems as $child) {
                            $requiredQty = $child->pivot->quantity * $item['quantity'];
                            
                            // Check and Deduct ONLY if it will be a real order
                            if ($willBeReal) {
                                if ($child->stock < $requiredQty) {
                                    throw new \Exception("Insufficient stock for bundle component: {$child->name}");
                                }
                                $child->decrement('stock', $requiredQty);
                            }
                            
                            $bundleSnapshot[] = [
                                'id' => $child->id,
                                'name' => $child->name,
                                'sku' => $child->sku,
                                'quantity_per_bundle' => $child->pivot->quantity,
                                'total_quantity_deducted' => $requiredQty,
                                'price_at_sale' => $child->price,
                            ];
                        }
                        $metadata = ['bundle_items' => $bundleSnapshot];
                        
                        if ($willBeReal && $product->stock > 0) {
                            $product->decrement('stock', $item['quantity']);
                        }
                    } else {
                        // Single product
                        if ($willBeReal) {
                            if ($product->stock < $item['quantity']) {
                                throw new \Exception("Insufficient stock for product: {$product->name}");
                            }
                            $product->decrement('stock', $item['quantity']);
                        }
                    }

                    $subtotal += $price * $item['quantity'];

                    $sortOrder = 1;
                    if ($product->product_type === 'service') {
                        $sortOrder = ($price < 0) ? 3 : 2;
                    }

                    $items[] = [
                        'product_id' => $product->id,
                        'quantity' => $item['quantity'],
                        'price' => $price,
                        'metadata' => $metadata,
                        '_sort_order' => $sortOrder
                    ];
                }

                // Sort items before saving
                usort($items, function($a, $b) {
                    return $a['_sort_order'] <=> $b['_sort_order'];
                });

                // Remove temporary sort key
                foreach ($items as &$i) {
                    unset($i['_sort_order']);
                }

                $order->subtotal = $subtotal;

                $vatRate = $request->has('vat_rate')
                    ? (float) $request->input('vat_rate')
                    : ($request->has('apply_vat')
                        ? ($request->boolean('apply_vat') ? 7.0 : 0.0)
                        : (float) ($order->vat_rate ?? 0));

                $withholdingRate = $request->has('withholding_rate')
                    ? (float) $request->input('withholding_rate')
                    : (float) ($order->withholding_rate ?? 0);

                $taxTotals = $this->calculateTaxTotals((float) $order->subtotal, $vatRate, $withholdingRate);
                $order->vat_rate = $taxTotals['vat_rate'];
                $order->vat_amount = $taxTotals['vat_amount'];
                $order->withholding_rate = $taxTotals['withholding_rate'];
                $order->withholding_amount = $taxTotals['withholding_amount'];
                $order->total = $taxTotals['total'];

                $order->save();
                $order->items()->createMany($items);

            } else {
                // Logic 2: Only Status/Payment Update (No Item Change)
                
                // If transitioning from Real -> Fake (e.g. Pending -> Cancelled/Quotation)
                if ($wasReal && !$willBeReal) {
                    foreach ($order->items as $item) {
                        $this->revertItemStock($item);
                    }
                }
                // If transitioning from Fake -> Real (e.g. Quotation -> Pending)
                elseif (!$wasReal && $willBeReal) {
                    foreach ($order->items as $item) {
                        $this->deductItemStock($item);
                    }
                }

                $vatRate = $request->has('vat_rate')
                    ? (float) $request->input('vat_rate')
                    : ($request->has('apply_vat')
                        ? ($request->boolean('apply_vat') ? 7.0 : 0.0)
                        : (float) ($order->vat_rate ?? 0));

                $withholdingRate = $request->has('withholding_rate')
                    ? (float) $request->input('withholding_rate')
                    : (float) ($order->withholding_rate ?? 0);

                $baseSubtotal = (float) ($order->subtotal ?? $order->total);
                $taxTotals = $this->calculateTaxTotals($baseSubtotal, $vatRate, $withholdingRate);
                $order->subtotal = $taxTotals['subtotal'];
                $order->vat_rate = $taxTotals['vat_rate'];
                $order->vat_amount = $taxTotals['vat_amount'];
                $order->withholding_rate = $taxTotals['withholding_rate'];
                $order->withholding_amount = $taxTotals['withholding_amount'];
                $order->total = $taxTotals['total'];

                $order->save();
            }

            return $order->load('items.product');
        });
    }

    public function destroy(Request $request, Order $order)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($order->status !== 'cancelled') {
            return response()->json(['message' => 'Only cancelled orders can be permanently deleted'], 400);
        }

        return DB::transaction(function () use ($order) {
            $order->delete();
            return response()->noContent();
        });
    }

    public function purge(Request $request, Order $order)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($order->appointments()->exists()) {
            return response()->json([
                'message' => 'ไม่สามารถลบได้ เนื่องจากออเดอร์นี้มีนัดหมายอยู่',
            ], 422);
        }

        return DB::transaction(function () use ($order) {
            Document::where('order_id', $order->id)->update(['status' => 'cancelled']);

            $order->quotation_status = 'cancelled';
            $order->billing_note_status = 'cancelled';
            $order->receipt_status = 'cancelled';
            $order->quotation_number = null;
            $order->billing_note_number = null;
            $order->receipt_number = null;

            $wasReal = !in_array($order->status, ['quotation', 'cancelled']);
            if ($wasReal) {
                foreach ($order->items as $item) {
                    $this->revertItemStock($item);
                }
            }

            $order->status = 'cancelled';
            $order->save();

            $order->delete();
            return response()->noContent();
        });
    }

    private function calculateTaxTotals(float $subtotal, float $vatRate, float $withholdingRate): array
    {
        $subtotal = round($subtotal, 2);
        $vatRate = max(0.0, min(100.0, $vatRate));
        $withholdingRate = max(0.0, min(100.0, $withholdingRate));

        $vatAmount = round($subtotal * $vatRate / 100, 2);
        $withholdingAmount = round($subtotal * $withholdingRate / 100, 2);
        $total = round($subtotal + $vatAmount, 2);

        return [
            'subtotal' => $subtotal,
            'vat_rate' => $vatRate,
            'vat_amount' => $vatAmount,
            'withholding_rate' => $withholdingRate,
            'withholding_amount' => $withholdingAmount,
            'total' => $total,
        ];
    }

    public function cancelDocument(Request $request, $id)
    {
        $request->validate([
            'type' => 'required|in:quotation,billing_note,receipt'
        ]);

        $order = Order::findOrFail($id);
        $type = $request->input('type');
        $column = '';

        if ($type === 'quotation') {
            $column = 'quotation_number';
            $order->quotation_status = 'cancelled';
        } elseif ($type === 'billing_note') {
            $column = 'billing_note_number';
            $order->billing_note_status = 'cancelled';
        } elseif ($type === 'receipt') {
            $column = 'receipt_number';
            $order->receipt_status = 'cancelled';
        }

        // Find the document record and update it
        $document = Document::where('order_id', $order->id)
            ->where('number', $order->$column)
            ->first();

        if ($document) {
            $document->status = 'cancelled';
            $document->save();
        }

        // We DO NOT clear the number from the order, so it still shows as "cancelled" in the UI
        // until a new one is generated.
        // Wait, if we want to allow re-issuing, we need to allow generateDocumentNumber to run again.
        // But generateDocumentNumber only runs if the field is empty?
        // Let's modify generateDocumentNumber logic or the calling logic.
        
        // Actually, if we want to allow re-issue, we should probably clear the field on the Order model
        // BUT keep the record in Document model.
        // If we clear it, the UI will show "Not Issued" and allow issuing again.
        // But we want to show history.
        // So the frontend should look at `documents` relation for history, and `quotation_number` for current active one.
        
        $order->$column = null; // Clear the current active number
        $order->save();

        return response()->json($order->load('documents'));
    }

    public function issueDocument(Request $request, $id)
    {
        $request->validate([
            'type' => 'required|in:quotation,billing_note,receipt',
            'issued_date' => 'sometimes|nullable|date',
        ]);

        $order = Order::findOrFail($id);
        $type = $request->input('type');
        $issuedDate = $request->filled('issued_date')
            ? Carbon::parse($request->input('issued_date'))->startOfDay()
            : Carbon::today();
        $code = '';

        if ($type === 'quotation') {
            $code = 'QT';
            if ($order->quotation_number) {
                $currentDoc = Document::where('order_id', $order->id)
                    ->where('type', 'quotation')
                    ->where('number', $order->quotation_number)
                    ->first();
                if ($order->quotation_status !== 'cancelled' && ($currentDoc?->status ?? 'active') !== 'cancelled') {
                    return response()->json(['message' => 'Already issued'], 400);
                }
            }
            $order->quotation_number = $this->generateDocumentNumber('QT', $order->id, $issuedDate);
            $order->quotation_status = 'active';
        } elseif ($type === 'billing_note') {
            $code = 'BN';
            if ($order->billing_note_number) {
                $currentDoc = Document::where('order_id', $order->id)
                    ->where('type', 'billing_note')
                    ->where('number', $order->billing_note_number)
                    ->first();
                if ($order->billing_note_status !== 'cancelled' && ($currentDoc?->status ?? 'active') !== 'cancelled') {
                    return response()->json(['message' => 'Already issued'], 400);
                }
            }
            $order->billing_note_number = $this->generateDocumentNumber('BN', $order->id, $issuedDate);
            $order->billing_note_status = 'active';
        } elseif ($type === 'receipt') {
            $code = 'RE';
            if ($order->receipt_number) {
                $currentDoc = Document::where('order_id', $order->id)
                    ->where('type', 'receipt')
                    ->where('number', $order->receipt_number)
                    ->first();
                if ($order->receipt_status !== 'cancelled' && ($currentDoc?->status ?? 'active') !== 'cancelled') {
                    return response()->json(['message' => 'Already issued'], 400);
                }
            }
            $order->receipt_number = $this->generateDocumentNumber('RE', $order->id, $issuedDate);
            $order->receipt_status = 'active';
        }

        $order->save();
        return response()->json($order->load('documents'));
    }

    private function generateDocumentNumber($type, $orderId, Carbon $issuedDate)
    {
        return DB::transaction(function () use ($type, $orderId, $issuedDate) {
            $dateStr = $issuedDate->format('Ym'); // e.g. 202604
            $fullPrefix = "PT-{$type}-{$dateStr}-"; // e.g. PT-QT-202604-

            $counter = DocumentCounter::where('prefix', $fullPrefix)->lockForUpdate()->first();
            if (!$counter) {
                $lastNumber = 0;

                $lastDoc = Document::where('number', 'like', "{$fullPrefix}%")
                    ->orderBy('number', 'desc')
                    ->first();
                if ($lastDoc) {
                    $lastNumber = intval(substr($lastDoc->number, -4));
                } else {
                    $column = 'receipt_number';
                    if ($type === 'QT') $column = 'quotation_number';
                    if ($type === 'BN') $column = 'billing_note_number';

                    $lastOrder = Order::where($column, 'like', "{$fullPrefix}%")
                        ->orderBy($column, 'desc')
                        ->first();
                    if ($lastOrder) {
                        $lastNumber = intval(substr($lastOrder->$column, -4));
                    }
                }

                $counter = DocumentCounter::create([
                    'prefix' => $fullPrefix,
                    'last_number' => $lastNumber,
                ]);
            }

            $newNumber = $counter->last_number + 1;
            $counter->last_number = $newNumber;
            $counter->save();

            $number = $fullPrefix . str_pad($newNumber, 4, '0', STR_PAD_LEFT);

            $isQuotation = $type === 'QT';
            $expiresDate = $isQuotation ? $issuedDate->copy()->addDays(7) : null;

            Document::create([
                'order_id' => $orderId,
                'type' => $type === 'QT' ? 'quotation' : ($type === 'BN' ? 'billing_note' : 'receipt'),
                'number' => $number,
                'status' => 'active',
                'issued_date' => $issuedDate,
                'show_issued_date' => true,
                'expires_date' => $expiresDate,
                'show_expires_date' => $isQuotation,
            ]);

            return $number;
        });
    }

    private function revertItemStock($item)
    {
        $product = $item->product;
        if (!$product) return;

        if ($product->product_type === 'service') {
            return;
        }
        
        if ($product->product_type === 'bundle') {
            // Revert bundle children
            if (isset($item->metadata['bundle_items'])) {
                foreach ($item->metadata['bundle_items'] as $bItem) {
                    $child = Product::find($bItem['id']);
                    if ($child) {
                        $child->increment('stock', $bItem['total_quantity_deducted']);
                    }
                }
            }
            // Revert bundle parent if it has stock
            if ($product->stock > 0) { 
                $product->increment('stock', $item->quantity);
            }
        } else {
            // Single product
            $product->increment('stock', $item->quantity);
        }
    }

    private function deductItemStock($item)
    {
        $product = $item->product;
        if (!$product) return;

        if ($product->product_type === 'service') {
            return;
        }

        if ($product->product_type === 'bundle') {
            // Deduct bundle children
            if (isset($item->metadata['bundle_items'])) {
                foreach ($item->metadata['bundle_items'] as $bItem) {
                    $child = Product::find($bItem['id']);
                    if ($child) {
                        if ($child->stock < $bItem['total_quantity_deducted']) {
                             throw new \Exception("Insufficient stock for bundle component: {$child->name}");
                        }
                        $child->decrement('stock', $bItem['total_quantity_deducted']);
                    }
                }
            }
            // Deduct bundle parent if it has stock
            if ($product->stock > 0) {
                 $product->decrement('stock', $item->quantity);
            }
        } else {
            // Single product
            if ($product->stock < $item->quantity) {
                 throw new \Exception("Insufficient stock for product: {$product->name}");
            }
            $product->decrement('stock', $item->quantity);
        }
    }
}
