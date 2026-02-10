<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\User;
use App\Models\Order;
use Illuminate\Database\Seeder;

class RandomAppointmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $customers = User::where('role', 'customer')->get();
        if ($customers->isEmpty()) return;

        $orders = Order::all();

        Appointment::factory()
            ->count(20)
            ->state(function (array $attributes) use ($customers, $orders) {
                $customer = $customers->random();
                // Try to find an order for this customer, or null
                $customerOrders = $orders->where('customer_id', $customer->id);
                $order = $customerOrders->isNotEmpty() ? $customerOrders->random() : null;
                
                return [
                    'customer_id' => $customer->id,
                    'order_id' => $order ? $order->id : null,
                ];
            })
            ->create();
    }
}
