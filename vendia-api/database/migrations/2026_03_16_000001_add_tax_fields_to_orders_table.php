<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('subtotal', 10, 2)->nullable()->after('customer_id');
            $table->decimal('vat_rate', 5, 2)->default(0)->after('subtotal');
            $table->decimal('vat_amount', 10, 2)->default(0)->after('vat_rate');
            $table->decimal('withholding_rate', 5, 2)->default(0)->after('vat_amount');
            $table->decimal('withholding_amount', 10, 2)->default(0)->after('withholding_rate');
        });

        DB::table('orders')->whereNull('subtotal')->update([
            'subtotal' => DB::raw('total'),
        ]);
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'subtotal',
                'vat_rate',
                'vat_amount',
                'withholding_rate',
                'withholding_amount',
            ]);
        });
    }
};

