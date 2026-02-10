<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('quotation_status')->default('active')->after('quotation_number');
            $table->string('billing_note_status')->default('active')->after('billing_note_number');
            $table->string('receipt_status')->default('active')->after('receipt_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['quotation_status', 'billing_note_status', 'receipt_status']);
        });
    }
};
