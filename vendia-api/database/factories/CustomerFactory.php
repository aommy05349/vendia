<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Customer>
 */
class CustomerFactory extends Factory
{
    public function definition(): array
    {
        $isCompany = $this->faker->boolean(35);
        $company = $isCompany ? $this->faker->company() : null;
        $first = $isCompany ? null : $this->faker->firstName();
        $last = $isCompany ? null : $this->faker->lastName();

        $name = $company ?: trim(($first ?? '') . ' ' . ($last ?? ''));
        if ($name === '') $name = $this->faker->name();

        return [
            'name' => $name,
            'first_name' => $first,
            'last_name' => $last,
            'company_name' => $company,
            'phone' => $this->faker->optional()->phoneNumber(),
            'email' => $this->faker->optional()->safeEmail(),
            'address' => $this->faker->optional()->address(),
            'tax_id' => $this->faker->optional()->numerify('#############'),
            'line_id' => $this->faker->optional()->userName(),
        ];
    }
}

