<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CustomerLocation>
 */
class CustomerLocationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => $this->faker->randomElement(['Home', 'Office', 'Branch 1', 'Warehouse']),
            'address' => $this->faker->address,
            'latitude' => $this->faker->latitude,
            'longitude' => $this->faker->longitude,
            'contact_person' => $this->faker->name,
            'contact_phone' => $this->faker->phoneNumber,
            'is_default' => $this->faker->boolean(20),
        ];
    }
}
