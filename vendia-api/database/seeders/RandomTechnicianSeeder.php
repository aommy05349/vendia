<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class RandomTechnicianSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::factory()
            ->count(20)
            ->create(['role' => 'technician']);
    }
}
