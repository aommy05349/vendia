<?php

namespace Database\Factories;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Order>
 */
class OrderFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(), // Staff who processed
            'customer_id' => Customer::factory(),
            'total' => $this->faker->randomFloat(2, 100, 10000),
            'status' => $this->faker->randomElement(['pending', 'completed', 'cancelled']),
            'payment_method' => $this->faker->randomElement(['cash', 'transfer', 'credit_card']),
            'quotation_number' => $this->faker->unique()->numerify('QT-#####'),
            'billing_note_number' => $this->faker->unique()->numerify('BN-#####'),
            'receipt_number' => $this->faker->unique()->numerify('RC-#####'),
            'quotation_status' => $this->faker->randomElement(['active', 'cancelled']),
            'billing_note_status' => $this->faker->randomElement(['active', 'cancelled']),
            'receipt_status' => $this->faker->randomElement(['active', 'cancelled']),
        ];
    }
}
