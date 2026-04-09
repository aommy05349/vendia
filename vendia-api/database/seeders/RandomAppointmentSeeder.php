<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Customer;
use App\Models\Order;
use App\Models\CustomerLocation;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class RandomAppointmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $customers = Customer::query()->get();
        if ($customers->isEmpty()) {
            return;
        }

        $customerIds = $customers->pluck('id');

        $locations = CustomerLocation::whereIn('customer_id', $customerIds)
            ->where('is_default', true)
            ->get()
            ->keyBy('customer_id');

        if ($locations->isEmpty()) {
            return;
        }

        $ordersByCustomer = Order::whereIn('customer_id', $customerIds)
            ->get()
            ->groupBy('customer_id');

        $year = now()->year;
        $timeSlots = [9, 11, 14, 16];

        $customersWithLocation = $customers->filter(function ($customer) use ($locations) {
            return isset($locations[$customer->id]);
        })->values();

        if ($customersWithLocation->isEmpty()) {
            return;
        }

        for ($day = 1; $day <= 31; $day++) {
            foreach ($timeSlots as $slotIndex => $hour) {
                $customer = $customersWithLocation->random();

                $location = $locations[$customer->id];

                $start = Carbon::create($year, 3, $day, $hour, 0);
                $end = (clone $start)->addHours(2);

                $customerOrders = $ordersByCustomer->get($customer->id);
                $order = $customerOrders && $customerOrders->isNotEmpty()
                    ? $customerOrders->random()
                    : null;

                Appointment::updateOrCreate(
                    [
                        'customer_id' => $customer->id,
                        'start_time' => $start,
                    ],
                    [
                        'order_id' => $order ? $order->id : null,
                        'title' => 'นัดหมายบริการเดือนมีนาคม - ' . ($customer->first_name ?: $customer->name),
                        'description' => 'นัดหมายบริการจากพิกัดลูกค้าในจังหวัดเชียงใหม่',
                        'status' => 'scheduled',
                        'end_time' => $end,
                        'location_name' => $location->name ?: 'บ้านลูกค้า',
                        'address' => $location->address,
                        'latitude' => $location->latitude,
                        'longitude' => $location->longitude,
                        'google_maps_link' => $location->google_maps_link,
                        'contact_name' => $location->contact_person ?: $customer->name,
                        'contact_phone' => $location->contact_phone ?: $customer->phone,
                    ]
                );
            }
        }
    }
}
