<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\DocumentCounter;
use App\Models\Order;
use App\Models\OrderPayment;
use App\Models\OrderPaymentPlan;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderPaymentController extends Controller
{
    private function loadOrderForResponse(int $orderId): Order
    {
        $order = Order::with([
            'items.product',
            'user',
            'customer',
            'parent',
            'documents',
            'paymentPlan',
            'payments.documents',
        ])->findOrFail($orderId);

        $sortedItems = $order->items->sortBy(function ($item) {
            $product = $item->product;
            if (!$product) return 999;
            if ($product->product_type !== 'service') return 1;
            return ($item->price < 0) ? 3 : 2;
        })->values();
        $order->setRelation('items', $sortedItems);

        return $order;
    }

    public function upsertPlan(Request $request, Order $order)
    {
        $validated = $request->validate([
            'total' => 'sometimes|numeric|min:0',
            'down_payment' => 'sometimes|nullable|numeric|min:0',
            'installment_count' => 'required|integer|min:1|max:120',
            'installment_amount' => 'sometimes|nullable|numeric|min:0',
            'start_date' => 'sometimes|nullable|date',
            'due_day' => 'sometimes|nullable|integer|min:1|max:31',
        ]);

        return DB::transaction(function () use ($validated, $order, $request) {
            $total = array_key_exists('total', $validated) ? (float) $validated['total'] : (float) $order->total;
            $down = array_key_exists('down_payment', $validated) ? (float) ($validated['down_payment'] ?? 0) : 0.0;
            $down = max(0.0, min($total, $down));
            $count = (int) $validated['installment_count'];

            $installmentAmount = array_key_exists('installment_amount', $validated) && $validated['installment_amount'] !== null
                ? (float) $validated['installment_amount']
                : ($count > 0 ? round(max(0.0, $total - $down) / $count, 2) : 0.0);

            $plan = OrderPaymentPlan::updateOrCreate(
                ['order_id' => $order->id],
                [
                    'total' => $total,
                    'down_payment' => $down,
                    'installment_count' => $count,
                    'installment_amount' => $installmentAmount,
                    'start_date' => $validated['start_date'] ?? null,
                    'due_day' => $validated['due_day'] ?? null,
                    'status' => 'active',
                ]
            );

            $order->payment_method = 'installment';
            $paid = (float) OrderPayment::where('order_id', $order->id)->sum('amount');
            $remaining = round($total - $paid, 2);
            if ($remaining <= 0) {
                $plan->status = 'completed';
                $plan->save();
                $order->status = 'completed';
            } else {
                $order->status = $order->status === 'cancelled' ? 'cancelled' : 'pending';
            }
            $order->save();

            return response()->json($this->loadOrderForResponse($order->id));
        });
    }

    public function storePayment(Request $request, Order $order)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'method' => 'required|in:cash,transfer',
            'paid_at' => 'sometimes|nullable|date',
            'note' => 'sometimes|nullable|string|max:255',
            'installment_no' => 'sometimes|nullable|integer|min:0|max:120',
            'issue_receipt' => 'sometimes|boolean',
            'issued_date' => 'sometimes|nullable|date',
        ]);

        return DB::transaction(function () use ($validated, $order, $request) {
            $plan = $order->paymentPlan;
            if (!$plan) {
                return response()->json([
                    'message' => 'Order has no payment plan',
                ], 422);
            }

            if (($plan->status ?? 'active') === 'cancelled') {
                return response()->json([
                    'message' => 'Payment plan is cancelled',
                ], 422);
            }

            $installmentNo = array_key_exists('installment_no', $validated)
                ? ($validated['installment_no'] === null ? null : (int) $validated['installment_no'])
                : null;
            if ($installmentNo !== null) {
                if ($installmentNo > 0 && $installmentNo > (int) $plan->installment_count) {
                    return response()->json([
                        'message' => 'Invalid installment_no',
                    ], 422);
                }
                $dup = OrderPayment::where('order_id', $order->id)
                    ->where('installment_no', $installmentNo)
                    ->exists();
                if ($dup) {
                    return response()->json([
                        'message' => 'Installment already paid',
                    ], 422);
                }
            }

            $paidAt = array_key_exists('paid_at', $validated) && $validated['paid_at']
                ? Carbon::parse($validated['paid_at'])
                : Carbon::now();

            $payment = OrderPayment::create([
                'order_id' => $order->id,
                'order_payment_plan_id' => $plan->id,
                'installment_no' => $installmentNo,
                'amount' => (float) $validated['amount'],
                'method' => $validated['method'],
                'paid_at' => $paidAt,
                'created_by' => $request->user()?->id,
                'note' => $validated['note'] ?? null,
            ]);

            $total = (float) $plan->total;
            $paidSum = (float) OrderPayment::where('order_id', $order->id)->sum('amount');
            $remaining = round($total - $paidSum, 2);

            $order->payment_method = 'installment';
            if ($remaining <= 0) {
                $plan->status = 'completed';
                $plan->save();
                $order->status = 'completed';
            } else {
                $order->status = $order->status === 'cancelled' ? 'cancelled' : 'pending';
            }
            $order->save();

            $issue = (bool) ($validated['issue_receipt'] ?? false);
            if ($issue) {
                $issuedDate = array_key_exists('issued_date', $validated) && $validated['issued_date']
                    ? Carbon::parse($validated['issued_date'])->startOfDay()
                    : Carbon::today();
                $this->issueReceiptForPayment($order, $payment, $issuedDate);
            }

            return response()->json($this->loadOrderForResponse($order->id));
        });
    }

    public function issueReceipt(Request $request, OrderPayment $payment)
    {
        $validated = $request->validate([
            'issued_date' => 'sometimes|nullable|date',
        ]);

        $order = Order::with('paymentPlan')->findOrFail($payment->order_id);
        $issuedDate = isset($validated['issued_date']) && $validated['issued_date']
            ? Carbon::parse($validated['issued_date'])->startOfDay()
            : Carbon::today();

        return DB::transaction(function () use ($order, $payment, $issuedDate) {
            $existing = Document::where('order_payment_id', $payment->id)
                ->where('type', 'receipt')
                ->where('status', 'active')
                ->first();
            if ($existing) {
                return response()->json($existing->load(['order', 'orderPayment']));
            }

            $doc = $this->issueReceiptForPayment($order, $payment, $issuedDate);
            return response()->json($doc->load(['order', 'orderPayment']));
        });
    }

    public function deleteReceipt(Request $request, OrderPayment $payment)
    {
        return DB::transaction(function () use ($payment) {
            $deleted = Document::where('order_payment_id', $payment->id)
                ->where('type', 'receipt')
                ->delete();

            return response()->json([
                'deleted' => $deleted > 0,
            ]);
        });
    }

    private function issueReceiptForPayment(Order $order, OrderPayment $payment, Carbon $issuedDate): Document
    {
        $plan = $order->paymentPlan;
        $subtitle = null;
        if ($plan && $payment->installment_no !== null) {
            $no = (int) $payment->installment_no;
            if ($no === 0) {
                $subtitle = 'เงินดาวน์';
            } elseif ($no > 0) {
                $subtitle = "งวดที่ {$no}/{$plan->installment_count}";
            }
        }
        if ($subtitle === null && $plan) {
            $paymentIndex = OrderPayment::where('order_id', $order->id)
                ->where('paid_at', '<=', $payment->paid_at)
                ->orderBy('paid_at')
                ->orderBy('id')
                ->count();
            $subtitle = "งวดที่ {$paymentIndex}/{$plan->installment_count}";
        }

        $number = $this->generateDocumentNumber('RE', $order->id, $issuedDate);

        return Document::create([
            'order_id' => $order->id,
            'order_payment_id' => $payment->id,
            'type' => 'receipt',
            'number' => $number,
            'status' => 'active',
            'issued_date' => $issuedDate,
            'show_issued_date' => true,
            'expires_date' => null,
            'show_expires_date' => false,
            'header_subtitle' => $subtitle,
        ]);
    }

    private function generateDocumentNumber(string $type, int $orderId, Carbon $issuedDate): string
    {
        return DB::transaction(function () use ($type, $orderId, $issuedDate) {
            $dateStr = $issuedDate->format('Ym');
            $fullPrefix = "PT-{$type}-{$dateStr}-";

            $counter = DocumentCounter::where('prefix', $fullPrefix)->lockForUpdate()->first();
            if (!$counter) {
                $lastNumber = 0;

                $lastDoc = Document::where('number', 'like', "{$fullPrefix}%")
                    ->orderBy('number', 'desc')
                    ->first();
                if ($lastDoc) {
                    $lastNumber = intval(substr((string) $lastDoc->number, -4));
                } else {
                    $column = 'receipt_number';
                    if ($type === 'QT') $column = 'quotation_number';
                    if ($type === 'BN') $column = 'billing_note_number';

                    $lastOrder = Order::where($column, 'like', "{$fullPrefix}%")
                        ->orderBy($column, 'desc')
                        ->first();
                    if ($lastOrder) {
                        $lastNumber = intval(substr((string) $lastOrder->$column, -4));
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

            return $fullPrefix . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
        });
    }
}
