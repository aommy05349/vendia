<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use App\Models\Document;
use App\Models\DocumentCounter;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
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

    public function index(Request $request)
    {
        $query = Order::with('items.product', 'user', 'customer', 'parent', 'documents')
            ->withCount('appointments')
            ->orderByDesc('created_at')
            ->orderByDesc('id');

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

        $orders = $query->paginate(10);

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

    public function show($id)
    {
        $order = Order::with(['items.product', 'user', 'customer', 'parent'])->findOrFail($id);
        
        // No automatic/lazy generation anymore
        
        $sortedItems = $order->items->sortBy(function($item) {
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
            'type' => 'required|in:quotation,billing_note,receipt'
        ]);

        $order = Order::findOrFail($id);
        $type = $request->input('type');
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
            $order->quotation_number = $this->generateDocumentNumber('QT', $order->id);
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
            $order->billing_note_number = $this->generateDocumentNumber('BN', $order->id);
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
            $order->receipt_number = $this->generateDocumentNumber('RE', $order->id);
            $order->receipt_status = 'active';
        }

        $order->save();
        return response()->json($order->load('documents'));
    }

    private function generateDocumentNumber($type, $orderId)
    {
        return DB::transaction(function () use ($type, $orderId) {
            $dateStr = date('Ym'); // e.g. 202604
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

            $issuedDate = Carbon::today();
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
