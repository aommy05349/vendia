<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_payments', function (Blueprint $table) {
            $table->integer('installment_no')->nullable()->after('order_payment_plan_id');
            $table->index(['order_id', 'installment_no']);
        });
    }

    public function down(): void
    {
        Schema::table('order_payments', function (Blueprint $table) {
            $table->dropIndex(['order_id', 'installment_no']);
            $table->dropColumn('installment_no');
        });
    }
};

