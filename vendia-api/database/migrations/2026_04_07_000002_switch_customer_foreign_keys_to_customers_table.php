<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->foreign('customer_id')->references('id')->on('customers')->nullOnDelete();
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->foreign('customer_id')->references('id')->on('users')->nullOnDelete();
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->foreign('customer_id')->references('id')->on('users')->onDelete('cascade');
        });
    }
};

