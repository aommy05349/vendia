<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Attendance>
 */
class AttendanceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $date = $this->faker->dateTimeBetween('-1 month', 'now');
        $checkIn = (clone $date)->setTime(9, 0, 0);
        $checkOut = (clone $date)->setTime(18, 0, 0);

        return [
            'user_id' => User::factory(),
            'date' => $date->format('Y-m-d'),
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'status' => 'working',
        ];
    }
}
