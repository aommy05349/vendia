<?php

namespace Database\Seeders;

use App\Models\Attendance;
use App\Models\User;
use Illuminate\Database\Seeder;

class RandomAttendanceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $technicians = User::where('role', 'technician')->get();
        if ($technicians->isEmpty()) {
             // If no technicians yet (e.g. running standalone), create some
             $technicians = User::factory()->count(5)->create(['role' => 'technician']);
        }

        Attendance::factory()
            ->count(20)
            ->state(function (array $attributes) use ($technicians) {
                return [
                    'user_id' => $technicians->random()->id,
                ];
            })
            ->create();
    }
}
