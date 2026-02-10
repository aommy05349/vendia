<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use App\Models\Document;
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
        $query = Order::with('items.product', 'user', 'customer', 'parent', 'documents')->latest();

        if ($request->has('status') && $request->input('status') !== 'all') {
            $status = $request->input('status');
            if (str_contains($status, ',')) {
                $query->whereIn('status', explode(',', $status));
            } else {
                $query->where('status', $status);
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
            'customer_id' => 'nullable|exists:users,id',
            'parent_id' => 'nullable|exists:orders,id',
        ]);

        return DB::transaction(function () use ($request) {
            $total = 0;
            $items = [];
            $status = $request->input('status', 'completed');
            $isQuotation = $status === 'quotation';

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
                        
                        if (!$isQuotation) {
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
                    
                    if (!$isQuotation && $product->stock > 0) {
                        $product->decrement('stock', $item['quantity']);
                    }
                } else {
                    // Handle Single/Variable Product
                    if (!$isQuotation) {
                        if ($product->stock < $item['quantity']) {
                            throw new \Exception("Insufficient stock for product: {$product->name}");
                        }
                        $product->decrement('stock', $item['quantity']);
                    }
                }

                $total += $price * $item['quantity'];

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

            // Create Order first (without document numbers)
            $order = Order::create([
                'user_id' => $request->user()->id,
                'customer_id' => $request->customer_id,
                'parent_id' => $request->parent_id,
                'total' => $total,
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
            'customer_id' => 'nullable|exists:users,id',
            'items' => 'nullable|array',
            'items.*.product_id' => 'required_with:items|exists:products,id',
            'items.*.quantity' => 'required_with:items|integer|min:1',
            'items.*.price' => 'nullable|numeric',
        ]);

        return DB::transaction(function () use ($request, $order) {
            $oldStatus = $order->status;
            $newStatus = $request->input('status', $oldStatus);
            
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
                $total = 0;
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

                    $total += $price * $item['quantity'];

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

                $order->total = $total;
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
                
                $order->save();
            }

            return $order->load('items.product');
        });
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
            if ($order->quotation_number) return response()->json(['message' => 'Already issued'], 400);
            $order->quotation_number = $this->generateDocumentNumber('QT', $order->id);
            $order->quotation_status = 'active';
        } elseif ($type === 'billing_note') {
            $code = 'BN';
            if ($order->billing_note_number) return response()->json(['message' => 'Already issued'], 400);
            $order->billing_note_number = $this->generateDocumentNumber('BN', $order->id);
            $order->billing_note_status = 'active';
        } elseif ($type === 'receipt') {
            $code = 'RE';
            if ($order->receipt_number) return response()->json(['message' => 'Already issued'], 400);
            $order->receipt_number = $this->generateDocumentNumber('RE', $order->id);
            $order->receipt_status = 'active';
        }

        $order->save();
        return response()->json($order->load('documents'));
    }

    private function generateDocumentNumber($type, $orderId)
    {
        $dateStr = date('Ymd'); // e.g. 20240205
        $fullPrefix = "PT-{$type}-{$dateStr}-"; // e.g. PT-QT-20240205-
        
        // Find highest number in Documents table
        $lastDoc = Document::where('number', 'like', "{$fullPrefix}%")
            ->orderBy('number', 'desc')
            ->lockForUpdate()
            ->first();

        if ($lastDoc) {
            $lastNumber = intval(substr($lastDoc->number, -4));
            $newNumber = $lastNumber + 1;
        } else {
            // Fallback to checking Orders table for migration safety (optional, but good)
            $column = 'receipt_number';
            if ($type === 'QT') $column = 'quotation_number';
            if ($type === 'BN') $column = 'billing_note_number';
            
            $lastOrder = Order::where($column, 'like', "{$fullPrefix}%")
                ->orderBy($column, 'desc')
                ->first();
                
            if ($lastOrder) {
                $lastNumber = intval(substr($lastOrder->$column, -4));
                $newNumber = $lastNumber + 1;
            } else {
                $newNumber = 1;
            }
        }

        $number = $fullPrefix . str_pad($newNumber, 4, '0', STR_PAD_LEFT);

        // Create Document record
        Document::create([
            'order_id' => $orderId,
            'type' => $type === 'QT' ? 'quotation' : ($type === 'BN' ? 'billing_note' : 'receipt'),
            'number' => $number,
            'status' => 'active'
        ]);

        return $number;
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
