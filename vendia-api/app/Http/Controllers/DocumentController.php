<?php

namespace App\Http\Controllers;

use App\Models\DocumentCounter;
use App\Models\Document;
use App\Models\Order;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DocumentController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'type' => 'sometimes|in:quotation,billing_note,invoice,receipt',
            'status' => 'sometimes|in:active,cancelled',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date',
            'search' => 'sometimes|string|max:255',
            'per_page' => 'sometimes|integer|min:1|max:200',
        ]);

        $query = Document::query()
            ->with(['order.customer', 'order.user'])
            ->orderByDesc('issued_date')
            ->orderByDesc('id');

        if (isset($validated['type'])) {
            $query->where('type', $validated['type']);
        }

        if (isset($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $startDate = $validated['start_date'] ?? null;
        $endDate = $validated['end_date'] ?? null;
        if ($startDate || $endDate) {
            $query->where(function ($q) use ($startDate, $endDate) {
                if ($startDate && $endDate) {
                    $q->whereBetween('issued_date', [$startDate, $endDate]);
                } elseif ($startDate) {
                    $q->whereDate('issued_date', '>=', $startDate);
                } else {
                    $q->whereDate('issued_date', '<=', $endDate);
                }
            });
        }

        $search = trim((string) ($validated['search'] ?? ''));
        if ($search !== '') {
            $rawId = ltrim($search, '#');
            if ($rawId !== '' && ctype_digit($rawId)) {
                $id = (int) $rawId;
                $query->where(function ($q) use ($id) {
                    $q->where('id', $id)
                        ->orWhereHas('order', function ($oq) use ($id) {
                            $oq->where('id', $id);
                        });
                });
            } else {
                $like = "%{$search}%";
                $query->where(function ($q) use ($like) {
                    $q->where('number', 'like', $like)
                        ->orWhereHas('order.customer', function ($cq) use ($like) {
                            $cq->where('name', 'like', $like)
                                ->orWhere('company_name', 'like', $like)
                                ->orWhere('phone', 'like', $like)
                                ->orWhere('email', 'like', $like)
                                ->orWhere('tax_id', 'like', $like);
                        });
                });
            }
        }

        return $query->paginate($validated['per_page'] ?? 20);
    }

    public function show(Document $document)
    {
        return $document->load([
            'order',
            'order.items.product',
            'order.user',
            'order.customer',
            'order.parent',
            'order.documents',
            'order.paymentPlan',
            'order.payments.documents',
            'orderPayment.plan',
        ]);
    }

    public function update(Request $request, Document $document)
    {
        $validated = $request->validate([
            'issued_date' => 'sometimes|nullable|date',
            'show_issued_date' => 'sometimes|boolean',
            'expires_date' => 'sometimes|nullable|date',
            'show_expires_date' => 'sometimes|boolean',
            'customer_name' => 'sometimes|nullable|string|max:255',
            'customer_address' => 'sometimes|nullable|string',
            'customer_attention' => 'sometimes|nullable|string|max:255',
            'header_title' => 'sometimes|nullable|string|max:255',
            'header_subtitle' => 'sometimes|nullable|string|max:255',
            'remarks' => 'sometimes|nullable|string',
            'update_order_created_at' => 'sometimes|boolean',
        ]);

        return DB::transaction(function () use ($validated, $document) {
            $updateOrderCreatedAt = (bool) ($validated['update_order_created_at'] ?? false);
            unset($validated['update_order_created_at']);

            $oldNumber = $document->number;
            $document->update($validated);

            if (array_key_exists('issued_date', $validated) && $validated['issued_date'] && ($document->status ?? 'active') !== 'cancelled') {
                $issued = Carbon::parse($document->issued_date)->startOfDay();
                $code = $document->type === 'quotation'
                    ? 'QT'
                    : ($document->type === 'billing_note'
                        ? 'BN'
                        : ($document->type === 'invoice' ? 'INV' : 'RE'));
                $dateStr = $issued->format('Ym');
                $fullPrefix = "PT-{$code}-{$dateStr}-";

                if (!is_string($document->number) || !str_starts_with($document->number, $fullPrefix)) {
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
                            if ($code === 'QT') $column = 'quotation_number';
                            if ($code === 'BN') $column = 'billing_note_number';
                            if ($code === 'INV') $column = 'invoice_number';

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

                    $newDocNumber = $fullPrefix . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
                    $document->number = $newDocNumber;
                    $document->save();

                    $order = $document->order;
                    if ($order) {
                        $orderColumn = $document->type === 'quotation'
                            ? 'quotation_number'
                            : ($document->type === 'billing_note'
                                ? 'billing_note_number'
                                : ($document->type === 'invoice' ? 'invoice_number' : 'receipt_number'));
                        if ($order->$orderColumn === $oldNumber) {
                            $order->$orderColumn = $newDocNumber;
                            $order->save();
                        }
                    }
                }
            }

            if ($updateOrderCreatedAt && array_key_exists('issued_date', $validated) && $validated['issued_date']) {
                $order = $document->order;
                if ($order) {
                    $issued = Carbon::parse($validated['issued_date']);
                    $existing = Carbon::parse($order->created_at);
                    $order->created_at = $issued->copy()->setTimeFrom($existing);
                    $order->save();
                }
            }

            return response()->json($document->fresh()->load(['order.customer']));
        });
    }

    public function destroy(Document $document)
    {
        if (($document->status ?? 'active') !== 'cancelled') {
            return response()->json([
                'message' => 'ลบได้เฉพาะเอกสารที่ถูกยกเลิกแล้วเท่านั้น',
            ], 422);
        }

        $document->delete();
        return response()->noContent();
    }
}
