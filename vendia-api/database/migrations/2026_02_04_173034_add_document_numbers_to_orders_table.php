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
            $table->string('quotation_number')->nullable()->after('status')->unique();
            $table->string('billing_note_number')->nullable()->after('quotation_number')->unique();
            $table->string('receipt_number')->nullable()->after('billing_note_number')->unique();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['quotation_number', 'billing_note_number', 'receipt_number']);
        });
    }
};
