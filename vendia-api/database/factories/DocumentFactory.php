<?php

namespace Database\Factories;

use App\Models\Order;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Document>
 */
class DocumentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'type' => $this->faker->randomElement(['quotation', 'billing_note', 'receipt']),
            'number' => $this->faker->unique()->bothify('DOC-####-????'),
            'status' => $this->faker->randomElement(['active', 'cancelled']),
        ];
    }
}
