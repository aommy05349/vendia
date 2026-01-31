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
            'payment_method' => 'required|string',
        ]);

        return DB::transaction(function () use ($request) {
            $total = 0;
            $items = [];

            foreach ($request->items as $item) {
                $product = Product::find($item['product_id']);
                
                if ($product->stock < $item['quantity']) {
                    throw new \Exception("Insufficient stock for product: {$product->name}");
                }

                $product->decrement('stock', $item['quantity']);
                
                $price = $product->price;
                $total += $price * $item['quantity'];

                $items[] = [
                    'product_id' => $product->id,
                    'quantity' => $item['quantity'],
                    'price' => $price,
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
