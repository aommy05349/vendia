<?php

namespace Database\Factories;

use App\Models\Customer;
use App\Models\Order;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Appointment>
 */
class AppointmentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startTime = $this->faker->dateTimeBetween('now', '+1 month');
        $endTime = (clone $startTime)->modify('+2 hours');

        return [
            'customer_id' => Customer::factory(),
            'order_id' => Order::factory(),
            'title' => $this->faker->sentence(3),
            'description' => $this->faker->paragraph,
            'status' => $this->faker->randomElement(['scheduled', 'en_route', 'in_progress', 'completed', 'cancelled']),
            'start_time' => $startTime,
            'end_time' => $endTime,
            'location_name' => $this->faker->word . ' Place',
            'address' => $this->faker->address,
            'latitude' => $this->faker->latitude(5.6, 20.5), // Thailand Lat
            'longitude' => $this->faker->longitude(97.3, 105.6), // Thailand Long
            'contact_name' => $this->faker->name,
            'contact_phone' => $this->faker->phoneNumber,
        ];
    }
}
