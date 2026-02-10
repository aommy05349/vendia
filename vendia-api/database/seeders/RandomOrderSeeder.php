<?php

namespace Database\Seeders;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use App\Models\Product;
use App\Models\Document;
use Illuminate\Database\Seeder;

class RandomOrderSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Ensure we have customers and staff
        $customers = User::where('role', 'customer')->get();
        if ($customers->isEmpty()) {
            $customers = User::factory()->count(10)->create(['role' => 'customer']);
        }

        $staff = User::whereIn('role', ['staff', 'admin'])->get();
        if ($staff->isEmpty()) {
            $staff = User::factory()->count(2)->create(['role' => 'staff']);
        }

        $products = Product::all();
        if ($products->isEmpty()) {
            $products = Product::factory()->count(10)->create(); // Fallback if no products
        }

        Order::factory()
            ->count(20)
            ->state(function (array $attributes) use ($customers, $staff) {
                return [
                    'customer_id' => $customers->random()->id,
                    'user_id' => $staff->random()->id,
                ];
            })
            ->create()
            ->each(function ($order) use ($products) {
                // Create items
                OrderItem::factory()
                    ->count(rand(1, 5))
                    ->state(function (array $attributes) use ($order, $products) {
                        return [
                            'order_id' => $order->id,
                            'product_id' => $products->random()->id,
                        ];
                    })
                    ->create();
                
                // Recalculate total
                $total = $order->items->sum(fn($item) => $item->price * $item->quantity);
                $order->update(['total' => $total]);

                // Create documents
                Document::factory()
                    ->count(rand(1, 3))
                    ->state(['order_id' => $order->id])
                    ->create();
            });
    }
}
