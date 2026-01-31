<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    public function index()
    {
        return Order::with('items.product', 'user')->latest()->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'items' => 'required|array',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'nullable|numeric',
            'payment_method' => 'required|string',
        ]);

        return DB::transaction(function () use ($request) {
            $total = 0;
            $items = [];

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
                        
                        if ($child->stock < $requiredQty) {
                            throw new \Exception("Insufficient stock for bundle component: {$child->name} (Required: {$requiredQty}, Available: {$child->stock})");
                        }
                        
                        // Deduct stock from child
                        $child->decrement('stock', $requiredQty);
                        
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
                    
                    // Also decrement bundle stock if it's being tracked (optional, but good for "pre-packed" logic)
                    // If stock is 0, we assume it's purely virtual and infinite (limited by children)
                    // But if stock > 0, we treat it as managed.
                    if ($product->stock > 0) {
                        $product->decrement('stock', $item['quantity']);
                    }
                } else {
                    // Handle Single/Variable Product
                    if ($product->stock < $item['quantity']) {
                        throw new \Exception("Insufficient stock for product: {$product->name}");
                    }
                    $product->decrement('stock', $item['quantity']);
                }

                $total += $price * $item['quantity'];

                $items[] = [
                    'product_id' => $product->id,
                    'quantity' => $item['quantity'],
                    'price' => $price,
                    'metadata' => $metadata, // Cast to array/json automatically
                ];
            }

            $order = Order::create([
                'user_id' => $request->user()->id,
                'total' => $total,
                'status' => 'completed',
                'payment_method' => $request->payment_method,
            ]);

            $order->items()->createMany($items);

            return $order->load('items.product');
        });
    }

    public function show(Order $order)
    {
        return $order->load('items.product', 'user');
    }
}
