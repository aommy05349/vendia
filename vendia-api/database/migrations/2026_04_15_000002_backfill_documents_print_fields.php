<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('documents')
            ->whereNull('issued_date')
            ->update([
                'issued_date' => DB::raw('DATE(created_at)'),
            ]);

        if (DB::getDriverName() === 'mysql') {
            DB::table('documents')
                ->where('type', 'quotation')
                ->whereNull('expires_date')
                ->update([
                    'expires_date' => DB::raw('DATE_ADD(issued_date, INTERVAL 7 DAY)'),
                ]);
        } else {
            DB::table('documents')
                ->where('type', 'quotation')
                ->whereNull('expires_date')
                ->update([
                    'expires_date' => DB::raw("DATE(issued_date, '+7 day')"),
                ]);
        }
    }

    public function down(): void
    {
    }
};

