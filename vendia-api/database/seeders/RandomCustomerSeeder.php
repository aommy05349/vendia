<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\CustomerLocation;
use Illuminate\Database\Seeder;

class RandomCustomerSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::factory()
            ->count(20)
            ->create(['role' => 'customer'])
            ->each(function ($user) {
                CustomerLocation::factory()
                    ->count(rand(1, 2))
                    ->create(['user_id' => $user->id]);
            });
    }
}
