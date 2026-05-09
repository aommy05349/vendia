<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement('ALTER TABLE `customer_locations` MODIFY `google_maps_link` TEXT NULL');
        DB::statement('ALTER TABLE `appointments` MODIFY `google_maps_link` TEXT NULL');
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement('ALTER TABLE `customer_locations` MODIFY `google_maps_link` VARCHAR(255) NULL');
        DB::statement('ALTER TABLE `appointments` MODIFY `google_maps_link` VARCHAR(255) NULL');
    }
};

